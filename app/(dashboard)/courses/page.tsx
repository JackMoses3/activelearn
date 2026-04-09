import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getCourses, getRecentSessions } from "@/lib/queries";
import { CoursesClient } from "./CoursesClient";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [courses, sessions] = await Promise.all([
    getCourses(session.user.id),
    getRecentSessions(session.user.id, 10),
  ]);

  return (
    <div className="p-10">
      <CoursesClient initialCourses={courses} initialSessions={sessions} />
    </div>
  );
}
