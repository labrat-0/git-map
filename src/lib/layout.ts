import dagre from "@dagrejs/dagre";
import type { MapEdge, MapNode } from "./types";

export const NODE_WIDTH = 220;
export const NODE_HEIGHT = 64;

/**
 * Run dagre top-down (newer commits on top) and write integer positions back
 * onto the nodes. Integer rounding keeps 1px borders crisp at fractional zoom.
 */
export function layoutGraph(nodes: MapNode[], edges: MapEdge[]): MapNode[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", nodesep: 48, ranksep: 64, marginx: 32, marginy: 32 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const n of nodes) {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const e of edges) {
    g.setEdge(e.source, e.target);
  }

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      ...n,
      position: {
        x: Math.round((pos?.x ?? 0) - NODE_WIDTH / 2),
        y: Math.round((pos?.y ?? 0) - NODE_HEIGHT / 2),
      },
    };
  });
}
