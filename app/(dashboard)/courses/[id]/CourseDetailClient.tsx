"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConceptMap } from "./ConceptMap";
import { ConceptPanel } from "./ConceptPanel";
import { SessionsTab } from "./SessionsTab";
import { AssessmentsTab } from "./AssessmentsTab";
import { ConceptMastery, Session, Assessment } from "@/lib/queries";

interface Props {
  course: { id: string; name: string };
  initialConcepts: ConceptMastery[];
  initialSessions: Session[];
  initialAssessments: Assessment[];
}

export function CourseDetailClient({ course, initialConcepts, initialSessions, initialAssessments }: Props) {
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [concepts, setConcepts] = useState(initialConcepts);
  const [assessments, setAssessments] = useState(initialAssessments);
  const sessions = initialSessions;

  // Poll for updated concept mastery + assessments every 30s
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [conceptsRes, assessmentsRes] = await Promise.all([
          fetch(`/api/dashboard/courses/${course.id}`),
          fetch(`/api/dashboard/courses/${course.id}/assessments`),
        ]);
        if (conceptsRes.ok) {
          const data = await conceptsRes.json();
          setConcepts(data.concepts);
        }
        if (assessmentsRes.ok) {
          const data = await assessmentsRes.json();
          setAssessments(data.assessments);
        }
      } catch {
        // silent — stale data is fine
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [course.id]);

  const selectedConcept = selectedConceptId
    ? concepts.find((c) => c.concept_id === selectedConceptId) ?? null
    : null;

  return (
    <div className="flex flex-col h-full overflow-hidden pt-6 px-8">
      {/* Course header */}
      <div className="flex flex-col gap-1 shrink-0 pb-4">
        <span className="uppercase tracking-widest text-[10px] font-semibold text-on-surface-variant">
          Course
        </span>
        <h2 className="text-3xl font-bold tracking-tight text-primary">{course.name}</h2>
        <p className="text-sm text-on-surface-variant">
          {concepts.length} concepts · {sessions.length} sessions
        </p>
      </div>

      <Tabs defaultValue="map" className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <TabsList className="bg-surface-container-low shrink-0 justify-start w-full">
          <TabsTrigger value="map">Concept Map</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="flex-1 min-h-0 overflow-hidden mt-4 pb-6">
          <div className="flex flex-row gap-4 h-full">
            <div className="flex-1 min-w-0">
              <ConceptMap
                concepts={concepts}
                selectedConceptId={selectedConceptId}
                onSelectConcept={setSelectedConceptId}
              />
            </div>
            {selectedConcept && (
              <div className="w-96 shrink-0 h-full overflow-y-auto border-l border-outline-variant pl-4">
                <ConceptPanel
                  courseId={course.id}
                  concept={selectedConcept}
                  allConcepts={concepts}
                  onClose={() => setSelectedConceptId(null)}
                />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="flex-1 min-h-0 overflow-y-auto mt-4">
          <SessionsTab sessions={sessions} />
        </TabsContent>

        <TabsContent value="assessments" className="flex-1 min-h-0 overflow-y-auto mt-4">
          <AssessmentsTab assessments={assessments} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
