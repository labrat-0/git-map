"use client";

import { forwardRef, useImperativeHandle, useMemo } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import { MapNodeView } from "./nodes/MapNodeView";
import type { Graph, MapNode } from "@/lib/types";
import { NODE_WIDTH, NODE_HEIGHT } from "@/lib/layout";

const nodeTypes = { map: MapNodeView };

const edgeOptions = {
  type: "step" as const,
  style: { stroke: "#ffffff", strokeWidth: 1 },
};

export interface RepoMapHandle {
  flyTo(position: { x: number; y: number }): void;
  fitAll(): void;
}

interface RepoMapProps {
  graph: Graph | null;
  selectedNodeId: string | null;
  onSelectNode: (node: MapNode) => void;
  jumpLabels?: Map<string, string>;
}

// Inner component: rendered inside ReactFlowProvider so useReactFlow() works.
function RepoMapInner({
  graph,
  selectedNodeId,
  onSelectNode,
  jumpLabels,
  handleRef,
}: RepoMapProps & { handleRef: React.ForwardedRef<RepoMapHandle> }) {
  const { setCenter, fitView } = useReactFlow();

  useImperativeHandle(handleRef, () => ({
    flyTo(position) {
      setCenter(
        position.x + NODE_WIDTH / 2,
        position.y + NODE_HEIGHT / 2,
        { zoom: 1.2, duration: 500 },
      );
    },
    fitAll() {
      fitView({ duration: 400 });
    },
  }));

  const nodes = useMemo<Node[]>(
    () =>
      (graph?.nodes ?? []).map((n) => ({
        id: n.id,
        type: "map",
        position: n.position,
        data: {
          ...(n as unknown as Record<string, unknown>),
          jumpLabel: jumpLabels?.get(n.id),
        },
        selected: n.id === selectedNodeId,
        draggable: false,
      })),
    [graph, selectedNodeId, jumpLabels],
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

export const RepoMap = forwardRef<RepoMapHandle, RepoMapProps>(
  function RepoMap(props, ref) {
    return (
      <ReactFlowProvider>
        <RepoMapInner {...props} handleRef={ref} />
      </ReactFlowProvider>
    );
  },
);
