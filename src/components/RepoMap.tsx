"use client";

import { forwardRef, useImperativeHandle, useMemo } from "react";
import {
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import { MapNodeView } from "./nodes/MapNodeView";
import { MapContext } from "./nodes/MapContext";
import { NeonFlowEdge } from "./edges/NeonFlowEdge";
import { ParticleField } from "./ParticleField";
import type { Graph, MapNode } from "@/lib/types";
import { NODE_WIDTH, NODE_HEIGHT } from "@/lib/layout";

const nodeTypes = { map: MapNodeView };
const edgeTypes = { neonFlow: NeonFlowEdge };

const edgeOptions = {
  type: "neonFlow" as const,
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
      edgeTypes={edgeTypes}
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
      <ParticleField
        nodeCount={12}
        edgeAlphaScale={0.45}
        nodeAlphaFill={0.07}
        nodeAlphaRing={0.09}
        speedScale={0.55}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 0 }}
      />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}

export const RepoMap = forwardRef<RepoMapHandle, RepoMapProps>(
  function RepoMap(props, ref) {
    return (
      <MapContext.Provider
        value={{ owner: props.graph?.owner ?? "", repo: props.graph?.repo ?? "" }}
      >
        <ReactFlowProvider>
          <RepoMapInner {...props} handleRef={ref} />
        </ReactFlowProvider>
      </MapContext.Provider>
    );
  },
);
