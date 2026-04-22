/**
 * V3 Migration: Add assessments and concept_assessments tables.
 *   npx tsx scripts/migrate-v3.ts
 *
 * Safe to re-run — uses CREATE TABLE IF NOT EXISTS.
 * Requires TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env.local.
 */

import { createClient } from "@libsql/client";
import { config } from "dotenv";

config({ path: ".env.local" });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const V3_SCHEMA = `
CREATE TABLE IF NOT EXISTS assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id TEXT NOT NULL,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  type TEXT DEFAULT 'exam',
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE (course_id, name, date)
);

CREATE TABLE IF NOT EXISTS concept_assessments (
  assessment_id INTEGER NOT NULL,
  concept_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  weight REAL DEFAULT 1.0,
  PRIMARY KEY (assessment_id, concept_id),
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id, concept_id) REFERENCES concept_mastery(course_id, concept_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_assessments_course_date ON assessments(course_id, date);
CREATE INDEX IF NOT EXISTS idx_concept_assessments_assessment ON concept_assessments(assessment_id);
`;

async function migrate() {
  const statements = V3_SCHEMA.split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => ({ sql: s + ";", args: [] as never[] }));

  await db.batch(statements, "write");
  console.log(`✓ V3 schema applied (${statements.length} statements)`);
}

migrate().catch((err) => {
  console.error("V3 migration failed:", err);
  process.exit(1);
});
