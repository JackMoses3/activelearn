/**
 * Translation layer between v1 state_json format and Turso concept_mastery rows.
 *
 * state_json shape (v1):
 * {
 *   "Course Name": {
 *     "last_updated": "2026-03-28",
 *     "concepts": {
 *       "concept_id": {
 *         mastery_score, stability, difficulty,
 *         last_review, next_review, review_count, status,
 *         history: [{ date, session_score, rating }]
 *       }
 *     }
 *   }
 * }
 */

export interface ConceptRow {
  course_id: string;
  concept_id: string;
  mastery_score: number;
  stability: number;
  difficulty: number;
  last_review: string | null;
  next_review: string | null;
  review_count: number;
  status: string;
  bloom_level?: string | null;
  prerequisites?: string | null; // JSON array string
  misconceptions?: string | null; // JSON array string
}

export interface HistoryRow {
  course_id: string;
  concept_id: string;
  date: string;
  session_score: number | null;
  rating: string | null;
}

export interface StateJson {
  [courseName: string]: {
    last_updated?: string;
    concepts?: Record<string, ConceptData>;
  };
}

export interface ConceptData {
  mastery_score?: number;
  stability?: number;
  difficulty?: number;
  last_review?: string;
  next_review?: string;
  review_count?: number;
  status?: string;
  history?: Array<{ date: string; session_score?: number; rating?: string }>;
}

export function stateJsonToRows(
  courseId: string,
  courseName: string,
  stateJson: StateJson
): { concepts: ConceptRow[]; history: HistoryRow[] } {
  const courseData = stateJson[courseName];
  if (!courseData?.concepts) return { concepts: [], history: [] };

  const concepts: ConceptRow[] = [];
  const history: HistoryRow[] = [];

  for (const [conceptId, data] of Object.entries(courseData.concepts)) {
    concepts.push({
      course_id: courseId,
      concept_id: conceptId,
      mastery_score: data.mastery_score ?? 0,
      stability: data.stability ?? 1,
      difficulty: data.difficulty ?? 0.3,
      last_review: data.last_review ?? null,
      next_review: data.next_review ?? null,
      review_count: data.review_count ?? 0,
      status: data.status ?? "unknown",
      bloom_level: null,
      prerequisites: null,
      misconceptions: null,
    });

    for (const h of data.history ?? []) {
      history.push({
        course_id: courseId,
        concept_id: conceptId,
        date: h.date,
        session_score: h.session_score ?? null,
        rating: h.rating ?? null,
      });
    }
  }

  return { concepts, history };
}

export function rowsToStateJson(
  courseName: string,
  rows: ConceptRow[],
  historyRows: HistoryRow[]
): StateJson {
  if (rows.length === 0) return {};

  const historyByConceptId: Record<string, HistoryRow[]> = {};
  for (const h of historyRows) {
    if (!historyByConceptId[h.concept_id]) historyByConceptId[h.concept_id] = [];
    historyByConceptId[h.concept_id].push(h);
  }

  const concepts: Record<string, ConceptData> = {};
  for (const row of rows) {
    const history = (historyByConceptId[row.concept_id] ?? [])
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((h) => ({
        date: h.date,
        ...(h.session_score != null ? { session_score: h.session_score } : {}),
        ...(h.rating != null ? { rating: h.rating } : {}),
      }));

    concepts[row.concept_id] = {
      mastery_score: row.mastery_score,
      stability: row.stability,
      difficulty: row.difficulty,
      last_review: row.last_review ?? undefined,
      next_review: row.next_review ?? undefined,
      review_count: row.review_count,
      status: row.status,
      history,
    };
  }

  return {
    [courseName]: {
      last_updated: new Date().toISOString().slice(0, 10),
      concepts,
    },
  };
}
