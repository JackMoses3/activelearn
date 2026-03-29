/**
 * Run once to create the schema in Turso:
 *   npx tsx scripts/migrate.ts
 *
 * Requires TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env.local.
 */

import { createClient } from "@libsql/client";
import { config } from "dotenv";

config({ path: ".env.local" });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const SCHEMA = `
CREATE TABLE IF NOT EXISTS oauth_clients (
  client_id TEXT PRIMARY KEY,
  redirect_uris TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS oauth_auth_codes (
  code TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  code_challenge TEXT,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS oauth_tokens (
  token TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

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

CREATE TABLE IF NOT EXISTS knowledge_components (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id TEXT NOT NULL,
  concept_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  component_text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (course_id) REFERENCES courses(id)
);
`;

async function migrate() {
  const statements = SCHEMA.split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => ({ sql: s + ";", args: [] as never[] }));

  await db.batch(statements, "write");
  console.log(`✓ Schema applied (${statements.length} statements)`);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
