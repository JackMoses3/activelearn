/**
 * Migration from pre-auth schema to v2 (multi-user with auth).
 * Run once: npx tsx scripts/migrate-v2.ts
 *
 * Adds: users, accounts, pending_mcp_auth, misconceptions tables.
 * Alters: courses (add user_id), oauth_auth_codes (add user_id),
 *         oauth_tokens (add user_id).
 * Note: SQLite doesn't support ADD CONSTRAINT, so ON DELETE CASCADE
 * can't be added to existing tables. New tables get it.
 */

import { createClient } from "@libsql/client";
import { config } from "dotenv";

config({ path: ".env.local" });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const statements = [
  // New tables
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    email_verified TEXT,
    image TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_account_id TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(provider, provider_account_id)
  )`,

  `CREATE TABLE IF NOT EXISTS pending_mcp_auth (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    redirect_uri TEXT NOT NULL,
    state TEXT NOT NULL,
    code_challenge TEXT,
    expires_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS misconceptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id TEXT NOT NULL,
    concept_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    misconception_text TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (course_id, concept_id) REFERENCES concept_mastery(course_id, concept_id) ON DELETE CASCADE
  )`,

  // Add user_id columns to existing tables
  `ALTER TABLE courses ADD COLUMN user_id TEXT REFERENCES users(id)`,
  `ALTER TABLE oauth_auth_codes ADD COLUMN user_id TEXT`,
  `ALTER TABLE oauth_tokens ADD COLUMN user_id TEXT`,

  // Index for user_id lookups
  `CREATE INDEX IF NOT EXISTS idx_courses_user_id ON courses(user_id)`,
];

async function migrate() {
  for (const sql of statements) {
    const label = sql.trim().split("\n")[0].substring(0, 60);
    try {
      await db.execute(sql);
      console.log(`✓ ${label}`);
    } catch (err: unknown) {
      const msg = (err as Error).message ?? "";
      // Skip if column/table already exists
      if (msg.includes("duplicate column") || msg.includes("already exists")) {
        console.log(`· ${label} (already exists, skipping)`);
      } else {
        console.error(`✗ ${label}`);
        throw err;
      }
    }
  }
  console.log("\n✓ Migration complete");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
