import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCourseById, getConceptsForCourse, getSessionsForCourse } from "@/lib/queries";
import { CourseDetailClient } from "./CourseDetailClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CourseDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const userId = session.user.id;

  const [course, concepts, sessions] = await Promise.all([
    getCourseById(id, userId),
    getConceptsForCourse(id, userId),
    getSessionsForCourse(id, userId),
  ]);

  if (!course) notFound();

  return (
    <CourseDetailClient
      course={course}
      initialConcepts={concepts}
      initialSessions={sessions}
    />
  );
}
