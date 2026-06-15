"use client";

import { forwardRef, useImperativeHandle, useMemo } from "react";
import {
  Controls,
  MiniMap,
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

/** Walk edges (source=child → target=parent) collecting all ancestors of `starts`. */
function collectAncestors(
  starts: string[],
  parentsOf: Map<string, string[]>,
): Set<string> {
  const seen = new Set<string>(starts);
  const queue = [...starts];
  while (queue.length) {
    const id = queue.shift()!;
    for (const p of parentsOf.get(id) ?? []) {
      if (!seen.has(p)) {
        seen.add(p);
        queue.push(p);
      }
    }
  }
  return seen;
}

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

  // child id → parent ids, for ancestry walks (spine + selection path).
  const parentsOf = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const e of graph?.edges ?? []) {
      const arr = m.get(e.source) ?? [];
      arr.push(e.target);
      m.set(e.source, arr);
    }
    return m;
  }, [graph]);

  // Default-branch ancestry = the "spine" (rendered brighter/thicker).
  const spineIds = useMemo(() => {
    if (!graph) return new Set<string>();
    const tips = graph.nodes
      .filter((n) => n.branches.includes(graph.defaultBranch))
      .map((n) => n.id);
    return collectAncestors(tips, parentsOf);
  }, [graph, parentsOf]);

  // When a node is selected, highlight its ancestor chain and dim the rest.
  const pathIds = useMemo(() => {
    if (!selectedNodeId) return null;
    return collectAncestors([selectedNodeId], parentsOf);
  }, [selectedNodeId, parentsOf]);

  const nodes = useMemo<Node[]>(
    () =>
      (graph?.nodes ?? []).map((n) => ({
        id: n.id,
        type: "map",
        position: n.position,
        data: {
          ...(n as unknown as Record<string, unknown>),
          jumpLabel: jumpLabels?.get(n.id),
          dim: pathIds ? !pathIds.has(n.id) : false,
          onSpine: spineIds.has(n.id),
        },
        selected: n.id === selectedNodeId,
        draggable: false,
      })),
    [graph, selectedNodeId, jumpLabels, pathIds, spineIds],
  );

  const edges = useMemo<Edge[]>(
    () =>
      (graph?.edges ?? []).map((e) => {
        const onSpine = spineIds.has(e.source) && spineIds.has(e.target);
        const onPath = pathIds
          ? pathIds.has(e.source) && pathIds.has(e.target)
          : false;
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          ...edgeOptions,
          data: { onSpine, onPath, dim: pathIds ? !onPath : false },
        };
      }),
    [graph, spineIds, pathIds],
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
      <MiniMap
        pannable
        zoomable
        ariaLabel="Repo map minimap"
        maskColor="rgba(0,0,0,0.7)"
        style={{
          background: "#000000",
          border: "1px solid rgba(0,255,65,0.25)",
        }}
        nodeColor={(n) =>
          (n.data as { onSpine?: boolean })?.onSpine ? "#00ff41" : "#2a7a3f"
        }
        nodeStrokeColor="#00ff41"
        nodeStrokeWidth={2}
      />
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
