import { getDb } from "@/lib/db";
import type { Adapter, AdapterUser, AdapterAccount } from "@auth/core/adapters";

function rowToUser(row: Record<string, unknown>): AdapterUser {
  return {
    id: row.id as string,
    name: (row.name as string) ?? null,
    email: row.email as string,
    emailVerified: row.email_verified
      ? new Date(row.email_verified as string)
      : null,
    image: (row.image as string) ?? null,
  };
}

export function TursoAdapter(): Adapter {
  return {
    async createUser(user) {
      const db = getDb();
      const id = crypto.randomUUID();
      await db.execute({
        sql: `INSERT INTO users (id, name, email, email_verified, image) VALUES (?, ?, ?, ?, ?)`,
        args: [
          id,
          user.name ?? null,
          user.email,
          user.emailVerified?.toISOString() ?? null,
          user.image ?? null,
        ],
      });
      return { ...user, id };
    },

    async getUser(id) {
      const db = getDb();
      const result = await db.execute({
        sql: `SELECT * FROM users WHERE id = ?`,
        args: [id],
      });
      const row = result.rows[0];
      return row ? rowToUser(row) : null;
    },

    async getUserByEmail(email) {
      const db = getDb();
      const result = await db.execute({
        sql: `SELECT * FROM users WHERE email = ?`,
        args: [email],
      });
      const row = result.rows[0];
      return row ? rowToUser(row) : null;
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const db = getDb();
      const result = await db.execute({
        sql: `SELECT u.* FROM users u
              JOIN accounts a ON u.id = a.user_id
              WHERE a.provider = ? AND a.provider_account_id = ?`,
        args: [provider, providerAccountId],
      });
      const row = result.rows[0];
      return row ? rowToUser(row) : null;
    },

    async updateUser(user) {
      const db = getDb();
      const fields: string[] = [];
      const args: (string | null)[] = [];
      if (user.name !== undefined) {
        fields.push("name = ?");
        args.push(user.name);
      }
      if (user.email !== undefined) {
        fields.push("email = ?");
        args.push(user.email);
      }
      if (user.emailVerified !== undefined) {
        fields.push("email_verified = ?");
        args.push(user.emailVerified?.toISOString() ?? null);
      }
      if (user.image !== undefined) {
        fields.push("image = ?");
        args.push(user.image);
      }
      if (fields.length > 0) {
        args.push(user.id);
        await db.execute({
          sql: `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
          args,
        });
      }
      const result = await db.execute({
        sql: `SELECT * FROM users WHERE id = ?`,
        args: [user.id],
      });
      return rowToUser(result.rows[0]!);
    },

    async linkAccount(account) {
      const db = getDb();
      const id = crypto.randomUUID();
      await db.execute({
        sql: `INSERT INTO accounts (id, user_id, type, provider, provider_account_id, refresh_token, access_token, expires_at, token_type, scope, id_token)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          account.userId,
          account.type,
          account.provider,
          account.providerAccountId,
          account.refresh_token ?? null,
          account.access_token ?? null,
          account.expires_at ?? null,
          account.token_type ?? null,
          account.scope ?? null,
          account.id_token ?? null,
        ],
      });
    },
  };
}
