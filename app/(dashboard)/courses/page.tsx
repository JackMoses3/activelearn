import { getCourses, getRecentSessions } from "@/lib/queries";
import { CoursesClient } from "./CoursesClient";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const [courses, sessions] = await Promise.all([getCourses(), getRecentSessions(10)]);

  return (
    <div className="p-10">
      <CoursesClient initialCourses={courses} initialSessions={sessions} />
    </div>
  );
}
