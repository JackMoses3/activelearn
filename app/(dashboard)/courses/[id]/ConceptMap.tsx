"use client";

import { useCallback, useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  NodeProps,
  Handle,
  Position,
  MarkerType,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import { ConceptMastery } from "@/lib/queries";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Mastery status → visual style ──────────────────────────────────────────

const STATUS_STYLES: Record<
  string,
  {
    bg: string;
    border: string;
    text: string;
    mutedText: string;
    ringTrack: string;
    ringFill: string | null;
    boxShadow: string;
    selectedShadow: string;
  }
> = {
  mastered: {
    bg: "linear-gradient(135deg, #2b2220 0%, #3a2d2a 100%)",
    border: "transparent",
    text: "#ffffff",
    mutedText: "rgba(255,255,255,0.5)",
    ringTrack: "rgba(255,255,255,0.15)",
    ringFill: "#d3c3c0",
    boxShadow: "0 0 14px rgba(43,34,32,0.28), 0 2px 8px rgba(43,34,32,0.18)",
    selectedShadow: "0 0 0 2px #5b4ac8, 0 0 14px rgba(43,34,32,0.28)",
  },
  partial: {
    bg: "#ffffff",
    border: "rgba(209,195,193,0.5)",
    text: "#2b2220",
    mutedText: "#807572",
    ringTrack: "rgba(91,74,200,0.12)",
    ringFill: "#5b4ac8",
    boxShadow: "0 1px 3px rgba(43,34,32,0.08), 0 1px 2px rgba(43,34,32,0.05)",
    selectedShadow: "0 0 0 2px #5b4ac8, 0 0 0 5px rgba(91,74,200,0.15)",
  },
  seen: {
    bg: "#f6f4ec",
    border: "rgba(209,195,193,0.5)",
    text: "#4e4543",
    mutedText: "#a09896",
    ringTrack: "rgba(128,117,114,0.2)",
    ringFill: "#807572",
    boxShadow: "0 1px 3px rgba(43,34,32,0.06)",
    selectedShadow: "0 0 0 2px #5b4ac8, 0 0 0 5px rgba(91,74,200,0.15)",
  },
  unknown: {
    bg: "#fafaf8",
    border: "rgba(209,195,193,0.4)",
    text: "#b0a8a6",
    mutedText: "#c8c0be",
    ringTrack: "rgba(209,195,193,0.5)",
    ringFill: null,
    boxShadow: "0 1px 2px rgba(43,34,32,0.04)",
    selectedShadow: "0 0 0 2px #5b4ac8",
  },
};

function getStyle(status: string) {
  return STATUS_STYLES[status] ?? STATUS_STYLES.unknown;
}

// ─── Mastery ring SVG ─────────────────────────────────────────────────────────

interface MasteryRingProps {
  score: number;
  status: string;
  ringTrack: string;
  ringFill: string | null;
}

function MasteryRing({ score, status, ringTrack, ringFill }: MasteryRingProps) {
  const R = 9;
  const C = 2 * Math.PI * R; // ≈ 56.55
  const progress = C * Math.min(score, 1);
  const remaining = C - progress;

  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      className="shrink-0"
      aria-hidden="true"
    >
      {/* Track */}
      <circle
        cx="12"
        cy="12"
        r={R}
        fill="none"
        stroke={ringTrack}
        strokeWidth="2"
        strokeDasharray={status === "unknown" ? "2 3.2" : undefined}
      />
      {/* Progress arc */}
      {ringFill && score > 0 && (
        <circle
          cx="12"
          cy="12"
          r={R}
          fill="none"
          stroke={ringFill}
          strokeWidth="2"
          strokeDasharray={`${progress} ${remaining}`}
          strokeLinecap="round"
          transform="rotate(-90 12 12)"
        />
      )}
      {/* Center completion dot — only on mastered */}
      {status === "mastered" && ringFill && (
        <circle cx="12" cy="12" r="3" fill={ringFill} />
      )}
    </svg>
  );
}

// ─── Custom node component ───────────────────────────────────────────────────

interface ConceptNodeData {
  label: string;
  status: string;
  mastery_score: number;
  selected: boolean;
  [key: string]: unknown;
}

function ConceptNode({ data }: NodeProps<Node<ConceptNodeData>>) {
  const style = getStyle(data.status);
  const masteryLabel =
    data.status === "unknown"
      ? "not started"
      : `${Math.round(data.mastery_score * 100)}%`;

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ visibility: "hidden" }} />
      <div
        style={{
          background: style.bg,
          border: `1px solid ${data.selected ? "#5b4ac8" : style.border}`,
          boxShadow: data.selected ? style.selectedShadow : style.boxShadow,
        }}
        className="relative rounded-xl overflow-hidden cursor-pointer select-none transition-all duration-200 hover:scale-[1.04] hover:-translate-y-px"
      >
        <div className="px-3 py-2.5 flex items-center gap-2.5 min-w-37.5 max-w-48.75">
          <MasteryRing
            score={data.mastery_score}
            status={data.status}
            ringTrack={style.ringTrack}
            ringFill={style.ringFill}
          />
          <div className="flex-1 min-w-0">
            <div
              className="text-[11px] font-bold leading-tight truncate"
              style={{ color: style.text }}
            >
              {data.label}
            </div>
            <div
              className="text-[9px] mt-0.5 font-medium uppercase tracking-wider"
              style={{ color: style.mutedText }}
            >
              {masteryLabel}
            </div>
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ visibility: "hidden" }} />
    </>
  );
}

