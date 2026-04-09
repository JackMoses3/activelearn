import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { SettingsClient } from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const db = getDb();
  const userId = session.user.id;

  // Get user profile
  const userResult = await db.execute({
    sql: "SELECT id, name, email, image FROM users WHERE id = ?",
    args: [userId],
  });
  const user = userResult.rows[0];

  return (
    <div className="p-10 max-w-2xl">
      <SettingsClient
        user={{
          id: user.id as string,
          name: (user.name as string) ?? null,
          email: user.email as string,
          image: (user.image as string) ?? null,
        }}
      />
    </div>
  );
}
