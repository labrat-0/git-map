import { describe, expect, it } from "vitest";
import { buildGraph, type RawBranch, type RawCommit } from "./graph";

/** Helper: build a RawCommit with sensible defaults. */
function c(sha: string, parents: string[] = []): RawCommit {
  return {
    sha,
    parents,
    message: `msg ${sha}`,
    author: "alice",
    authorLogin: "alice",
    date: `2026-01-${sha.length.toString().padStart(2, "0")}T00:00:00Z`,
  };
}

describe("buildGraph", () => {
  it("collapses a linear chain into a single run node", () => {
    // head <- a <- b <- root  (head & root are tips/ends, a & b are linear)
    const commits = [
      c("head", ["a"]),
      c("a", ["b"]),
      c("b", ["root"]),
      c("root", []),
    ];
    const branches: RawBranch[] = [{ name: "main", sha: "head" }];
    const { nodes } = buildGraph(commits, branches);

    const runs = nodes.filter((n) => n.kind === "run");
    // a and b are interior linear commits -> exactly one run holding both.
    expect(runs).toHaveLength(1);
    expect(runs[0].shas.sort()).toEqual(["a", "b"]);
    expect(runs[0].label).toBe("2 commits");
  });

  it("keeps a merge commit (2 parents) as a discrete merge node", () => {
    const commits = [
      c("m", ["p1", "p2"]),
      c("p1", ["root"]),
      c("p2", ["root"]),
      c("root", []),
    ];
    const branches: RawBranch[] = [{ name: "main", sha: "m" }];
    const { nodes } = buildGraph(commits, branches);

    const merge = nodes.find((n) => n.id === "m");
    expect(merge?.kind).toBe("merge");
  });

  it("marks branch tips and exposes their branch names", () => {
    const commits = [c("tip", ["root"]), c("root", [])];
    const branches: RawBranch[] = [{ name: "feature", sha: "tip" }];
    const { nodes } = buildGraph(commits, branches);

    const tip = nodes.find((n) => n.id === "tip");
    expect(tip?.kind).toBe("branch");
    expect(tip?.branches).toEqual(["feature"]);
  });

  it("emits child->parent edges and dedups", () => {
    const commits = [c("x", ["root"]), c("root", [])];
    const { edges } = buildGraph(commits, [{ name: "main", sha: "x" }]);
    // x is a tip, root is a root: both discrete, one edge x->root.
    expect(edges).toEqual([{ id: "x->root", source: "x", target: "root" }]);
  });

  it("ignores parents outside the fetched set", () => {
    const commits = [c("only", ["missing-parent"])];
    const { nodes, edges } = buildGraph(commits, [{ name: "main", sha: "only" }]);
    expect(edges).toHaveLength(0);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe("only");
  });

  it("keeps a tagged commit discrete and surfaces the tag", () => {
    // Without the tag, mid would collapse into a run.
    const commits = [
      c("head", ["mid"]),
      c("mid", ["root"]),
      c("root", []),
    ];
    const { nodes } = buildGraph(
      commits,
      [{ name: "main", sha: "head" }],
      { tags: [{ name: "v1.0", sha: "mid" }] },
    );
    const mid = nodes.find((n) => n.id === "mid");
    expect(mid).toBeDefined();
    expect(mid?.tags).toEqual(["v1.0"]);
  });

  it("computes ahead/behind for a branch tip vs the default branch", () => {
    // main: m1 <- base ; feature: f1 <- base  (feature 1 ahead, 1 behind)
    const commits = [
      c("m1", ["base"]),
      c("f1", ["base"]),
      c("base", []),
    ];
    const branches: RawBranch[] = [
      { name: "main", sha: "m1" },
      { name: "feature", sha: "f1" },
    ];
    const { nodes } = buildGraph(commits, branches, { defaultBranch: "main" });
    const feat = nodes.find((n) => n.id === "f1");
    expect(feat?.ahead).toBe(1); // f1 not on main
    expect(feat?.behind).toBe(1); // m1 not on feature
    const main = nodes.find((n) => n.id === "m1");
    expect(main?.ahead).toBeNull(); // default branch tip: no ahead/behind
  });
});
