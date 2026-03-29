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

// ─── Custom node component ───────────────────────────────────────────────────

interface ConceptNodeData {
  label: string;
  status: string;
  mastery_score: number;
  review_count: number;
  selected: boolean;
  [key: string]: unknown;
}

function ConceptNode({ data }: NodeProps<Node<ConceptNodeData>>) {
  const { status, mastery_score, review_count, selected } = data;

  const isMastered = status === "mastered";
  const isPartial = status === "partial";
  const isLive = status === "live";
  const isUnknown = status === "unknown";

  const bg = isMastered ? "#2b2220" : isUnknown || status === "seen" ? "#f6f4ec" : "#ffffff";

  const borderColor = selected
    ? "#5b4ac8"
    : isMastered
    ? "transparent"
    : isPartial
    ? "#5b4ac8"
    : isLive
    ? "rgba(0,255,148,0.6)"
    : "rgba(128,117,114,0.4)";

  const borderStyle = isUnknown ? "dashed" : "solid";

  const textColor = isMastered ? "#ffffff" : "#2b2220";

  const mutedColor = isMastered
    ? "rgba(255,255,255,0.45)"
    : isPartial
    ? "#5b4ac8"
    : isLive
    ? "#00b368"
    : "#807572";

  const boxShadow = selected
    ? "0 0 0 3px rgba(91,74,200,0.28), 0 2px 8px rgba(43,34,32,0.1)"
    : isMastered
    ? "0 2px 10px rgba(43,34,32,0.22), 0 1px 3px rgba(43,34,32,0.16)"
    : "0 1px 3px rgba(43,34,32,0.07)";

  const scoreLabel =
    isUnknown || mastery_score === 0
      ? "unseen"
      : `${mastery_score.toFixed(2)} · ${review_count}×`;

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ visibility: "hidden" }} />
      <div
        style={{
          background: bg,
          border: `1.5px ${borderStyle} ${borderColor}`,
          boxShadow,
          borderRadius: "6px",
          padding: "9px 13px",
          width: `${NODE_WIDTH}px`,
          position: "relative",
          cursor: "pointer",
          userSelect: "none",
          transition: "box-shadow 0.15s ease, transform 0.15s ease",
        }}
        className="hover:scale-[1.04] hover:-translate-y-px"
      >
        {isLive && (
          <div
            style={{
              position: "absolute",
              top: 8,
              right: 9,
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "#00ff94",
            }}
          />
        )}
        <div
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: textColor,
            lineHeight: 1.2,
            paddingRight: isLive ? 12 : 0,
          }}
        >
          {data.label}
        </div>
        <div
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: 8,
            color: mutedColor,
            marginTop: 3,
          }}
        >
          {scoreLabel}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ visibility: "hidden" }} />
    </>
  );
}

const nodeTypes = { concept: ConceptNode };

// ─── dagre layout ─────────────────────────────────────────────────────────────

const NODE_WIDTH = 160;
const NODE_HEIGHT = 50;

function buildGraph(concepts: ConceptMastery[]): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", ranksep: 72, nodesep: 48 });

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
            stroke: sourceMastered ? "rgba(91,74,200,0.5)" : "rgba(209,195,193,0.7)",
            strokeWidth: sourceMastered ? 1.5 : 1,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: sourceMastered ? "rgba(91,74,200,0.5)" : "rgba(209,195,193,0.7)",
            width: 9,
            height: 9,
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
        review_count: c.review_count ?? 0,
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

  useEffect(() => {
    setNodes(layoutNodes);
  }, [layoutNodes, setNodes]);

  useEffect(() => {
    setEdges(layoutEdges);
  }, [layoutEdges, setEdges]);

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
      <div className="h-full bg-surface-container-lowest rounded-xl flex flex-col items-center justify-center gap-3"
        style={{ border: "1px solid rgba(209,195,193,0.25)" }}>
        <span className="material-symbols-outlined text-on-surface-variant/30 text-3xl">account_tree</span>
        <div className="text-center">
          <p className="text-sm font-semibold text-on-surface-variant/60">No concepts mapped yet</p>
          <p className="text-xs text-on-surface-variant/40 mt-1">
            Say{" "}
            <span style={{ fontFamily: "'Geist Mono', monospace" }} className="bg-surface-container px-1.5 py-0.5 rounded text-[10px]">
              map this
            </span>{" "}
            in Claude with your notes attached
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full rounded-xl overflow-hidden shadow-sm relative"
      style={{ background: "#ffffff", border: "1px solid rgba(209,195,193,0.2)" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.28 }}
        minZoom={0.25}
        maxZoom={2}
        attributionPosition="bottom-right"
        proOptions={{ hideAttribution: false }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#d1c3c1"
          style={{ opacity: 0.4 }}
        />
        <Controls
          showInteractive={false}
          className="bg-surface-container-lowest! border-outline-variant/20! shadow-sm!"
        />
      </ReactFlow>

      {/* Legend */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-4 px-3 py-2 rounded-md"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", border: "1px solid rgba(209,195,193,0.2)" }}>
        {(
          [
            { label: "Mastered", bg: "#2b2220", border: "transparent", dash: false },
            { label: "Partial", bg: "#ffffff", border: "#5b4ac8", dash: false },
            { label: "Seen", bg: "#f6f4ec", border: "rgba(128,117,114,0.5)", dash: false },
            { label: "Unknown", bg: "#f6f4ec", border: "rgba(128,117,114,0.35)", dash: true },
          ] as const
        ).map(({ label, bg, border, dash }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div
              style={{
                width: 22,
                height: 13,
                borderRadius: 3,
                background: bg,
                border: `1.5px ${dash ? "dashed" : "solid"} ${border}`,
                flexShrink: 0,
              }}
            />
            <span
              className="text-[9px] uppercase font-semibold text-on-surface-variant tracking-wider"
              style={{ fontFamily: "'Geist Mono', monospace" }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
