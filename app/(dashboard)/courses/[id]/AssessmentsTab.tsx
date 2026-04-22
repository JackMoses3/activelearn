"use client";

import { Assessment } from "@/lib/queries";

const MONO: React.CSSProperties = { fontFamily: "'Geist Mono', monospace" };

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(iso: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(iso + "T00:00:00");
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

function ReadinessChip({ readiness, floor }: { readiness: number | null; floor: number | null }) {
  if (readiness === null) {
    return (
      <span
        className="inline-flex text-[9px] font-semibold uppercase tracking-widest px-2 py-1 rounded-sm text-on-surface-variant/50"
        style={{ ...MONO, background: "#eae8e0" }}
      >
        --
      </span>
    );
  }

  const color = readiness >= 0.7 ? "#2b2220" : readiness >= 0.4 ? "#5b4ac8" : "#ba1a1a";
  const bg = readiness >= 0.7 ? "rgba(43,34,32,0.08)" : readiness >= 0.4 ? "rgba(91,74,200,0.12)" : "rgba(186,26,26,0.08)";

  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-flex text-[11px] font-bold px-2 py-1 rounded-sm"
        style={{ ...MONO, background: bg, color }}
      >
        {(readiness * 100).toFixed(0)}%
      </span>
      {floor !== null && (
        <span className="text-[9px] text-on-surface-variant/40" style={MONO}>
          floor {(floor * 100).toFixed(0)}%
        </span>
      )}
    </div>
  );
}

function UrgencyLabel({ days }: { days: number }) {
  if (days < 0) {
    return (
      <span className="text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-sm" style={{ ...MONO, background: "rgba(186,26,26,0.08)", color: "#ba1a1a" }}>
        Past
      </span>
    );
  }
  if (days === 0) {
    return (
      <span className="text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-sm" style={{ ...MONO, background: "rgba(186,26,26,0.12)", color: "#ba1a1a" }}>
        Today
      </span>
    );
  }
  if (days === 1) {
    return (
      <span className="text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-sm" style={{ ...MONO, background: "rgba(186,26,26,0.08)", color: "#ba1a1a" }}>
        Tomorrow
      </span>
    );
  }
  if (days <= 7) {
    return (
      <span className="text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-sm" style={{ ...MONO, background: "rgba(91,74,200,0.12)", color: "#5b4ac8" }}>
        {days} days
      </span>
    );
  }
  return (
    <span className="text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-sm text-on-surface-variant/50" style={{ ...MONO, background: "#eae8e0" }}>
      {days} days
    </span>
  );
}

export function AssessmentsTab({ assessments }: { assessments: Assessment[] }) {
  if (assessments.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center gap-2">
        <p className="text-sm text-on-surface-variant/60">No exams or deadlines.</p>
        <p className="text-[11px] text-on-surface-variant/40" style={MONO}>
          Tell Claude your course schedule to add assessments.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 max-w-3xl">
      {assessments.map((a) => {
        const days = daysUntil(a.date);
        return (
          <div
            key={a.id}
            className="bg-surface-container-lowest rounded-xl p-5 flex items-center gap-5"
            style={{ boxShadow: "0 1px 4px rgba(43,34,32,0.07)" }}
          >
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2.5">
                <span className="font-semibold text-[15px] text-primary truncate">{a.name}</span>
                <span
                  className="shrink-0 text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-sm text-on-surface-variant/50"
                  style={{ ...MONO, background: "#f0eee6" }}
                >
                  {a.type}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-on-surface-variant/70" style={MONO}>
                  {formatDate(a.date)}
                </span>
                <UrgencyLabel days={days} />
                <span className="text-[11px] text-on-surface-variant/50" style={MONO}>
                  {a.concept_ids.length} concept{a.concept_ids.length !== 1 ? "s" : ""}
                </span>
              </div>
              {a.notes && (
                <p className="text-[12px] text-on-surface-variant/50 mt-0.5">{a.notes}</p>
              )}
            </div>
            <div className="shrink-0">
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-[9px] font-semibold uppercase tracking-widest text-on-surface-variant/50" style={MONO}>
                  Readiness
                </span>
                <ReadinessChip readiness={a.readiness} floor={a.floor} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
