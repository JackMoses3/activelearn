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
