"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  NodeProps,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import { ConceptMastery } from "@/lib/queries";

// ─── Mastery status → visual style ──────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string; borderStyle: string }> = {
  mastered: {
    bg: "#2b2220",
    border: "#2b2220",
    text: "#ffffff",
    borderStyle: "solid",
  },
  partial: {
    bg: "#ffffff",
    border: "#2b2220",
    text: "#2b2220",
    borderStyle: "dashed",
  },
  seen: {
    bg: "#f6f4ec",
    border: "#807572",
    text: "#4e4543",
    borderStyle: "solid",
  },
  unknown: {
    bg: "#ffffff",
    border: "#d1c3c1",
    text: "#807572",
    borderStyle: "solid",
  },
};

function getStyle(status: string) {
  return STATUS_STYLES[status] ?? STATUS_STYLES.unknown;
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
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ visibility: "hidden" }} />
      <div
        style={{
          background: style.bg,
          border: `2px ${style.borderStyle} ${style.border}`,
          color: style.text,
          outline: data.selected ? `3px solid #5b4ac8` : "none",
          outlineOffset: "2px",
        }}
        className="px-3 py-2 rounded-md text-[11px] font-semibold min-w-[100px] max-w-[160px] text-center leading-tight cursor-pointer select-none shadow-sm"
      >
        {data.label}
        {data.mastery_score > 0 && (
          <div
            style={{ color: data.status === "mastered" ? "#d3c3c0" : "#807572" }}
            className="text-[9px] font-normal mt-0.5"
          >
            {Math.round(data.mastery_score * 100)}%
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ visibility: "hidden" }} />
    </>
  );
}

const nodeTypes = { concept: ConceptNode };

// ─── dagre layout ─────────────────────────────────────────────────────────────

const NODE_WIDTH = 160;
const NODE_HEIGHT = 54;

function buildGraph(
  concepts: ConceptMastery[],
  selectedConceptId: string | null
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", ranksep: 60, nodesep: 30 });

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
        edges.push({
          id: `${prereq}->${c.concept_id}`,
          source: prereq,
          target: c.concept_id,
          style: { stroke: "#d1c3c1", strokeWidth: 1.5 },
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
        label: c.concept_id.replace(/_/g, " "),
        status: c.status,
        mastery_score: c.mastery_score,
        selected: c.concept_id === selectedConceptId,
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
    () => buildGraph(concepts, selectedConceptId),
    [concepts, selectedConceptId]
  );

  const [nodes, , onNodesChange] = useNodesState(layoutNodes);
  const [edges, , onEdgesChange] = useEdgesState(layoutEdges);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onSelectConcept(node.id === selectedConceptId ? null : node.id);
    },
    [selectedConceptId, onSelectConcept]
  );

  if (concepts.length === 0) {
    return (
      <div className="h-[500px] bg-surface-container-lowest rounded-lg border border-outline-variant flex items-center justify-center">
        <p className="text-sm text-on-surface-variant">
          No concepts imported yet. Run <code className="font-mono bg-surface-container px-1 rounded">/map this</code> in Claude, then call{" "}
          <code className="font-mono bg-surface-container px-1 rounded">import_graph</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[600px] bg-surface-container-lowest rounded-lg border border-outline-variant overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
        attributionPosition="bottom-right"
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#d1c3c1" />
        <Controls showInteractive={false} className="bg-surface-container-lowest border-outline-variant" />
      </ReactFlow>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex items-center gap-3 bg-surface-container-lowest/90 backdrop-blur-sm px-3 py-2 rounded-md border border-outline-variant">
        {Object.entries(STATUS_STYLES).map(([status, s]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div
              style={{
                background: s.bg,
                border: `2px ${s.borderStyle} ${s.border}`,
                width: 12,
                height: 12,
                borderRadius: 3,
              }}
            />
            <span className="text-[9px] uppercase font-semibold text-on-surface-variant tracking-wide">
              {status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
