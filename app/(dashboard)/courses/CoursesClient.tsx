"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CourseStats, Session } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Props {
  initialCourses: CourseStats[];
  initialSessions: Session[];
}

function isSessionActive(session: Session): boolean {
  if (session.ended_at) return false;
  const startedAt = new Date(session.started_at);
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  return startedAt > twoHoursAgo;
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MasteryBar({ mastered, partial, seen, total }: { mastered: number; partial: number; seen: number; total: number }) {
  if (total === 0) return <div className="w-full bg-surface-container h-1 rounded-full" />;
  const masteredPct = (mastered / total) * 100;
  const partialPct = (partial / total) * 100;
  const seenPct = (seen / total) * 100;
  return (
    <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden flex">
      <div className="h-full bg-primary transition-all" style={{ width: `${masteredPct}%` }} />
      <div className="h-full bg-secondary/60 transition-all" style={{ width: `${partialPct}%` }} />
      <div className="h-full bg-outline-variant transition-all" style={{ width: `${seenPct}%` }} />
    </div>
  );
}

export function CoursesClient({ initialCourses, initialSessions }: Props) {
  const [courses, setCourses] = useState(initialCourses);
  const [sessions, setSessions] = useState(initialSessions);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/dashboard/courses");
        if (res.ok) {
          const data = await res.json();
          setCourses(data.courses);
          setSessions(data.sessions);
        }
      } catch {
        // silent — stale data is fine
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-12 max-w-7xl">
      {/* Header */}
      <section className="flex flex-col gap-1">
        <span className="uppercase tracking-[0.1em] text-[10px] font-semibold text-on-surface-variant">
          Academic Overview
        </span>
        <h2 className="text-3xl font-bold tracking-tight text-primary">Active Courses</h2>
      </section>

      {/* Course Grid */}
      {courses.length === 0 ? (
        <div className="text-on-surface-variant text-sm py-12 text-center border border-dashed border-outline-variant rounded-lg">
          No courses yet. Start a learning session in Claude to create your first course.
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              className="bg-surface-container-lowest rounded-lg p-6 flex flex-col gap-4 shadow-sm hover:ring-1 hover:ring-outline-variant transition-all block"
            >
              <div>
                <h3 className="font-bold text-lg text-primary leading-tight">{course.name}</h3>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                  {course.total} concepts · {course.session_count} sessions
                </p>
              </div>

              <MasteryBar
                mastered={course.mastered}
                partial={course.partial}
                seen={course.seen}
                total={course.total}
              />

              <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-1">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/60">
                    Mastered
                  </span>
                  <span className="text-sm font-semibold">{course.mastered}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/60">
                    Partial
                  </span>
                  <span className="text-sm font-semibold">{course.partial}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/60">
                    Unseen
                  </span>
                  <span className="text-sm font-semibold">{course.unknown}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-error/80">
                    Due Today
                  </span>
                  <span className={`text-sm font-bold ${course.due_today > 0 ? "text-error" : ""}`}>
                    {course.due_today}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </section>
      )}

      {/* Recent Sessions */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="uppercase tracking-[0.1em] text-[10px] font-semibold text-on-surface-variant">
            Activity
          </span>
          <h3 className="text-xl font-bold text-primary">Recent Sessions</h3>
        </div>

        {sessions.length === 0 ? (
          <p className="text-sm text-on-surface-variant">No sessions yet.</p>
        ) : (
          <div className="rounded-lg border border-outline-variant overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-surface-container-low hover:bg-surface-container-low">
                  <TableHead className="text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant">
                    Course
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant">
                    Started
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant">
                    Duration
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant">
                    Concepts
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => {
                  const active = isSessionActive(session);
                  return (
                    <TableRow key={session.id} className="hover:bg-surface-container-low/50">
                      <TableCell>
                        <Link
                          href={`/courses/${session.course_id}`}
                          className="font-medium text-sm text-primary hover:underline"
                        >
                          {session.course_name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-on-surface-variant">
                        {formatDate(session.started_at)}
                      </TableCell>
                      <TableCell className="text-sm text-on-surface-variant">
                        {formatDuration(session.duration_minutes)}
                      </TableCell>
                      <TableCell className="text-sm text-on-surface-variant">
                        {session.concepts_count}
                      </TableCell>
                      <TableCell>
                        {active ? (
                          <Badge className="bg-secondary/15 text-secondary border-0 text-[10px] font-bold uppercase tracking-wide">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
                            Ended
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