const nodeTypes = { concept: ConceptNode };

// ─── dagre layout ─────────────────────────────────────────────────────────────

const NODE_WIDTH = 200;
const NODE_HEIGHT = 62;

function buildGraph(concepts: ConceptMastery[]): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", ranksep: 72, nodesep: 36 });

  const conceptMap = new Map(concepts.map((c) => [c.concept_id, c]));

  for (const c of concepts) {
    g.setNode(c.concept_id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  const edges: Edge[] = [];
  for (const c of concepts) {
    if (!c.prerequisites) continue;
    let prereqs: string[] = [];
    try {
      prereqs = JSON.parse(c.prerequisites);
    } catch {
      continue;
    }
    for (const prereq of prereqs) {
      if (g.hasNode(prereq)) {
        g.setEdge(prereq, c.concept_id);
        const sourceMastered = conceptMap.get(prereq)?.status === "mastered";
        edges.push({
          id: `${prereq}->${c.concept_id}`,
          source: prereq,
          target: c.concept_id,
          style: {
            stroke: sourceMastered
              ? "rgba(91,74,200,0.55)"
              : "rgba(209,195,193,0.8)",
            strokeWidth: sourceMastered ? 2 : 1.5,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: sourceMastered
              ? "rgba(91,74,200,0.55)"
              : "rgba(209,195,193,0.8)",
            width: 10,
            height: 10,
          },
          animated: false,
        });
      }
    }
  }

  dagre.layout(g);

  const nodes: Node[] = concepts.map((c) => {
    const pos = g.node(c.concept_id);
    return {
      id: c.concept_id,
      type: "concept",
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      data: {
        label: toTitleCase(c.concept_id.replace(/_/g, " ")),
        status: c.status,
        mastery_score: c.mastery_score,
        selected: false,
      },
    };
  });

  return { nodes, edges };
}

// ─── ConceptMap component ─────────────────────────────────────────────────────

interface Props {
  concepts: ConceptMastery[];
  selectedConceptId: string | null;
  onSelectConcept: (id: string | null) => void;
}

export function ConceptMap({ concepts, selectedConceptId, onSelectConcept }: Props) {
  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(
    () => buildGraph(concepts),
    [concepts]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  // Sync when concepts change
  useEffect(() => {
    setNodes(layoutNodes);
  }, [layoutNodes, setNodes]);

  useEffect(() => {
    setEdges(layoutEdges);
  }, [layoutEdges, setEdges]);

  // Update selected state without re-running dagre
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, selected: n.id === selectedConceptId },
      }))
    );
  }, [selectedConceptId, setNodes]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onSelectConcept(node.id === selectedConceptId ? null : node.id);
    },
    [selectedConceptId, onSelectConcept]
  );

  if (concepts.length === 0) {
    return (
      <div className="h-125 bg-surface-container-lowest rounded-xl border border-outline-variant/30 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center">
          <span className="material-symbols-outlined text-on-surface-variant/40 text-xl">
            account_tree
          </span>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-on-surface-variant">
            No concepts mapped yet
          </p>
          <p className="text-xs text-on-surface-variant/50 mt-0.5">
            Run{" "}
            <code className="font-mono bg-surface-container px-1.5 py-0.5 rounded">
              /map this
            </code>{" "}
            in Claude, then call{" "}
            <code className="font-mono bg-surface-container px-1.5 py-0.5 rounded">
              import_graph
            </code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-150 bg-surface-container-lowest rounded-xl border border-outline-variant/20 overflow-hidden shadow-sm relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.25}
        maxZoom={2}
        attributionPosition="bottom-right"
        proOptions={{ hideAttribution: false }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1}
          color="#d1c3c1"
          style={{ opacity: 0.5 }}
        />
        <Controls
          showInteractive={false}
          className="bg-surface-container-lowest! border-outline-variant/30! shadow-sm!"
        />
      </ReactFlow>

      {/* Legend */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-5 bg-surface-container-lowest/90 backdrop-blur-md px-4 py-2.5 rounded-lg border border-outline-variant/15 shadow-sm">
        {(
          [
            { status: "mastered", label: "Mastered", fill: "#2b2220" },
            { status: "partial", label: "Partial", fill: "#5b4ac8" },
            { status: "seen", label: "Seen", fill: "#807572" },
            { status: "unknown", label: "Unknown", fill: null },
          ] as const
        ).map(({ status, label, fill }) => (
          <div key={status} className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <circle
                cx="7" cy="7" r="5"
                fill="none"
                stroke={fill ?? "#d1c3c1"}
                strokeWidth="1.5"
                strokeDasharray={status === "unknown" ? "2 2" : undefined}
                opacity={fill ? 1 : 0.6}
              />
              {status === "mastered" && (
                <circle cx="7" cy="7" r="2" fill="#2b2220" />
              )}
            </svg>
            <span className="text-[9px] uppercase font-semibold text-on-surface-variant tracking-wider">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
