export const runtime = "nodejs";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { slugifyWithHash } from "@/lib/slugify";
import { stateJsonToRows, rowsToStateJson } from "@/lib/state";

// ─── Auth guard ──────────────────────────────────────────────────────────────

async function requireAuth(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return Response.json(
      { error: "unauthorized", error_description: "Bearer token required" },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } }
    );
  }

  const db = getDb();
  const row = await db.execute({
    sql: "SELECT token FROM oauth_tokens WHERE token = ?",
    args: [token],
  });

  if (row.rows.length === 0) {
    return Response.json(
      { error: "unauthorized", error_description: "Invalid token" },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } }
    );
  }

  return null;
}

// ─── MCP server factory ───────────────────────────────────────────────────────

function buildMcpServer(): McpServer {
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

      // Resolve course_id
      const existing = await db.execute({
        sql: "SELECT id, name FROM courses WHERE name = ?",
        args: [course_name],
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
          sql: "INSERT INTO courses (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
          args: [courseId, course_name, today, today],
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

      // Compute routing hint per concept: "i-do" if new/unseen, "diagnostic" if partial/mastered
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

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ session_id: sessionId, course_id: courseId, state_json: stateJson, routing, knowledge_components }),
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
        "JSON object: { concepts: { [id]: { bloom_level?, prerequisites?: string[], misconceptions?: string[] } } }"
      ),
    },
    async ({ course_id, graph_json }) => {
      let graph: Record<string, { bloom_level?: string; prerequisites?: string[]; misconceptions?: string[] }>;
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
          sql: `INSERT INTO concept_mastery (course_id, concept_id, bloom_level, prerequisites, misconceptions, status)
                VALUES (?, ?, ?, ?, ?, 'unknown')
                ON CONFLICT (course_id, concept_id) DO UPDATE SET
                  bloom_level = excluded.bloom_level,
                  prerequisites = excluded.prerequisites,
                  misconceptions = excluded.misconceptions`,
          args: [
            course_id,
            conceptId,
            node.bloom_level ?? null,
            node.prerequisites ? JSON.stringify(node.prerequisites) : null,
            node.misconceptions ? JSON.stringify(node.misconceptions) : null,
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

      // Resolve course name from DB
      const courseRow = await db.execute({
        sql: "SELECT name FROM courses WHERE id = ?",
        args: [course_id],
      });
      if (courseRow.rows.length === 0) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: `Course ${course_id} not found` }) }],
          isError: true,
        };
      }
      const courseName = courseRow.rows[0].name as string;

      const { concepts, history } = stateJsonToRows(course_id, courseName, parsed);

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
      const courseRow = await db.execute({
        sql: "SELECT name FROM courses WHERE id = ?",
        args: [course_id],
      });
      if (courseRow.rows.length === 0) {
        return { content: [{ type: "text" as const, text: JSON.stringify({}) }] };
      }
      const courseName = courseRow.rows[0].name as string;

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

      const stateJson = rowsToStateJson(courseName, conceptRows, historyRows);
      return { content: [{ type: "text" as const, text: JSON.stringify(stateJson) }] };
    }
  );

  // ── list_courses ───────────────────────────────────────────────────────────
  server.tool(
    "list_courses",
    "List all courses with aggregate mastery statistics.",
    {},
    async () => {
      const result = await db.execute({
        sql: `SELECT
          c.id, c.name,
          (SELECT COUNT(*) FROM sessions s WHERE s.course_id = c.id) as session_count,
          COUNT(cm.concept_id) as total,
          SUM(CASE WHEN cm.status='mastered' THEN 1 ELSE 0 END) as mastered,
          SUM(CASE WHEN cm.status='partial' THEN 1 ELSE 0 END) as partial,
          SUM(CASE WHEN cm.status='seen' THEN 1 ELSE 0 END) as seen,
          SUM(CASE WHEN cm.status='unknown' THEN 1 ELSE 0 END) as unknown,
          SUM(CASE WHEN cm.next_review <= date('now') THEN 1 ELSE 0 END) as due_today
        FROM courses c
        LEFT JOIN concept_mastery cm ON cm.course_id = c.id
        GROUP BY c.id, c.name`,
        args: [],
      });

      const courses = result.rows.map((r) => ({
        id: r.id,
        name: r.name,
        session_count: r.session_count,
        total: r.total ?? 0,
        mastered: r.mastered ?? 0,
        partial: r.partial ?? 0,
        seen: r.seen ?? 0,
        unknown: r.unknown ?? 0,
        due_today: r.due_today ?? 0,
        aggregate_mastery:
          (r.total as number) > 0
            ? Math.round(((r.mastered as number) / (r.total as number)) * 100)
            : 0,
      }));

      return { content: [{ type: "text" as const, text: JSON.stringify(courses) }] };
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
      const sessionRow = await db.execute({
        sql: "SELECT id, started_at FROM sessions WHERE id = ?",
        args: [session_id],
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

  return server;
}

// ─── Route handlers ───────────────────────────────────────────────────────────

async function handleMcp(req: Request): Promise<Response> {
  const authError = await requireAuth(req);
  if (authError) return authError;

  const server = buildMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);
  return transport.handleRequest(req);
}

export const POST = handleMcp;
export const GET = handleMcp;
export const DELETE = handleMcp;
