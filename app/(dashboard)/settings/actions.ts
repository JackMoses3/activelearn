"use server";

import { auth, signOut } from "@/auth";
import { getDb } from "@/lib/db";
import { redirect } from "next/navigation";

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
