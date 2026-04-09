"use server";

import { auth, signOut } from "@/auth";
import { getDb } from "@/lib/db";
import { randomBytes, createHash } from "crypto";
import { redirect } from "next/navigation";

export async function regenerateToken(): Promise<{ rawToken: string } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const db = getDb();
  const userId = session.user.id;

  // Delete existing tokens for this user
  await db.execute({
    sql: "DELETE FROM oauth_tokens WHERE user_id = ?",
    args: [userId],
  });

  // Generate new token
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  await db.execute({
    sql: "INSERT INTO oauth_tokens (token, client_id, user_id, created_at) VALUES (?, ?, ?, ?)",
    args: [tokenHash, "manual", userId, new Date().toISOString()],
  });

  return { rawToken };
}

export async function deleteAccount(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const db = getDb();

  // ON DELETE CASCADE handles all dependent data
  await db.execute({
    sql: "DELETE FROM users WHERE id = ?",
    args: [session.user.id],
  });

  await signOut({ redirectTo: "/" });
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
