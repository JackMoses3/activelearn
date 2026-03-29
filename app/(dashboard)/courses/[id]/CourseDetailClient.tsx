"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConceptMap } from "./ConceptMap";
import { ConceptPanel } from "./ConceptPanel";
import { SessionsTab } from "./SessionsTab";
import { ConceptMastery, Session } from "@/lib/queries";

interface Props {
  course: { id: string; name: string };
  initialConcepts: ConceptMastery[];
  initialSessions: Session[];
}

export function CourseDetailClient({ course, initialConcepts, initialSessions }: Props) {
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const concepts = initialConcepts;
  const sessions = initialSessions;

  const selectedConcept = selectedConceptId
    ? concepts.find((c) => c.concept_id === selectedConceptId) ?? null
    : null;

  return (
    <div className="flex flex-col gap-6 max-w-full">
      {/* Course header */}
      <div className="flex flex-col gap-1">
        <span className="uppercase tracking-[0.1em] text-[10px] font-semibold text-on-surface-variant">
          Course
        </span>
        <h2 className="text-3xl font-bold tracking-tight text-primary">{course.name}</h2>
        <p className="text-sm text-on-surface-variant">
          {concepts.length} concepts · {sessions.length} sessions
        </p>
      </div>

      <Tabs defaultValue="map">
        <TabsList className="bg-surface-container-low">
          <TabsTrigger value="map">Concept Map</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="mt-4">
          <div className="flex flex-col gap-4">
            <div className="w-full h-[50vh] min-h-100">
              <ConceptMap
                concepts={concepts}
                selectedConceptId={selectedConceptId}
                onSelectConcept={setSelectedConceptId}
              />
            </div>
            {selectedConcept && (
              <ConceptPanel
                courseId={course.id}
                concept={selectedConcept}
                allConcepts={concepts}
                onClose={() => setSelectedConceptId(null)}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="mt-4">
          <SessionsTab sessions={sessions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
