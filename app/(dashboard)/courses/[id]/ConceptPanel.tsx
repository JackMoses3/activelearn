"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConceptMastery, MasteryHistoryEntry } from "@/lib/queries";

interface Props {
  courseId: string;
  concept: ConceptMastery;
  allConcepts: ConceptMastery[];
  onClose: () => void;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  mastered: { label: "Mastered", color: "bg-primary text-on-primary" },
  partial: { label: "Partial", color: "bg-secondary/15 text-secondary border border-secondary/30" },
  seen: { label: "Seen", color: "bg-surface-container text-on-surface-variant border border-outline-variant" },
  unknown: { label: "Unseen", color: "bg-surface-container text-on-surface-variant border border-outline-variant" },
};

const RATING_LABELS: Record<string, string> = {
  again: "Again",
  hard: "Hard",
  good: "Good",
  easy: "Easy",
};

function isOverdue(nextReview: string | null): boolean {
  if (!nextReview) return false;
  return new Date(nextReview) < new Date();
}

export function ConceptPanel({ courseId, concept, allConcepts, onClose }: Props) {
  const [history, setHistory] = useState<MasteryHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    setLoadingHistory(true);
    fetch(`/api/dashboard/courses/${courseId}/concepts/${concept.concept_id}/history`)
      .then((r) => r.json())
      .then((data) => setHistory(data))
      .catch(() => setHistory([]))
      .finally(() => setLoadingHistory(false));
  }, [courseId, concept.concept_id]);

  const statusInfo = STATUS_LABEL[concept.status] ?? STATUS_LABEL.unknown;
  const overdue = isOverdue(concept.next_review);

  let prereqs: string[] = [];
  try {
    prereqs = concept.prerequisites ? JSON.parse(concept.prerequisites) : [];
  } catch {}

  let misconceptions: string[] = [];
  try {
    misconceptions = concept.misconceptions ? JSON.parse(concept.misconceptions) : [];
  } catch {}

  const getPrereqStatus = (id: string) =>
    allConcepts.find((c) => c.concept_id === id)?.status ?? "unknown";

  const prereqStatusColors: Record<string, string> = {
    mastered: "bg-primary text-on-primary",
    partial: "bg-secondary/15 text-secondary",
    seen: "bg-surface-container text-on-surface-variant",
    unknown: "bg-surface-container text-on-surface-variant border border-outline-variant",
  };

  return (
    <aside className="w-80 shrink-0 bg-surface-container-lowest rounded-lg border border-outline-variant p-5 flex flex-col gap-4 self-start sticky top-24">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <h3 className="font-bold text-base text-primary leading-tight">
            {concept.concept_id.replace(/_/g, " ")}
          </h3>
          {concept.bloom_level && (
            <span className="text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant">
              {concept.bloom_level}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="shrink-0 p-1 hover:bg-surface-container rounded text-on-surface-variant"
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      </div>

      {/* Status + mastery */}
      <div className="flex items-center gap-2">
        <Badge className={`text-[10px] font-bold uppercase tracking-wide border-0 ${statusInfo.color}`}>
          {statusInfo.label}
        </Badge>
        <span className="text-sm font-semibold text-on-surface">
          {Math.round(concept.mastery_score * 100)}%
        </span>
      </div>

      {/* Mastery bar */}
      <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${concept.mastery_score * 100}%` }}
        />
      </div>

      {/* Review info */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-widest font-bold text-on-surface-variant/60">
            Last Review
          </span>
          <span className="text-xs font-medium">{concept.last_review ?? "—"}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-widest font-bold text-on-surface-variant/60">
            Next Review
          </span>
          <span className={`text-xs font-medium ${overdue ? "text-error font-bold" : ""}`}>
            {concept.next_review ?? "—"}
            {overdue && (
              <span className="material-symbols-outlined text-[11px] ml-0.5 align-middle">warning</span>
            )}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-widest font-bold text-on-surface-variant/60">
            Times Taught
          </span>
          <span className="text-xs font-medium">{concept.review_count}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-widest font-bold text-on-surface-variant/60">
            Difficulty
          </span>
          <span className="text-xs font-medium">{Math.round(concept.difficulty * 100)}%</span>
        </div>
      </div>

      {/* Prerequisites */}
      {prereqs.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] uppercase tracking-widest font-bold text-on-surface-variant/60">
            Prerequisites
          </span>
          <div className="flex flex-wrap gap-1.5">
            {prereqs.map((prereqId) => {
              const status = getPrereqStatus(prereqId);
              return (
                <span
                  key={prereqId}
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${prereqStatusColors[status] ?? prereqStatusColors.unknown}`}
                >
                  {prereqId.replace(/_/g, " ")}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Misconceptions */}
      {misconceptions.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] uppercase tracking-widest font-bold text-on-surface-variant/60">
            Known Misconceptions
          </span>
          <ul className="flex flex-col gap-1">
            {misconceptions.map((m, i) => (
              <li key={i} className="text-xs text-on-surface-variant flex gap-1.5">
                <span className="text-error shrink-0">·</span>
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Session history */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[9px] uppercase tracking-widest font-bold text-on-surface-variant/60">
          Session History
        </span>
        {loadingHistory ? (
          <p className="text-xs text-on-surface-variant">Loading…</p>
        ) : history.length === 0 ? (
          <p className="text-xs text-on-surface-variant">No sessions yet.</p>
        ) : (
          <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
            {history.map((h, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-on-surface-variant">{h.date}</span>
                <div className="flex items-center gap-2">
                  {h.session_score != null && (
                    <span className="font-semibold">{Math.round(h.session_score * 100)}%</span>
                  )}
                  {h.rating && (
                    <span className="text-[10px] uppercase font-bold tracking-wide text-on-surface-variant/60">
                      {RATING_LABELS[h.rating] ?? h.rating}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Copy course name button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs"
        onClick={() => navigator.clipboard.writeText(concept.concept_id.replace(/_/g, " "))}
      >
        <span className="material-symbols-outlined text-sm mr-1.5">content_copy</span>
        Copy concept name
      </Button>
    </aside>
  );
}
