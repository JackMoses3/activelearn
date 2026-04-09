import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { getCourses } from "@/lib/queries";
import { AppTopNav } from "@/components/AppTopNav";
import { SideNav } from "@/components/SideNav";

async function runMigrationGate(userId: string): Promise<boolean> {
  const db = getDb();

  const nullCourses = await db.execute({
    sql: "SELECT COUNT(*) as count FROM courses WHERE user_id IS NULL",
    args: [],
  });

  const nullCount = Number(nullCourses.rows[0].count);
  if (nullCount === 0) return true;

  // Check if this is the first registered user
  const userCount = await db.execute({
    sql: "SELECT COUNT(*) as count FROM users",
    args: [],
  });

  if (Number(userCount.rows[0].count) === 1) {
    // Auto-assign all NULL courses to the first (and only) user
    await db.execute({
      sql: "UPDATE courses SET user_id = ? WHERE user_id IS NULL",
      args: [userId],
    });
    // Also assign any NULL user_id tokens
    await db.execute({
      sql: "UPDATE oauth_tokens SET user_id = ? WHERE user_id IS NULL",
      args: [userId],
    });
    return true;
  }

  // Multiple users exist but there's still unassigned data
  return false;
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const migrationOk = await runMigrationGate(session.user.id);

  if (!migrationOk) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-surface">
        <AppTopNav />
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-surface-container-lowest rounded-xl p-12 text-center max-w-md">
            <h1 className="text-xl font-bold text-primary mb-3" style={{ fontFamily: "'Fraunces', serif" }}>
              Setup in progress
            </h1>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Your account is ready, but existing data is being migrated.
              Please check back shortly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const courses = await getCourses(session.user.id);
  const sidebarCourses = courses.map((c) => ({ id: c.id, name: c.name, total: c.total }));

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface">
      <AppTopNav />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <SideNav courses={sidebarCourses} />
        <main className="flex-1 min-w-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
