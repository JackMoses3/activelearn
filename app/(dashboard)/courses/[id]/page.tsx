import { notFound } from "next/navigation";
import { getCourseById, getConceptsForCourse, getSessionsForCourse } from "@/lib/queries";
import { CourseDetailClient } from "./CourseDetailClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CourseDetailPage({ params }: Props) {
  const { id } = await params;
  const [course, concepts, sessions] = await Promise.all([
    getCourseById(id),
    getConceptsForCourse(id),
    getSessionsForCourse(id),
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
