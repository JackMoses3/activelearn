import { createClient } from "@libsql/client";

let _client: ReturnType<typeof createClient> | null = null;

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
    _client.execute("PRAGMA foreign_keys = ON;");
  }
  return _client;
}
