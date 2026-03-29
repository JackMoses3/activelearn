"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const MONO: React.CSSProperties = { fontFamily: "'Geist Mono', monospace" };

interface Course {
  id: string;
  name: string;
  total: number;
}

interface Props {
  courses: Course[];
}

export function SideNav({ courses: initialCourses }: Props) {
  const pathname = usePathname();
  const [courses, setCourses] = useState(initialCourses);

  // Poll for new courses / updated concept counts every 30s
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/dashboard/courses");
        if (res.ok) {
          const data = await res.json();
          setCourses(
            (data.courses as { id: string; name: string; total: number }[]).map((c) => ({
              id: c.id,
              name: c.name,
              total: c.total,
            }))
          );
        }
      } catch {
        // silent — stale sidebar is fine
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside
      className="w-60 shrink-0 flex flex-col overflow-hidden"
      style={{ background: "#f6f4ec" }}
    >
      {/* Course list */}
      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-4 flex flex-col gap-0.5">
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant/50 px-1 mb-3 block"
          style={MONO}
        >
          Courses
        </span>

        {courses.length === 0 ? (
          <p className="text-[11px] text-on-surface-variant/40 px-1" style={MONO}>
            No courses yet.
          </p>
        ) : (
          courses.map((course) => {
            const active =
              pathname === `/courses/${course.id}` ||
              pathname.startsWith(`/courses/${course.id}/`);
            return (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className={`flex items-center justify-between px-3 py-2 rounded transition-colors ${
                  active
                    ? "bg-surface-container-lowest text-on-surface font-medium shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-container"
                }`}
                style={{ fontSize: 12 }}
              >
                <span className="truncate">{course.name}</span>
                {course.total > 0 && (
                  <span
                    className={`text-[9px] shrink-0 ml-2 ${
                      active ? "text-secondary font-semibold" : "text-on-surface-variant/35"
                    }`}
                    style={MONO}
                  >
                    {course.total}
                  </span>
                )}
              </Link>
            );
          })
        )}
      </div>

      {/* New Course CTA */}
      <div
        className="px-4 pb-5 pt-3"
        style={{ borderTop: "1px solid rgba(209,195,193,0.25)" }}
      >
        <Link
          href="/courses"
          className="flex items-center justify-center w-full py-2.5 rounded text-[11px] font-semibold text-on-surface-variant hover:bg-surface-container transition-colors"
          style={{
            fontFamily: "'Inter', sans-serif",
            border: "1px solid rgba(209,195,193,0.3)",
          }}
        >
          + New Course
        </Link>
      </div>
    </aside>
  );
}
