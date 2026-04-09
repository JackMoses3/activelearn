"use client";

import { useEffect, useState } from "react";
import { ConceptMastery, KnowledgeComponent, MasteryHistoryEntry, Misconception } from "@/lib/queries";

function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

interface Props {
  courseId: string;
  concept: ConceptMastery;
  allConcepts: ConceptMastery[];
  onClose: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  mastered: "Mastered",
  partial: "Partial",
  seen: "Seen",
  unknown: "Unseen",
};

function StarRating({ score }: { score: number | null }) {
  const filled = score !== null ? Math.round(score * 3) : 0;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className="material-symbols-outlined text-[10px] text-secondary leading-none"
          style={i <= filled ? { fontVariationSettings: '"FILL" 1' } : undefined}
        >
          star
        </span>
      ))}
    </div>
  );
}

function isOverdue(nextReview: string | null): boolean {
  if (!nextReview) return false;
  return new Date(nextReview) < new Date();
}

export function ConceptPanel({ courseId, concept, allConcepts, onClose }: Props) {
  const [history, setHistory] = useState<MasteryHistoryEntry[]>([]);
  const [kcs, setKcs] = useState<KnowledgeComponent[]>([]);
  const [misconceptions, setMisconceptions] = useState<Misconception[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    setLoadingHistory(true);
    Promise.all([
      fetch(`/api/dashboard/courses/${courseId}/concepts/${concept.concept_id}/history`).then((r) => r.json()),
      fetch(`/api/dashboard/courses/${courseId}/concepts/${concept.concept_id}/knowledge-components`).then((r) => r.json()),
      fetch(`/api/dashboard/courses/${courseId}/concepts/${concept.concept_id}/misconceptions`).then((r) => r.json()),
    ])
      .then(([histData, kcsData, miscData]) => {
        setHistory(histData);
        setKcs(kcsData);
        setMisconceptions(miscData);
      })
      .catch(() => {
        setHistory([]);
        setKcs([]);
        setMisconceptions([]);
      })
      .finally(() => setLoadingHistory(false));
  }, [courseId, concept.concept_id]);

  const overdue = isOverdue(concept.next_review);
  const statusLabel = STATUS_LABEL[concept.status] ?? "Unseen";

  let prereqs: string[] = [];
  try {
    prereqs = concept.prerequisites ? JSON.parse(concept.prerequisites) : [];
  } catch {}

  const getPrereqStatus = (id: string) =>
    allConcepts.find((c) => c.concept_id === id)?.status ?? "unknown";

  return (
    <aside className="w-full bg-surface-container-lowest rounded-xl border border-outline-variant/20 flex flex-col shadow-sm">

      {/* ── Node Header ─────────────────────────────────────────── */}
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-secondary">
              Active Node
            </span>
            <h3 className="text-xl font-bold tracking-tight text-primary leading-tight">
              {toTitleCase(concept.concept_id.replace(/_/g, " "))}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant/40 hover:text-primary transition-colors p-0.5 mt-0.5"
          >
            <span className="material-symbols-outlined text-lg leading-none">close</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {concept.bloom_level && (
            <span className="bg-secondary/10 text-secondary text-[10px] px-2 py-1 font-bold uppercase tracking-wider rounded-sm">
              {concept.bloom_level}
            </span>
          )}
          <span className="bg-surface-container-high text-on-surface-variant text-[10px] px-2 py-1 font-bold uppercase tracking-wider rounded-sm">
            Status: {statusLabel}
          </span>
        </div>
      </div>

      {/* ── Mastery + Review stats ───────────────────────────────── */}
      <div className="px-6 py-4 bg-surface-container-low border-y border-outline-variant/10 grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase font-semibold text-on-surface-variant/60 tracking-wider">
            Mastery
          </span>
          <span className="text-xl font-bold text-primary leading-none">
            {concept.mastery_score.toFixed(2)}
            <span className="text-sm text-on-surface-variant/40 font-normal">/1.0</span>
          </span>
          <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden mt-1">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${concept.mastery_score * 100}%`,
                background:
                  concept.mastery_score >= 0.8
                    ? "#2b2220"
                    : concept.mastery_score >= 0.4
                      ? "#5b4ac8"
                      : "#807572",
              }}
            />
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className={`text-[10px] uppercase font-semibold tracking-wider ${overdue ? "text-error" : "text-on-surface-variant/60"}`}>
            Review Date
          </span>
          {overdue ? (
            <>
              <span className="text-sm font-bold text-error leading-tight">Overdue</span>
              <span className="text-[10px] text-on-surface-variant/60">
                {concept.next_review}
              </span>
            </>
          ) : (
            <span className="text-sm font-medium leading-tight">
              {concept.next_review ?? "—"}
            </span>
          )}
        </div>
      </div>

      {/* ── Details ─────────────────────────────────────────────── */}
      <div className="p-6 space-y-6">

        {/* Prerequisites */}
        {prereqs.length > 0 && (
          <div className="space-y-2.5">
            <span className="text-[10px] uppercase font-bold tracking-[0.15em] text-on-surface-variant/40">
              Prerequisites
            </span>
            <div className="flex flex-wrap gap-1.5">
              {prereqs.map((prereqId) => {
                const status = getPrereqStatus(prereqId);
                const mastered = status === "mastered";
                return (
                  <span
                    key={prereqId}
                    className={`text-[10px] px-2.5 py-1 font-semibold rounded-sm flex items-center gap-1 ${
                      mastered
                        ? "bg-primary text-on-primary"
                        : "border border-outline-variant text-on-surface-variant"
                    }`}
                  >
                    {mastered && (
                      <span className="material-symbols-outlined text-[10px] leading-none">
                        check_circle
                      </span>
                    )}
                    {prereqId.replace(/_/g, " ")}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Concept Stats */}
        <div className="space-y-2.5">
          <span className="text-[10px] uppercase font-bold tracking-[0.15em] text-on-surface-variant/40">
            Concept Stats
          </span>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-surface-container-low rounded-lg">
              <p className="text-[10px] font-semibold text-on-surface-variant/60">Times Taught</p>
              <p className="text-lg font-bold text-on-surface">{concept.review_count}</p>
            </div>
            <div className="p-3 bg-surface-container-low rounded-lg">
              <p className="text-[10px] font-semibold text-on-surface-variant/60">Difficulty</p>
              <p className="text-lg font-bold text-on-surface">
                {Math.round(concept.difficulty * 100)}%
              </p>
            </div>
          </div>
        </div>

        {/* Observed Misconceptions */}
        {misconceptions.length > 0 && (
          <div className="space-y-2.5">
            <span className="text-[10px] uppercase font-bold tracking-[0.15em] text-on-surface-variant/40">
              Observed Misconceptions
            </span>
            <ul className="space-y-2">
              {misconceptions.map((m) => (
                <li key={m.id} className="flex flex-col gap-0.5">
                  <span className="text-[11px] leading-relaxed text-on-surface-variant italic border-l-2 border-error/25 pl-3">
                    &ldquo;{m.misconception_text}&rdquo;
                  </span>
                  <span className="text-[9px] text-on-surface-variant/40 pl-3">
                    {new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* What you've learned */}
        {kcs.length > 0 && (
          <div className="space-y-2.5">
            <span className="text-[10px] uppercase font-bold tracking-[0.15em] text-on-surface-variant/40">
              What you&apos;ve learned
            </span>
            <ul className="space-y-2">
              {kcs.map((kc) => (
                <li key={kc.id} className="flex flex-col gap-0.5">
                  <span className="text-[11px] leading-relaxed text-on-surface italic border-l-2 border-secondary/40 pl-3">
                    &ldquo;{kc.component_text}&rdquo;
                  </span>
                  <span className="text-[9px] text-on-surface-variant/40 pl-3">
                    {new Date(kc.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recent Sessions */}
        <div className="space-y-2.5">
          <span className="text-[10px] uppercase font-bold tracking-[0.15em] text-on-surface-variant/40">
            Recent Sessions
          </span>
          {loadingHistory ? (
            <p className="text-[11px] text-on-surface-variant/50">Loading…</p>
          ) : history.length === 0 ? (
            <p className="text-[11px] text-on-surface-variant/50">No sessions yet.</p>
          ) : (
            <div className="space-y-0.5">
              {history.slice(0, 5).map((h, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center py-2 px-3 hover:bg-surface-container-low transition-colors rounded-sm cursor-pointer"
                >
                  <div>
                    <p className="text-[11px] font-bold">
                      Session #{String(history.length - i).padStart(3, "0")}
                    </p>
                    <p className="text-[10px] text-on-surface-variant/50">{h.date}</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-0.5">
                    {h.session_score != null && (
                      <p className="text-[11px] font-bold text-secondary">
                        {Math.round(h.session_score * 100)}%
                      </p>
                    )}
                    <StarRating score={h.session_score} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </aside>
  );
}
