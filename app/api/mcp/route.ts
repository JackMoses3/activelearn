export const runtime = "nodejs";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { randomUUID } from "crypto";
import { createHash } from "crypto";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { slugifyWithHash } from "@/lib/slugify";
import { stateJsonToRows, rowsToStateJson } from "@/lib/state";
import { getCourses, getCourseById, getConceptsForCourse } from "@/lib/queries";

// ─── Auth guard ──────────────────────────────────────────────────────────────

async function requireAuth(req: Request): Promise<{ userId: string } | Response> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return Response.json(
      { error: "unauthorized", error_description: "Bearer token required" },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } }
    );
  }

  // Hash the incoming token before lookup
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const db = getDb();
  const row = await db.execute({
    sql: "SELECT token, user_id FROM oauth_tokens WHERE token = ?",
    args: [tokenHash],
  });

  if (row.rows.length === 0) {
    return Response.json(
      { error: "unauthorized", error_description: "Invalid token" },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } }
    );
  }

  const userId = row.rows[0].user_id as string;
  if (!userId) {
    return Response.json(
      { error: "unauthorized", error_description: "Token not linked to a user" },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } }
    );
  }

  return { userId };
}

// ─── MCP server factory ───────────────────────────────────────────────────────

function buildMcpServer(userId: string): McpServer {
  const server = new McpServer({
    name: "activelearn",
    version: "1.0.0",
  });

  const db = getDb();

  // ── start_session ──────────────────────────────────────────────────────────
  server.tool(
    "start_session",
    "Start a learning session for a course. Creates the course if new. Returns session_id and current mastery state.",
    {
      course_name: z.string().describe("Human-readable course name"),
    },
    async ({ course_name }) => {
      const now = new Date().toISOString();
      const today = now.slice(0, 10);

      // Resolve course_id (scoped to user)
      const existing = await db.execute({
        sql: "SELECT id, name FROM courses WHERE name = ? AND user_id = ?",
        args: [course_name, userId],
      });

      let courseId: string;
      if (existing.rows.length > 0) {
        courseId = existing.rows[0].id as string;
      } else {
        // Generate unique slug
        const allSlugs = await db.execute({ sql: "SELECT id FROM courses", args: [] });
        const slugSet = new Set(allSlugs.rows.map((r) => r.id as string));
        courseId = slugifyWithHash(course_name, slugSet);

        await db.execute({
          sql: "INSERT INTO courses (id, name, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
          args: [courseId, course_name, userId, today, today],
        });
      }

      // Create session
      const sessionId = randomUUID();
      await db.execute({
        sql: "INSERT INTO sessions (id, course_id, started_at) VALUES (?, ?, ?)",
        args: [sessionId, courseId, now],
      });

      // Load current mastery state
      const rows = await db.execute({
        sql: "SELECT * FROM concept_mastery WHERE course_id = ?",
        args: [courseId],
      });
      const histRows = await db.execute({
        sql: "SELECT * FROM mastery_history WHERE course_id = ? ORDER BY date ASC",
        args: [courseId],
      });

      const conceptRows = rows.rows.map((r) => ({
        course_id: r.course_id as string,
        concept_id: r.concept_id as string,
        mastery_score: r.mastery_score as number,
        stability: r.stability as number,
        difficulty: r.difficulty as number,
        last_review: r.last_review as string | null,
        next_review: r.next_review as string | null,
        review_count: r.review_count as number,
        status: r.status as string,
      }));
      const historyRows = histRows.rows.map((r) => ({
        course_id: r.course_id as string,
        concept_id: r.concept_id as string,
        date: r.date as string,
        session_score: r.session_score as number | null,
        rating: r.rating as string | null,
      }));

      const stateJson = rowsToStateJson(course_name, conceptRows, historyRows);

      // Compute routing hint per concept
      const routing: Record<string, "i-do" | "diagnostic"> = {};
      for (const c of conceptRows) {
        routing[c.concept_id] =
          c.review_count === 0 || c.mastery_score < 0.4 ? "i-do" : "diagnostic";
      }

      // Load existing knowledge components grouped by concept_id
      const kcRows = await db.execute({
        sql: "SELECT concept_id, component_text FROM knowledge_components WHERE course_id = ? ORDER BY created_at ASC",
        args: [courseId],
      });
      const knowledge_components: Record<string, string[]> = {};
      for (const r of kcRows.rows) {
        const cid = r.concept_id as string;
        if (!knowledge_components[cid]) knowledge_components[cid] = [];
        knowledge_components[cid].push(r.component_text as string);
      }

      // Load observed misconceptions grouped by concept_id
      const miscRows = await db.execute({
        sql: "SELECT concept_id, misconception_text FROM misconceptions WHERE course_id = ? ORDER BY created_at ASC",
        args: [courseId],
      });
      const observed_misconceptions: Record<string, string[]> = {};
      for (const r of miscRows.rows) {
        const cid = r.concept_id as string;
        if (!observed_misconceptions[cid]) observed_misconceptions[cid] = [];
        observed_misconceptions[cid].push(r.misconception_text as string);
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ session_id: sessionId, course_id: courseId, state_json: stateJson, routing, knowledge_components, observed_misconceptions }),
          },
        ],
      };
    }
  );

  // ── import_graph ───────────────────────────────────────────────────────────
  server.tool(
    "import_graph",
    "Bulk-import the concept graph extracted from course materials. Safe to re-run — preserves mastery scores. Call this once after /map this.",
    {
      course_id: z.string(),
      graph_json: z.string().describe(
        "JSON object: { concepts: { [id]: { bloom_level?, prerequisites?: string[] } } }"
      ),
    },
    async ({ course_id, graph_json }) => {
      // Verify course belongs to user
      const course = await getCourseById(course_id, userId);
      if (!course) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "Course not found" }) }],
          isError: true,
        };
      }

      let graph: Record<string, { bloom_level?: string; prerequisites?: string[] }>;
      try {
        const parsed = JSON.parse(graph_json);
        graph = parsed.concepts ?? parsed;
      } catch {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "Invalid graph_json: must be valid JSON" }) }],
          isError: true,
        };
      }

      const conceptIds = Object.keys(graph);
      if (conceptIds.length === 0) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ ok: true, count: 0 }) }],
        };
      }

      const statements = conceptIds.map((conceptId) => {
        const node = graph[conceptId];
        return {
          sql: `INSERT INTO concept_mastery (course_id, concept_id, bloom_level, prerequisites, status)
                VALUES (?, ?, ?, ?, 'unknown')
                ON CONFLICT (course_id, concept_id) DO UPDATE SET
                  bloom_level = excluded.bloom_level,
                  prerequisites = excluded.prerequisites`,
          args: [
            course_id,
            conceptId,
            node.bloom_level ?? null,
            node.prerequisites ? JSON.stringify(node.prerequisites) : null,
          ],
        };
      });

      await db.batch(statements);

      return {
        content: [{ type: "text" as const, text: JSON.stringify({ ok: true, count: conceptIds.length }) }],
      };
    }
  );

  // ── save_state ─────────────────────────────────────────────────────────────
  server.tool(
    "save_state",
    "Save mastery state for a course. Unpacks state_json into concept_mastery rows and appends mastery_history.",
    {
      course_id: z.string(),
      state_json: z.string().describe("JSON blob in v1 format: { [course_name]: { concepts: {...} } }"),
    },
    async ({ course_id, state_json }) => {
      // Verify course belongs to user
      const course = await getCourseById(course_id, userId);
      if (!course) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "Course not found" }) }],
          isError: true,
        };
      }

      let parsed;
      try {
        parsed = JSON.parse(state_json);
      } catch {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "Invalid state_json" }) }],
          isError: true,
        };
      }

      if (Object.keys(parsed).length === 0) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ ok: true }) }] };
      }

      const { concepts, history } = stateJsonToRows(course_id, course.name, parsed);

      if (concepts.length === 0) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ ok: true }) }] };
      }

      const upserts = concepts.map((c) => ({
        sql: `INSERT INTO concept_mastery
                (course_id, concept_id, mastery_score, stability, difficulty, last_review, next_review, review_count, status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT (course_id, concept_id) DO UPDATE SET
                mastery_score = excluded.mastery_score,
                stability = excluded.stability,
                difficulty = excluded.difficulty,
                last_review = excluded.last_review,
                next_review = excluded.next_review,
                review_count = excluded.review_count,
                status = excluded.status`,
        args: [
          c.course_id, c.concept_id, c.mastery_score, c.stability,
          c.difficulty, c.last_review, c.next_review, c.review_count, c.status,
        ],
      }));

      const histInserts = history.map((h) => ({
        sql: "INSERT INTO mastery_history (course_id, concept_id, date, session_score, rating) VALUES (?, ?, ?, ?, ?)",
        args: [h.course_id, h.concept_id, h.date, h.session_score, h.rating],
      }));

      const today = new Date().toISOString().slice(0, 10);
      const updateCourse = {
        sql: "UPDATE courses SET updated_at = ? WHERE id = ?",
        args: [today, course_id],
      };

      await db.batch([...upserts, ...histInserts, updateCourse]);

      return { content: [{ type: "text" as const, text: JSON.stringify({ ok: true }) }] };
    }
  );

  // ── load_state ─────────────────────────────────────────────────────────────
  server.tool(
    "load_state",
    "Load the current mastery state for a course, reassembled into state_json format.",
    { course_id: z.string() },
    async ({ course_id }) => {
      // Verify course belongs to user
      const course = await getCourseById(course_id, userId);
      if (!course) {
        return { content: [{ type: "text" as const, text: JSON.stringify({}) }] };
      }

      const rows = await db.execute({
        sql: "SELECT * FROM concept_mastery WHERE course_id = ?",
        args: [course_id],
      });
      const histRows = await db.execute({
        sql: "SELECT * FROM mastery_history WHERE course_id = ? ORDER BY date ASC",
        args: [course_id],
      });

      const conceptRows = rows.rows.map((r) => ({
        course_id: r.course_id as string,
        concept_id: r.concept_id as string,
        mastery_score: r.mastery_score as number,
        stability: r.stability as number,
        difficulty: r.difficulty as number,
        last_review: r.last_review as string | null,
        next_review: r.next_review as string | null,
        review_count: r.review_count as number,
        status: r.status as string,
      }));
      const historyRows = histRows.rows.map((r) => ({
        course_id: r.course_id as string,
        concept_id: r.concept_id as string,
        date: r.date as string,
        session_score: r.session_score as number | null,
        rating: r.rating as string | null,
      }));

      const stateJson = rowsToStateJson(course.name, conceptRows, historyRows);
      return { content: [{ type: "text" as const, text: JSON.stringify(stateJson) }] };
    }
  );

  // ── list_courses ───────────────────────────────────────────────────────────
  server.tool(
    "list_courses",
    "List all courses with aggregate mastery statistics.",
    {},
    async () => {
      const courses = await getCourses(userId);

      const result = courses.map((c) => ({
        id: c.id,
        name: c.name,
        session_count: c.session_count,
        total: c.total,
        mastered: c.mastered,
        partial: c.partial,
        seen: c.seen,
        unknown: c.unknown,
        due_today: c.due_today,
        aggregate_mastery:
          c.total > 0 ? Math.round((c.mastered / c.total) * 100) : 0,
      }));

      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );

  // ── get_concept ────────────────────────────────────────────────────────────
  server.tool(
    "get_concept",
    "Get full mastery data for a single concept including session history.",
    {
      course_id: z.string(),
      concept_id: z.string(),
    },
    async ({ course_id, concept_id }) => {
      // Verify course belongs to user
      const course = await getCourseById(course_id, userId);
      if (!course) {
        return { content: [{ type: "text" as const, text: "null" }] };
      }

      const row = await db.execute({
        sql: "SELECT * FROM concept_mastery WHERE course_id = ? AND concept_id = ?",
        args: [course_id, concept_id],
      });
      if (row.rows.length === 0) {
        return { content: [{ type: "text" as const, text: "null" }] };
      }

      const hist = await db.execute({
        sql: "SELECT date, session_score, rating FROM mastery_history WHERE course_id = ? AND concept_id = ? ORDER BY date ASC",
        args: [course_id, concept_id],
      });

      const concept = {
        ...row.rows[0],
        prerequisites: row.rows[0].prerequisites
          ? JSON.parse(row.rows[0].prerequisites as string)
          : [],
        misconceptions: row.rows[0].misconceptions
          ? JSON.parse(row.rows[0].misconceptions as string)
          : [],
        history: hist.rows,
      };

      return { content: [{ type: "text" as const, text: JSON.stringify(concept) }] };
    }
  );

  // ── end_session ────────────────────────────────────────────────────────────
  server.tool(
    "end_session",
    "Mark a session as ended and record which concepts were covered.",
    {
      session_id: z.string(),
      concepts_covered: z.array(z.string()).describe("Array of concept_ids covered in this session"),
    },
    async ({ session_id, concepts_covered }) => {
      // Verify session belongs to user's course
      const sessionRow = await db.execute({
        sql: `SELECT s.id, s.started_at FROM sessions s
              JOIN courses c ON c.id = s.course_id
              WHERE s.id = ? AND c.user_id = ?`,
        args: [session_id, userId],
      });
      if (sessionRow.rows.length === 0) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: `Session ${session_id} not found` }) }],
          isError: true,
        };
      }

      const now = new Date().toISOString();
      const startedAt = sessionRow.rows[0].started_at as string;
      const durationMinutes = Math.round(
        (new Date(now).getTime() - new Date(startedAt).getTime()) / 60000
      );

      const updates: Array<{ sql: string; args: (string | number | null)[] }> = [
        {
          sql: "UPDATE sessions SET ended_at = ?, duration_minutes = ? WHERE id = ? AND ended_at IS NULL",
          args: [now, durationMinutes, session_id],
        },
      ];

      for (const conceptId of concepts_covered) {
        updates.push({
          sql: "INSERT OR IGNORE INTO session_concepts (session_id, concept_id) VALUES (?, ?)",
          args: [session_id, conceptId],
        });
      }

      await db.batch(updates);

      return { content: [{ type: "text" as const, text: JSON.stringify({ ok: true }) }] };
    }
  );

  // ── update_concept_status ─────────────────────────────────────────────────
  server.tool(
    "update_concept_status",
    "Update mastery status for a single concept immediately after teaching or assessing it. Lighter than save_state — no full state_json needed. Call after each concept is scored. Increments review_count and sets last_review to today.",
    {
      course_id: z.string(),
      concept_id: z.string(),
      session_id: z.string(),
      status: z.enum(["seen", "partial", "mastered"]).describe("Current mastery tier"),
      mastery_score: z.number().min(0).max(1).optional().describe(
        "0.0–1.0 score. Defaults if omitted: seen=0.20, partial=0.60, mastered=0.85"
      ),
    },
    async ({ course_id, concept_id, session_id, status, mastery_score }) => {
      // Verify course belongs to user
      const course = await getCourseById(course_id, userId);
      if (!course) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "Course not found" }) }],
          isError: true,
        };
      }

      const today = new Date().toISOString().slice(0, 10);
      const score =
        mastery_score ??
        (status === "mastered" ? 0.85 : status === "partial" ? 0.60 : 0.20);

      try {
        await db.batch([
          {
            sql: `INSERT INTO concept_mastery (course_id, concept_id, mastery_score, status, last_review, review_count)
                  VALUES (?, ?, ?, ?, ?, 1)
                  ON CONFLICT (course_id, concept_id) DO UPDATE SET
                    mastery_score = excluded.mastery_score,
                    status = excluded.status,
                    last_review = excluded.last_review,
                    review_count = review_count + 1`,
            args: [course_id, concept_id, score, status, today],
          },
          {
            sql: "INSERT INTO mastery_history (course_id, concept_id, date, session_score, rating) VALUES (?, ?, ?, ?, ?)",
            args: [course_id, concept_id, today, score, status],
          },
          {
            sql: "INSERT OR IGNORE INTO session_concepts (session_id, concept_id) VALUES (?, ?)",
            args: [session_id, concept_id],
          },
        ]);

        return { content: [{ type: "text" as const, text: JSON.stringify({ ok: true }) }] };
      } catch {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ ok: false }) }],
          isError: true,
        };
      }
    }
  );

  // ── save_knowledge_component ───────────────────────────────────────────────
  server.tool(
    "save_knowledge_component",
    "Record a specific insight or sub-fact a student has grasped during a session. Call silently — do not announce to the student.",
    {
      course_id: z.string(),
      concept_id: z.string(),
      session_id: z.string(),
      component_text: z.string().describe("A specific, quotable insight the student has demonstrated understanding of"),
    },
    async ({ course_id, concept_id, session_id, component_text }) => {
      // Verify course belongs to user
      const course = await getCourseById(course_id, userId);
      if (!course) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "Course not found" }) }],
          isError: true,
        };
      }

      const now = new Date().toISOString();
      try {
        const result = await db.execute({
          sql: "INSERT INTO knowledge_components (course_id, concept_id, session_id, component_text, created_at) VALUES (?, ?, ?, ?, ?)",
          args: [course_id, concept_id, session_id, component_text, now],
        });
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ ok: true, id: Number(result.lastInsertRowid) }) }],
        };
      } catch {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ ok: false, id: null }) }],
          isError: true,
        };
      }
    }
  );

  // ── record_misconception ────────────────────────────────────────────────
  server.tool(
    "record_misconception",
    "Record a misconception observed during a session. Call silently when the student demonstrates a misunderstanding. Do not announce to the student.",
    {
      course_id: z.string(),
      concept_id: z.string(),
      session_id: z.string(),
      misconception_text: z.string().describe("A specific misconception the student demonstrated during this session"),
    },
    async ({ course_id, concept_id, session_id, misconception_text }) => {
      // Verify course belongs to user
      const course = await getCourseById(course_id, userId);
      if (!course) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "Course not found" }) }],
          isError: true,
        };
      }

      const now = new Date().toISOString();
      try {
        const result = await db.execute({
          sql: "INSERT INTO misconceptions (course_id, concept_id, session_id, misconception_text, created_at) VALUES (?, ?, ?, ?, ?)",
          args: [course_id, concept_id, session_id, misconception_text, now],
        });
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ ok: true, id: Number(result.lastInsertRowid) }) }],
        };
      } catch {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ ok: false, id: null }) }],
          isError: true,
        };
      }
    }
  );

  // ── save_assessment ──────────────────────────────────────────────────────
  server.tool(
    "save_assessment",
    "Save an exam, assignment, or quiz with its date and linked concepts. Claude should resolve concept_ids from load_state before calling this. Upserts on (course_id, name, date).",
    {
      course_id: z.string(),
      name: z.string().describe("Assessment name, e.g. 'Midterm Exam'"),
      date: z.string().describe("ISO date string, e.g. '2026-05-15'"),
      type: z.enum(["exam", "assignment", "quiz", "other"]).optional().default("exam"),
      concept_ids: z.array(z.string()).describe("Concept IDs this assessment covers"),
      notes: z.string().optional(),
    },
    async ({ course_id, name: assessmentName, date, type, concept_ids, notes }) => {
      const course = await getCourseById(course_id, userId);
      if (!course) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "course_not_found", detail: `Course '${course_id}' not found for this user`, hint: "call list_courses to see valid course IDs" }) }],
          isError: true,
        };
      }

      // Validate date
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "invalid_date", detail: `'${date}' is not a valid ISO date`, hint: "use YYYY-MM-DD format" }) }],
          isError: true,
        };
      }
      const maxDate = new Date();
      maxDate.setMonth(maxDate.getMonth() + 18);
      if (parsedDate > maxDate) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "date_too_far", detail: `Date '${date}' is more than 18 months out`, hint: "assessments must be within 18 months" }) }],
          isError: true,
        };
      }

      // Validate concept_ids exist in this course
      if (concept_ids.length > 0) {
        const existingConcepts = await db.execute({
          sql: "SELECT concept_id FROM concept_mastery WHERE course_id = ?",
          args: [course_id],
        });
        const validIds = new Set(existingConcepts.rows.map((r) => r.concept_id as string));
        const invalid = concept_ids.filter((cid) => !validIds.has(cid));
        if (invalid.length > 0) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ error: "invalid_concept_id", detail: `concept_ids not found in course '${course_id}': ${invalid.join(", ")}`, hint: "call load_state or list_courses to see valid concept_ids" }) }],
            isError: true,
          };
        }
      }

      const now = new Date().toISOString();
      const isoDate = date.slice(0, 10);

      // Upsert assessment
      const result = await db.execute({
        sql: `INSERT INTO assessments (course_id, name, date, type, notes, created_at)
              VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT (course_id, name, date) DO UPDATE SET
                type = excluded.type,
                notes = excluded.notes`,
        args: [course_id, assessmentName, isoDate, type, notes ?? null, now],
      });

      const assessmentId = Number(result.lastInsertRowid);

      // Link concepts
      if (concept_ids.length > 0) {
        const stmts: Array<{ sql: string; args: (string | number | null)[] }> = [
          { sql: "DELETE FROM concept_assessments WHERE assessment_id = ?", args: [assessmentId] },
        ];
        for (const conceptId of concept_ids) {
          stmts.push({
            sql: "INSERT INTO concept_assessments (assessment_id, concept_id, course_id) VALUES (?, ?, ?)",
            args: [assessmentId, conceptId, course_id],
          });
        }
        await db.batch(stmts);
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify({ ok: true, assessment_id: assessmentId }) }],
      };
    }
  );

  // ── list_assessments ────────────────────────────────────────────────────
  server.tool(
    "list_assessments",
    "List all assessments for a course with readiness scores computed from linked concept mastery.",
    {
      course_id: z.string(),
    },
    async ({ course_id }) => {
      const course = await getCourseById(course_id, userId);
      if (!course) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "course_not_found", detail: `Course '${course_id}' not found`, hint: "call list_courses to see valid course IDs" }) }],
          isError: true,
        };
      }

      const assessments = await db.execute({
        sql: `SELECT a.id, a.name, a.date, a.type, a.notes
              FROM assessments a
              WHERE a.course_id = ?
              ORDER BY a.date ASC`,
        args: [course_id],
      });

      const result = [];
      for (const a of assessments.rows) {
        const links = await db.execute({
          sql: `SELECT ca.concept_id, cm.mastery_score
                FROM concept_assessments ca
                LEFT JOIN concept_mastery cm ON cm.course_id = ca.course_id AND cm.concept_id = ca.concept_id
                WHERE ca.assessment_id = ?`,
          args: [a.id],
        });

        const conceptIds = links.rows.map((r) => r.concept_id as string);
        const scores = links.rows.map((r) => (r.mastery_score as number) ?? 0);
        const readiness = scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : null;
        const floor = scores.length > 0 ? Math.min(...scores) : null;

        result.push({
          id: a.id as number,
          name: a.name as string,
          date: a.date as string,
          type: a.type as string,
          notes: a.notes as string | null,
          concept_ids: conceptIds,
          readiness: readiness !== null ? Math.round(readiness * 100) / 100 : null,
          floor: floor !== null ? Math.round(floor * 100) / 100 : null,
        });
      }

      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );

  // ── get_study_plan ──────────────────────────────────────────────────────
  server.tool(
    "get_study_plan",
    "Returns prioritized study recommendations based on upcoming assessments and concept mastery. Shows what to study and why.",
    {
      course_id: z.string().optional().describe("Omit for cross-course plan"),
    },
    async ({ course_id }) => {
      const userCourses = await getCourses(userId);
      const targetCourses = course_id
        ? userCourses.filter((c) => c.id === course_id)
        : userCourses;

      if (targetCourses.length === 0) {
        return { content: [{ type: "text" as const, text: JSON.stringify([]) }] };
      }

      const courseIds = targetCourses.map((c) => c.id);
      const placeholders = courseIds.map(() => "?").join(",");

      const today = new Date().toISOString().slice(0, 10);
      const thirtyDaysOut = new Date();
      thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
      const cutoff = thirtyDaysOut.toISOString().slice(0, 10);

      const assessments = await db.execute({
        sql: `SELECT a.id, a.name, a.date, a.course_id, c.name as course_name
              FROM assessments a
              JOIN courses c ON c.id = a.course_id
              WHERE a.course_id IN (${placeholders}) AND a.date >= ? AND a.date <= ?
              ORDER BY a.date ASC`,
        args: [...courseIds, today, cutoff],
      });

      const items = [];
      for (const a of assessments.rows) {
        const links = await db.execute({
          sql: `SELECT ca.concept_id, cm.mastery_score
                FROM concept_assessments ca
                LEFT JOIN concept_mastery cm ON cm.course_id = ca.course_id AND cm.concept_id = ca.concept_id
                WHERE ca.assessment_id = ?`,
          args: [a.id],
        });

        const scores = links.rows.map((r) => ({
          concept_id: r.concept_id as string,
          mastery_score: (r.mastery_score as number) ?? 0,
        }));

        if (scores.length === 0) continue;

        const readiness = scores.reduce((s, c) => s + c.mastery_score, 0) / scores.length;
        const floor = Math.min(...scores.map((c) => c.mastery_score));
        const daysUntil = Math.max(1, Math.ceil((new Date(a.date as string).getTime() - Date.now()) / 86400000));

        const urgencyWeight = 1 / Math.sqrt(daysUntil);
        const priority = (1 - readiness) * urgencyWeight;

        const weakConcepts = scores
          .filter((c) => c.mastery_score < 0.7)
          .sort((x, y) => x.mastery_score - y.mastery_score)
          .slice(0, 5);

        items.push({
          assessment_name: a.name as string,
          course_name: a.course_name as string,
          course_id: a.course_id as string,
          date: a.date as string,
          readiness: Math.round(readiness * 100) / 100,
          floor: Math.round(floor * 100) / 100,
          days_until: daysUntil,
          priority: Math.round(priority * 1000) / 1000,
          weak_concepts: weakConcepts,
        });
      }

      items.sort((a, b) => b.priority - a.priority);
      const top10 = items.slice(0, 10);

      return { content: [{ type: "text" as const, text: JSON.stringify(top10) }] };
    }
  );

  // ── update_assessment ───────────────────────────────────────────────────
  server.tool(
    "update_assessment",
    "Update an existing assessment's name, date, type, notes, or linked concepts.",
    {
      course_id: z.string(),
      assessment_id: z.number(),
      name: z.string().optional(),
      date: z.string().optional(),
      type: z.enum(["exam", "assignment", "quiz", "other"]).optional(),
      concept_ids: z.array(z.string()).optional(),
      notes: z.string().optional(),
    },
    async ({ course_id, assessment_id, name: newName, date, type, concept_ids, notes }) => {
      const course = await getCourseById(course_id, userId);
      if (!course) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "course_not_found", detail: `Course '${course_id}' not found`, hint: "call list_courses to see valid course IDs" }) }],
          isError: true,
        };
      }

      const existing = await db.execute({
        sql: "SELECT id FROM assessments WHERE id = ? AND course_id = ?",
        args: [assessment_id, course_id],
      });
      if (existing.rows.length === 0) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "assessment_not_found", detail: `Assessment ${assessment_id} not found in course '${course_id}'`, hint: "call list_assessments to see valid IDs" }) }],
          isError: true,
        };
      }

      if (date) {
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ error: "invalid_date", detail: `'${date}' is not a valid ISO date`, hint: "use YYYY-MM-DD format" }) }],
            isError: true,
          };
        }
        const maxDate = new Date();
        maxDate.setMonth(maxDate.getMonth() + 18);
        if (parsedDate > maxDate) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ error: "date_too_far", detail: `Date '${date}' is more than 18 months out`, hint: "assessments must be within 18 months" }) }],
            isError: true,
          };
        }
      }

      if (concept_ids && concept_ids.length > 0) {
        const existingConcepts = await db.execute({
          sql: "SELECT concept_id FROM concept_mastery WHERE course_id = ?",
          args: [course_id],
        });
        const validIds = new Set(existingConcepts.rows.map((r) => r.concept_id as string));
        const invalid = concept_ids.filter((cid) => !validIds.has(cid));
        if (invalid.length > 0) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ error: "invalid_concept_id", detail: `concept_ids not found: ${invalid.join(", ")}`, hint: "call load_state to see valid concept_ids" }) }],
            isError: true,
          };
        }
      }

      const stmts: Array<{ sql: string; args: (string | number | null)[] }> = [];

      const setClauses: string[] = [];
      const setArgs: (string | number | null)[] = [];
      if (newName !== undefined) { setClauses.push("name = ?"); setArgs.push(newName); }
      if (date !== undefined) { setClauses.push("date = ?"); setArgs.push(date.slice(0, 10)); }
      if (type !== undefined) { setClauses.push("type = ?"); setArgs.push(type); }
      if (notes !== undefined) { setClauses.push("notes = ?"); setArgs.push(notes); }

      if (setClauses.length > 0) {
        stmts.push({
          sql: `UPDATE assessments SET ${setClauses.join(", ")} WHERE id = ?`,
          args: [...setArgs, assessment_id],
        });
      }

      if (concept_ids) {
        stmts.push({ sql: "DELETE FROM concept_assessments WHERE assessment_id = ?", args: [assessment_id] });
        for (const conceptId of concept_ids) {
          stmts.push({
            sql: "INSERT INTO concept_assessments (assessment_id, concept_id, course_id) VALUES (?, ?, ?)",
            args: [assessment_id, conceptId, course_id],
          });
        }
      }

      if (stmts.length > 0) {
        await db.batch(stmts);
      }

      return { content: [{ type: "text" as const, text: JSON.stringify({ ok: true }) }] };
    }
  );

  // ── delete_assessment ───────────────────────────────────────────────────
  server.tool(
    "delete_assessment",
    "Delete an assessment by ID. Cascades to concept_assessments links.",
    {
      course_id: z.string(),
      assessment_id: z.number(),
    },
    async ({ course_id, assessment_id }) => {
      const course = await getCourseById(course_id, userId);
      if (!course) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "course_not_found", detail: `Course '${course_id}' not found`, hint: "call list_courses to see valid course IDs" }) }],
          isError: true,
        };
      }

      const existing = await db.execute({
        sql: "SELECT id FROM assessments WHERE id = ? AND course_id = ?",
        args: [assessment_id, course_id],
      });
      if (existing.rows.length === 0) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "assessment_not_found", detail: `Assessment ${assessment_id} not found in course '${course_id}'`, hint: "call list_assessments to see valid IDs" }) }],
          isError: true,
        };
      }

      await db.execute({
        sql: "DELETE FROM assessments WHERE id = ? AND course_id = ?",
        args: [assessment_id, course_id],
      });

      return { content: [{ type: "text" as const, text: JSON.stringify({ ok: true }) }] };
    }
  );

  return server;
}

// ─── Route handlers ───────────────────────────────────────────────────────────

async function handleMcp(req: Request): Promise<Response> {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const server = buildMcpServer(authResult.userId);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);
  return transport.handleRequest(req);
}

export const POST = handleMcp;
export const GET = handleMcp;
export const DELETE = handleMcp;
