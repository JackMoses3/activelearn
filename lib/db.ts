import { createClient } from "@libsql/client";

let _client: ReturnType<typeof createClient> | null = null;

export function getDb() {
  if (!_client) {
    _client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return _client;
}

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_minutes INTEGER,
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

CREATE TABLE IF NOT EXISTS session_concepts (
  session_id TEXT NOT NULL,
  concept_id TEXT NOT NULL,
  PRIMARY KEY (session_id, concept_id)
);

CREATE TABLE IF NOT EXISTS concept_mastery (
  course_id TEXT NOT NULL,
  concept_id TEXT NOT NULL,
  mastery_score REAL DEFAULT 0,
  stability REAL DEFAULT 1,
  difficulty REAL DEFAULT 0.3,
  last_review TEXT,
  next_review TEXT,
  review_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'unknown',
  bloom_level TEXT,
  prerequisites TEXT,
  misconceptions TEXT,
  PRIMARY KEY (course_id, concept_id)
);

CREATE TABLE IF NOT EXISTS mastery_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id TEXT NOT NULL,
  concept_id TEXT NOT NULL,
  date TEXT NOT NULL,
  session_score REAL,
  rating TEXT
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  uploaded_at TEXT NOT NULL
);
`;
