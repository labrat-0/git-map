import { describe, expect, it } from "vitest";
import { layoutGraph, NODE_WIDTH, NODE_HEIGHT } from "./layout";
import type { MapEdge, MapNode } from "./types";

function node(id: string): MapNode {
  return {
    id,
    kind: "commit",
    shas: [id],
    label: id,
    summary: "",
    author: null,
    authorLogin: null,
    date: null,
    branches: [],
    tags: [],
    ahead: null,
    behind: null,
    position: { x: 0, y: 0 },
  };
}

describe("layoutGraph", () => {
  it("assigns integer positions to every node", () => {
    const nodes = [node("a"), node("b")];
    const edges: MapEdge[] = [{ id: "a->b", source: "a", target: "b" }];
    const out = layoutGraph(nodes, edges);

    expect(out).toHaveLength(2);
    for (const n of out) {
      expect(Number.isInteger(n.position.x)).toBe(true);
      expect(Number.isInteger(n.position.y)).toBe(true);
    }
  });

  it("places the child (source) above the parent (target) in TB layout", () => {
    const nodes = [node("child"), node("parent")];
    const edges: MapEdge[] = [
      { id: "child->parent", source: "child", target: "parent" },
    ];
    const out = layoutGraph(nodes, edges);
    const child = out.find((n) => n.id === "child")!;
    const parent = out.find((n) => n.id === "parent")!;
    expect(child.position.y).toBeLessThan(parent.position.y);
  });

  it("does not mutate the input nodes", () => {
    const nodes = [node("a")];
    layoutGraph(nodes, []);
    expect(nodes[0].position).toEqual({ x: 0, y: 0 });
  });

  it("exposes stable node dimensions", () => {
    expect(NODE_WIDTH).toBe(220);
    expect(NODE_HEIGHT).toBe(88);
  });
});
