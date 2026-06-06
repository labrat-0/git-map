"use client";

import { useMemo } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import { MapNodeView } from "./nodes/MapNodeView";
import type { Graph, MapNode } from "@/lib/types";

const nodeTypes = { map: MapNodeView };

const edgeOptions = {
  type: "step" as const,
  style: { stroke: "#ffffff", strokeWidth: 1 },
};

export function RepoMap({
  graph,
  selectedNodeId,
  onSelectNode,
}: {
  graph: Graph | null;
  selectedNodeId: string | null;
  onSelectNode: (node: MapNode) => void;
}) {
  const nodes = useMemo<Node[]>(
    () =>
      (graph?.nodes ?? []).map((n) => ({
        id: n.id,
        type: "map",
        position: n.position,
        data: n as unknown as Record<string, unknown>,
        selected: n.id === selectedNodeId,
        draggable: false,
      })),
    [graph, selectedNodeId],
  );

  const edges = useMemo<Edge[]>(
    () =>
      (graph?.edges ?? []).map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        ...edgeOptions,
      })),
    [graph],
  );

  const byId = useMemo(
    () => new Map((graph?.nodes ?? []).map((n) => [n.id, n])),
    [graph],
  );

  const handleNodeClick: NodeMouseHandler = (_evt, node) => {
    const mapNode = byId.get(node.id);
    if (mapNode) onSelectNode(mapNode);
  };

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={handleNodeClick}
      onlyRenderVisibleElements
      fitView
      minZoom={0.05}
      maxZoom={2}
      proOptions={{ hideAttribution: false }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable
    >
      <Background color="#1a1a1a" gap={24} size={1} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}
