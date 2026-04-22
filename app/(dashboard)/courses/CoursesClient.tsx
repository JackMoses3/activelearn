"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { CourseStats, Session, StudyPlanItem } from "@/lib/queries";

const MONO: React.CSSProperties = { fontFamily: "'Geist Mono', monospace" };
const DISPLAY: React.CSSProperties = { fontFamily: "'Fraunces', serif" };

interface Props {
  initialCourses: CourseStats[];
  initialSessions: Session[];
  initialStudyPlan: StudyPlanItem[];
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
  if (total === 0) return <div className="w-full bg-surface-container h-1.5 rounded-full" />;
  const masteredPct = (mastered / total) * 100;
  const partialPct = (partial / total) * 100;
  const seenPct = (seen / total) * 100;
  return (
    <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden flex">
      <div className="h-full bg-primary transition-all" style={{ width: `${masteredPct}%` }} />
      <div className="h-full bg-secondary/60 transition-all" style={{ width: `${partialPct}%` }} />
      <div className="h-full bg-outline-variant/60 transition-all" style={{ width: `${seenPct}%` }} />
    </div>
  );
}

function StudyWidget({ items }: { items: StudyPlanItem[] }) {
  if (items.length === 0) {
    return (
      <div
        className="max-w-4xl py-8 px-6 flex flex-col items-center gap-2 rounded-xl"
        style={{ background: "#f6f4ec" }}
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant/50" style={MONO}>
          No assessments yet
        </span>
        <p className="text-sm text-on-surface-variant/60 text-center">
          Ask Claude to import your syllabus to set up assessments and study plans.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl flex flex-col gap-3">
      {items.slice(0, 5).map((item, i) => (
        <Link
          key={`${item.course_id}-${item.assessment_name}-${i}`}
          href={`/courses/${item.course_id}`}
          className="bg-surface-container-lowest rounded-xl p-5 flex items-center gap-5 transition-shadow hover:shadow-md"
          style={{ boxShadow: "0 1px 4px rgba(43,34,32,0.07)" }}
        >
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[15px] text-primary truncate">{item.assessment_name}</span>
              <span
                className="shrink-0 text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-sm"
                style={{ ...MONO, background: "rgba(91,74,200,0.12)", color: "#5b4ac8" }}
              >
                {item.course_name}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-on-surface-variant/70" style={MONO}>
                {item.days_until === 1 ? "Tomorrow" : `${item.days_until} days`}
              </span>
              <span className="text-[11px] text-on-surface-variant/50" style={MONO}>
                {item.date}
              </span>
              {item.weak_concepts.length > 0 && (
                <span className="text-[11px] text-on-surface-variant/50" style={MONO}>
                  {item.weak_concepts.length} weak concept{item.weak_concepts.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-0.5 shrink-0">
            <span className="text-[9px] font-semibold uppercase tracking-widest text-on-surface-variant/50" style={MONO}>
              Readiness
            </span>
            <span
              className="text-[18px] font-bold leading-tight"
              style={{
                fontFamily: "'Geist Mono', monospace",
                color: item.readiness >= 0.7 ? "#2b2220" : item.readiness >= 0.4 ? "#5b4ac8" : "#ba1a1a",
              }}
            >
              {(item.readiness * 100).toFixed(0)}%
            </span>
            <span className="text-[9px] text-on-surface-variant/40" style={MONO}>
              floor {(item.floor * 100).toFixed(0)}%
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function CoursesClient({ initialCourses, initialSessions, initialStudyPlan }: Props) {
  const [courses, setCourses] = useState(initialCourses);
  const [sessions, setSessions] = useState(initialSessions);
  const [studyPlan, setStudyPlan] = useState(initialStudyPlan);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete(courseId: string, courseName: string) {
    if (!confirm(`Delete "${courseName}" and all its data? This cannot be undone.`)) return;
    setDeletingId(courseId);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/dashboard/courses/${courseId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
    } catch {
      setDeleteError(`Failed to delete "${courseName}". Please try again.`);
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [coursesRes, planRes] = await Promise.all([
          fetch("/api/dashboard/courses"),
          fetch("/api/dashboard/study-plan"),
        ]);
        if (coursesRes.ok) {
          const data = await coursesRes.json();
          setCourses(data.courses);
          setSessions(data.sessions);
        }
        if (planRes.ok) {
          const data = await planRes.json();
          setStudyPlan(data.plan);
        }
      } catch {
        // silent — stale data is fine
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-12">

      {/* Header */}
      <section className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant/50" style={MONO}>
          Academic Overview
        </span>
        <h2 className="text-[32px] font-bold tracking-tight text-primary leading-tight" style={DISPLAY}>
          Active Courses
        </h2>
      </section>

      {/* Study Plan Widget */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant/50" style={MONO}>
            Study Planner
          </span>
          <h3 className="text-[22px] font-bold text-primary" style={DISPLAY}>
            What to Study Today
          </h3>
        </div>
        <StudyWidget items={studyPlan} />
      </section>

      {/* Course Grid */}
      {courses.length === 0 ? (
        <div
          className="max-w-2xl py-16 flex flex-col items-center gap-3 rounded-xl"
          style={{ background: "#f6f4ec" }}
        >
          <span className="material-symbols-outlined text-on-surface-variant/30 text-3xl">school</span>
          <p className="text-sm text-on-surface-variant/60">No courses yet.</p>
          <p className="text-xs text-on-surface-variant/40" style={MONO}>
            Start a session in Claude to create your first course.
          </p>
        </div>
      ) : (
        <section className="max-w-7xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-surface-container-lowest rounded-xl flex flex-col gap-4 p-6 transition-shadow hover:shadow-md"
              style={{ boxShadow: "0 1px 4px rgba(43,34,32,0.07)" }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/courses/${course.id}`} className="hover:underline group">
                    <h3 className="font-bold text-[17px] text-primary leading-tight group-hover:text-secondary transition-colors">
                      {course.name}
                    </h3>
                  </Link>
                  <p className="text-[10px] text-on-surface-variant/50 mt-1" style={MONO}>
                    {course.total} concepts · {course.session_count} sessions
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(course.id, course.name)}
                  disabled={deletingId === course.id}
                  className="shrink-0 p-1.5 text-on-surface-variant/25 hover:text-error hover:bg-error/8 rounded transition-colors disabled:opacity-40"
                  aria-label={`Delete ${course.name}`}
                >
                  <Trash2 size={13} />
                </button>
              </div>

              <MasteryBar
                mastered={course.mastered}
                partial={course.partial}
                seen={course.seen}
                total={course.total}
              />

              <div className="grid grid-cols-3 gap-3 pt-1">
                {[
                  { label: "Mastered", value: course.mastered, color: "#2b2220" },
                  { label: "Partial", value: course.partial, color: "#5b4ac8" },
                  { label: "Unseen", value: course.unknown, color: "#807572" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-semibold uppercase tracking-widest text-on-surface-variant/50" style={MONO}>
                      {label}
                    </span>
                    <span className="text-[18px] font-bold leading-tight" style={{ color }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {deleteError && (
        <p className="text-sm text-error bg-error/8 rounded-lg px-4 py-2.5" style={{ border: "1px solid rgba(186,26,26,0.15)" }}>
          {deleteError}
        </p>
      )}

      {/* Recent Sessions */}
      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant/50" style={MONO}>
            Activity
          </span>
          <h3 className="text-[22px] font-bold text-primary" style={DISPLAY}>
            Recent Sessions
          </h3>
        </div>

        {sessions.length === 0 ? (
          <p className="text-sm text-on-surface-variant/50">No sessions yet.</p>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(209,195,193,0.3)" }}>
            {/* Header row */}
            <div
              className="grid grid-cols-5 px-4 py-2.5"
              style={{ background: "#f6f4ec", borderBottom: "1px solid rgba(209,195,193,0.3)" }}
            >
              {["Course", "Started", "Duration", "Concepts", "Status"].map((h) => (
                <span
                  key={h}
                  className="text-[9px] font-semibold uppercase tracking-widest text-on-surface-variant/50"
                  style={MONO}
                >
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            {sessions.map((session, i) => {
              const active = isSessionActive(session);
              return (
                <div
                  key={session.id}
                  className="grid grid-cols-5 px-4 py-3 items-center hover:bg-surface-container-low/60 transition-colors"
                  style={i > 0 ? { borderTop: "1px solid rgba(209,195,193,0.18)" } : undefined}
                >
                  <Link
                    href={`/courses/${session.course_id}`}
                    className="text-sm font-semibold text-primary hover:underline truncate"
                  >
                    {session.course_name}
                  </Link>
                  <span className="text-[11px] text-on-surface-variant/70" style={MONO}>
                    {formatDate(session.started_at)}
                  </span>
                  <span className="text-[11px] text-on-surface-variant/70" style={MONO}>
                    {formatDuration(session.duration_minutes)}
                  </span>
                  <span className="text-[11px] text-on-surface-variant/70" style={MONO}>
                    {session.concepts_count}
                  </span>
                  <div>
                    {active ? (
                      <span
                        className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm"
                        style={{ ...MONO, background: "rgba(0,255,148,0.12)", color: "#00b368" }}
                      >
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00ff94", display: "inline-block" }} />
                        Live
                      </span>
                    ) : (
                      <span
                        className="inline-flex text-[9px] font-semibold uppercase tracking-widest px-2 py-1 rounded-sm text-on-surface-variant/50"
                        style={{ ...MONO, background: "#f0eee6" }}
                      >
                        Ended
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
