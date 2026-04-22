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

export async function getCourses(userId: string): Promise<CourseStats[]> {
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
    WHERE c.user_id = ?
    GROUP BY c.id, c.name, c.updated_at
    ORDER BY c.updated_at DESC`,
    args: [userId],
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

export async function getRecentSessions(userId: string, limit = 10): Promise<Session[]> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT
      s.id, s.course_id, c.name as course_name,
      s.started_at, s.ended_at, s.duration_minutes,
      (SELECT COUNT(*) FROM session_concepts sc WHERE sc.session_id = s.id) as concepts_count
    FROM sessions s
    JOIN courses c ON c.id = s.course_id
    WHERE c.user_id = ?
    ORDER BY s.started_at DESC
    LIMIT ?`,
    args: [userId, limit],
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

export async function getCourseById(id: string, userId: string): Promise<{ id: string; name: string } | null> {
  const db = getDb();
  const result = await db.execute({
    sql: "SELECT id, name FROM courses WHERE id = ? AND user_id = ?",
    args: [id, userId],
  });
  if (result.rows.length === 0) return null;
  return { id: result.rows[0].id as string, name: result.rows[0].name as string };
}

export async function getConceptsForCourse(courseId: string, userId: string): Promise<ConceptMastery[]> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT cm.* FROM concept_mastery cm
          JOIN courses c ON c.id = cm.course_id
          WHERE cm.course_id = ? AND c.user_id = ?
          ORDER BY cm.concept_id`,
    args: [courseId, userId],
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
  conceptId: string,
  userId: string
): Promise<MasteryHistoryEntry[]> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT mh.date, mh.session_score, mh.rating
          FROM mastery_history mh
          JOIN courses c ON c.id = mh.course_id
          WHERE mh.course_id = ? AND mh.concept_id = ? AND c.user_id = ?
          ORDER BY mh.date DESC`,
    args: [courseId, conceptId, userId],
  });

  return result.rows.map((r) => ({
    date: r.date as string,
    session_score: r.session_score as number | null,
    rating: r.rating as string | null,
  }));
}

export interface KnowledgeComponent {
  id: number;
  concept_id: string;
  component_text: string;
  session_id: string;
  created_at: string;
}

export async function getKnowledgeComponents(
  courseId: string,
  conceptId: string,
  userId: string
): Promise<KnowledgeComponent[]> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT kc.id, kc.concept_id, kc.component_text, kc.session_id, kc.created_at
          FROM knowledge_components kc
          JOIN courses c ON c.id = kc.course_id
          WHERE kc.course_id = ? AND kc.concept_id = ? AND c.user_id = ?
          ORDER BY kc.created_at ASC`,
    args: [courseId, conceptId, userId],
  });

  return result.rows.map((r) => ({
    id: r.id as number,
    concept_id: r.concept_id as string,
    component_text: r.component_text as string,
    session_id: r.session_id as string,
    created_at: r.created_at as string,
  }));
}

export interface Misconception {
  id: number;
  concept_id: string;
  session_id: string;
  misconception_text: string;
  created_at: string;
}

export async function getMisconceptions(
  courseId: string,
  conceptId: string,
  userId: string
): Promise<Misconception[]> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT m.id, m.concept_id, m.session_id, m.misconception_text, m.created_at
          FROM misconceptions m
          JOIN courses c ON c.id = m.course_id
          WHERE m.course_id = ? AND m.concept_id = ? AND c.user_id = ?
          ORDER BY m.created_at ASC`,
    args: [courseId, conceptId, userId],
  });

  return result.rows.map((r) => ({
    id: r.id as number,
    concept_id: r.concept_id as string,
    session_id: r.session_id as string,
    misconception_text: r.misconception_text as string,
    created_at: r.created_at as string,
  }));
}

export interface Assessment {
  id: number;
  name: string;
  date: string;
  type: string;
  notes: string | null;
  concept_ids: string[];
  readiness: number | null;
  floor: number | null;
}

export async function getAssessmentsForCourse(courseId: string, userId: string): Promise<Assessment[]> {
  const db = getDb();

  // Verify course ownership
  const course = await db.execute({
    sql: "SELECT id FROM courses WHERE id = ? AND user_id = ?",
    args: [courseId, userId],
  });
  if (course.rows.length === 0) return [];

  const assessments = await db.execute({
    sql: `SELECT a.id, a.name, a.date, a.type, a.notes
          FROM assessments a
          WHERE a.course_id = ?
          ORDER BY a.date ASC`,
    args: [courseId],
  });

  const result: Assessment[] = [];
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

  return result;
}

export interface StudyPlanItem {
  assessment_name: string;
  course_name: string;
  course_id: string;
  date: string;
  readiness: number;
  floor: number;
  days_until: number;
  priority: number;
  weak_concepts: Array<{ concept_id: string; mastery_score: number }>;
}

export async function getStudyPlan(userId: string): Promise<StudyPlanItem[]> {
  const db = getDb();

  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysOut = new Date();
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
  const cutoff = thirtyDaysOut.toISOString().slice(0, 10);

  const assessments = await db.execute({
    sql: `SELECT a.id, a.name, a.date, a.course_id, c.name as course_name
          FROM assessments a
          JOIN courses c ON c.id = a.course_id
          WHERE c.user_id = ? AND a.date >= ? AND a.date <= ?
          ORDER BY a.date ASC`,
    args: [userId, today, cutoff],
  });

  const items: StudyPlanItem[] = [];
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
  return items.slice(0, 10);
}

export async function getSessionsForCourse(courseId: string, userId: string): Promise<Session[]> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT
      s.id, s.course_id, c.name as course_name,
      s.started_at, s.ended_at, s.duration_minutes,
      (SELECT COUNT(*) FROM session_concepts sc WHERE sc.session_id = s.id) as concepts_count
    FROM sessions s
    JOIN courses c ON c.id = s.course_id
    WHERE s.course_id = ? AND c.user_id = ?
    ORDER BY s.started_at DESC`,
    args: [courseId, userId],
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
