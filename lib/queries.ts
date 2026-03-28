import { getDb } from "./db";

export interface CourseStats {
  id: string;
  name: string;
  session_count: number;
  total: number;
  mastered: number;
  partial: number;
  seen: number;
  unknown: number;
  due_today: number;
  updated_at: string;
}

export interface Session {
  id: string;
  course_id: string;
  course_name: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  concepts_count: number;
}

export interface ConceptMastery {
  concept_id: string;
  mastery_score: number;
  stability: number;
  difficulty: number;
  last_review: string | null;
  next_review: string | null;
  review_count: number;
  status: string;
  bloom_level: string | null;
  prerequisites: string | null;
  misconceptions: string | null;
}

export interface MasteryHistoryEntry {
  date: string;
  session_score: number | null;
  rating: string | null;
}

export async function getCourses(): Promise<CourseStats[]> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT
      c.id, c.name, c.updated_at,
      (SELECT COUNT(*) FROM sessions s WHERE s.course_id = c.id) as session_count,
      COUNT(cm.concept_id) as total,
      SUM(CASE WHEN cm.status='mastered' THEN 1 ELSE 0 END) as mastered,
      SUM(CASE WHEN cm.status='partial' THEN 1 ELSE 0 END) as partial,
      SUM(CASE WHEN cm.status='seen' THEN 1 ELSE 0 END) as seen,
      SUM(CASE WHEN cm.status='unknown' THEN 1 ELSE 0 END) as unknown,
      SUM(CASE WHEN cm.next_review <= date('now') AND cm.next_review IS NOT NULL THEN 1 ELSE 0 END) as due_today
    FROM courses c
    LEFT JOIN concept_mastery cm ON cm.course_id = c.id
    GROUP BY c.id, c.name, c.updated_at
    ORDER BY c.updated_at DESC`,
    args: [],
  });

  return result.rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    updated_at: r.updated_at as string,
    session_count: Number(r.session_count ?? 0),
    total: Number(r.total ?? 0),
    mastered: Number(r.mastered ?? 0),
    partial: Number(r.partial ?? 0),
    seen: Number(r.seen ?? 0),
    unknown: Number(r.unknown ?? 0),
    due_today: Number(r.due_today ?? 0),
  }));
}

export async function getRecentSessions(limit = 10): Promise<Session[]> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT
      s.id, s.course_id, c.name as course_name,
      s.started_at, s.ended_at, s.duration_minutes,
      (SELECT COUNT(*) FROM session_concepts sc WHERE sc.session_id = s.id) as concepts_count
    FROM sessions s
    JOIN courses c ON c.id = s.course_id
    ORDER BY s.started_at DESC
    LIMIT ?`,
    args: [limit],
  });

  return result.rows.map((r) => ({
    id: r.id as string,
    course_id: r.course_id as string,
    course_name: r.course_name as string,
    started_at: r.started_at as string,
    ended_at: r.ended_at as string | null,
    duration_minutes: r.duration_minutes as number | null,
    concepts_count: Number(r.concepts_count ?? 0),
  }));
}

export async function getCourseById(id: string): Promise<{ id: string; name: string } | null> {
  const db = getDb();
  const result = await db.execute({
    sql: "SELECT id, name FROM courses WHERE id = ?",
    args: [id],
  });
  if (result.rows.length === 0) return null;
  return { id: result.rows[0].id as string, name: result.rows[0].name as string };
}

export async function getConceptsForCourse(courseId: string): Promise<ConceptMastery[]> {
  const db = getDb();
  const result = await db.execute({
    sql: "SELECT * FROM concept_mastery WHERE course_id = ? ORDER BY concept_id",
    args: [courseId],
  });

  return result.rows.map((r) => ({
    concept_id: r.concept_id as string,
    mastery_score: r.mastery_score as number,
    stability: r.stability as number,
    difficulty: r.difficulty as number,
    last_review: r.last_review as string | null,
    next_review: r.next_review as string | null,
    review_count: r.review_count as number,
    status: r.status as string,
    bloom_level: r.bloom_level as string | null,
    prerequisites: r.prerequisites as string | null,
    misconceptions: r.misconceptions as string | null,
  }));
}

export async function getConceptHistory(
  courseId: string,
  conceptId: string
): Promise<MasteryHistoryEntry[]> {
  const db = getDb();
  const result = await db.execute({
    sql: "SELECT date, session_score, rating FROM mastery_history WHERE course_id = ? AND concept_id = ? ORDER BY date DESC",
    args: [courseId, conceptId],
  });

  return result.rows.map((r) => ({
    date: r.date as string,
    session_score: r.session_score as number | null,
    rating: r.rating as string | null,
  }));
}

export async function getSessionsForCourse(courseId: string): Promise<Session[]> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT
      s.id, s.course_id, c.name as course_name,
      s.started_at, s.ended_at, s.duration_minutes,
      (SELECT COUNT(*) FROM session_concepts sc WHERE sc.session_id = s.id) as concepts_count
    FROM sessions s
    JOIN courses c ON c.id = s.course_id
    WHERE s.course_id = ?
    ORDER BY s.started_at DESC`,
    args: [courseId],
  });

  return result.rows.map((r) => ({
    id: r.id as string,
    course_id: r.course_id as string,
    course_name: r.course_name as string,
    started_at: r.started_at as string,
    ended_at: r.ended_at as string | null,
    duration_minutes: r.duration_minutes as number | null,
    concepts_count: Number(r.concepts_count ?? 0),
  }));
}
