import { createClient } from "@libsql/client";

let _client: ReturnType<typeof createClient> | null = null;
let _pragmaReady: Promise<void> | null = null;

export function getDb() {
  if (!_client) {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) {
      throw new Error(
        "TURSO_DATABASE_URL is not set. Add it to your environment variables."
      );
    }
    _client = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    _pragmaReady = _client.execute("PRAGMA foreign_keys = ON;").then(() => {});
  }
  return _client;
}

/** Await this before queries that depend on FK enforcement. */
export async function ensureForeignKeys(): Promise<void> {
  getDb();
  await _pragmaReady;
}
