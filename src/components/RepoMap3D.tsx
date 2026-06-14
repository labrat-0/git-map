"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import ForceGraph3D, {
  type ForceGraphMethods,
  type NodeObject,
} from "react-force-graph-3d";
import SpriteText from "three-spritetext";
import * as THREE from "three";
import type { Graph, MapNode } from "@/lib/types";
import type { RepoMapHandle } from "./RepoMap";

/** A force-graph node carries the full MapNode plus the default-branch flag. */
type FgNode = NodeObject<MapNode & { onSpine: boolean }>;

const NEON = "#00ff41";

// Palette by node kind. Spine (default branch) gets a brighter base.
const KIND_COLOR: Record<MapNode["kind"], string> = {
  commit: "#1ea34a",
  run: "#2fd866",
  merge: "#ffb020",
  branch: "#5ad7ff",
};

interface RepoMap3DProps {
  graph: Graph | null;
  selectedNodeId: string | null;
  onSelectNode: (node: MapNode) => void;
}

function RepoMap3DInner(
  { graph, selectedNodeId, onSelectNode }: RepoMap3DProps,
  ref: React.ForwardedRef<RepoMapHandle>,
) {
  const fgRef = useRef<ForceGraphMethods<FgNode> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // Build force-graph data from the git graph. Positions from Dagre are ignored;
  // the d3-force simulation computes its own 3D layout.
  const data = useMemo(() => {
    if (!graph) return { nodes: [] as FgNode[], links: [] };
    const nodes: FgNode[] = graph.nodes.map((n) => ({
      ...n,
      onSpine: n.branches.includes(graph.defaultBranch),
    }));
    const links = graph.edges.map((e) => ({ source: e.source, target: e.target }));
    return { nodes, links };
  }, [graph]);

  // Live node lookup for camera fly-to (objects gain x/y/z once the sim runs).
  const nodeById = useMemo(() => {
    const m = new Map<string, FgNode>();
    for (const n of data.nodes) m.set(n.id, n);
    return m;
  }, [data]);

  // Measure the container so the canvas fills it (force-graph needs explicit px).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setSize({ width: Math.round(r.width), height: Math.round(r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Gentle auto-orbit (orbit controls), disabled for reduced-motion users.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    const controls = fg.controls() as {
      autoRotate?: boolean;
      autoRotateSpeed?: number;
    };
    controls.autoRotate = !reducedMotion;
    controls.autoRotateSpeed = 0.6;
  }, [reducedMotion, size.width]);

  const nodeColor = useCallback(
    (n: FgNode) => {
      if (n.id === selectedNodeId) return "#ffffff";
      if (n.onSpine) return NEON;
      return KIND_COLOR[n.kind] ?? KIND_COLOR.commit;
    },
    [selectedNodeId],
  );

  // Size scales with commit weight; selected + spine nodes read larger.
  const nodeVal = useCallback(
    (n: FgNode) => {
      const base = 1 + Math.log2(n.shas.length + 1);
      const boost = (n.id === selectedNodeId ? 2.5 : 1) * (n.onSpine ? 1.4 : 1);
      return base * boost;
    },
    [selectedNodeId],
  );

  // Branch tips and the selected node get a floating label sprite over the sphere.
  const nodeThreeObject = useCallback(
    (n: FgNode) => {
      const isSelected = n.id === selectedNodeId;
      const showLabel = n.branches.length > 0 || isSelected;
      if (!showLabel) return undefined as unknown as THREE.Object3D;
      const text =
        n.branches.length > 0 ? n.branches.join(" • ") : n.label;
      const sprite = new SpriteText(text);
      sprite.color = isSelected ? "#ffffff" : "#aef5c2";
      sprite.backgroundColor = "rgba(0,0,0,0.55)";
      sprite.padding = 2;
      sprite.borderRadius = 3;
      sprite.textHeight = n.branches.length > 0 ? 5 : 4;
      sprite.position.set(0, 7, 0);
      return sprite;
    },
    [selectedNodeId],
  );

  useImperativeHandle(
    ref,
    () => ({
      flyTo() {
        // Legacy {x,y} signature unused in 3D; kept for type compat. Use flyToId.
      },
      flyToId(id: string) {
        const fg = fgRef.current;
        const node = nodeById.get(id) as
          | (FgNode & { x?: number; y?: number; z?: number })
          | undefined;
        if (!fg || !node || node.x == null) return;
        const dist = 120;
        const ratio = 1 + dist / Math.hypot(node.x, node.y || 0.001, node.z || 0);
        fg.cameraPosition(
          { x: node.x * ratio, y: (node.y ?? 0) * ratio, z: (node.z ?? 0) * ratio },
          { x: node.x, y: node.y ?? 0, z: node.z ?? 0 },
          600,
        );
      },
      fitAll() {
        fgRef.current?.zoomToFit(500, 60);
      },
    }),
    [nodeById],
  );

  return (
    <div ref={containerRef} className="absolute inset-0 h-full w-full">
      {size.width > 0 && (
        <ForceGraph3D<FgNode>
          ref={fgRef}
          width={size.width}
          height={size.height}
          graphData={data}
          backgroundColor="#000000"
          controlType="orbit"
          showNavInfo={false}
          nodeRelSize={4}
          nodeOpacity={0.92}
          nodeResolution={12}
          nodeColor={nodeColor}
          nodeVal={nodeVal}
          nodeThreeObject={nodeThreeObject}
          nodeThreeObjectExtend
          nodeLabel={(n: FgNode) => `${n.label} — ${n.summary || n.kind}`}
          linkColor={() => NEON}
          linkOpacity={0.38}
          linkWidth={0.6}
          linkDirectionalParticles={reducedMotion ? 0 : 2}
          linkDirectionalParticleWidth={1.4}
          linkDirectionalParticleSpeed={0.006}
          linkDirectionalParticleColor={() => NEON}
          warmupTicks={40}
          cooldownTicks={120}
          onNodeClick={(n: FgNode) => onSelectNode(n as unknown as MapNode)}
        />
      )}
    </div>
  );
}

export const RepoMap3D = forwardRef<RepoMapHandle, RepoMap3DProps>(RepoMap3DInner);
export default RepoMap3D;
