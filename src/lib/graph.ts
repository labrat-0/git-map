import type { MapEdge, MapNode } from "./types";

export interface RawCommit {
  sha: string;
  parents: string[];
  message: string;
  author: string | null;
  authorLogin: string | null;
  date: string | null;
}

export interface RawBranch {
  name: string;
  sha: string;
}

export interface RawTag {
  name: string;
  sha: string;
}

export interface BuildOptions {
  tags?: RawTag[];
  defaultBranch?: string;
}

/**
 * Build a node/edge graph from a set of commits, collapsing maximal linear
 * runs (commits with exactly one parent and one child, in-set) into a single
 * "run" node. Merges (2+ parents), branch points (2+ children), branch tips,
 * tagged commits, roots, and the head stay as discrete nodes.
 *
 * Edge direction: child (newer) -> parent (older), so a top-down dagre layout
 * puts newer commits above older ones.
 */
export function buildGraph(
  commits: RawCommit[],
  branches: RawBranch[],
  opts: BuildOptions = {},
): { nodes: MapNode[]; edges: MapEdge[] } {
  const { tags = [], defaultBranch } = opts;
  const inSet = new Set(commits.map((c) => c.sha));
  const bySha = new Map(commits.map((c) => [c.sha, c]));

  // child -> parent edges restricted to the fetched set
  const rawEdges: Array<[string, string]> = [];
  const childrenCount = new Map<string, number>();
  const parentCount = new Map<string, number>();
  const parentsOf = new Map<string, string[]>();
  for (const c of commits) {
    const parentsInSet = c.parents.filter((p) => inSet.has(p));
    parentCount.set(c.sha, parentsInSet.length);
    if (parentsInSet.length) parentsOf.set(c.sha, parentsInSet);
    for (const p of parentsInSet) {
      rawEdges.push([c.sha, p]);
      childrenCount.set(p, (childrenCount.get(p) ?? 0) + 1);
    }
  }

  const branchesBySha = new Map<string, string[]>();
  for (const b of branches) {
    if (!inSet.has(b.sha)) continue;
    const arr = branchesBySha.get(b.sha) ?? [];
    arr.push(b.name);
    branchesBySha.set(b.sha, arr);
  }

  const tagsBySha = new Map<string, string[]>();
  for (const t of tags) {
    if (!inSet.has(t.sha)) continue;
    const arr = tagsBySha.get(t.sha) ?? [];
    arr.push(t.name);
    tagsBySha.set(t.sha, arr);
  }

  // All in-set ancestors of `start` (inclusive), walking child -> parent.
  const ancestorsOf = (start: string): Set<string> => {
    const seen = new Set<string>([start]);
    const queue = [start];
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
  };

  // Ahead/behind vs the default branch, per branch-tip sha.
  const aheadBehind = new Map<string, { ahead: number; behind: number }>();
  const defaultSha = branches.find((b) => b.name === defaultBranch)?.sha;
  if (defaultSha && inSet.has(defaultSha)) {
    const defAnc = ancestorsOf(defaultSha);
    for (const b of branches) {
      if (b.sha === defaultSha || !inSet.has(b.sha)) continue;
      if (aheadBehind.has(b.sha)) continue;
      const tipAnc = ancestorsOf(b.sha);
      let ahead = 0;
      for (const s of tipAnc) if (!defAnc.has(s)) ahead++;
      let behind = 0;
      for (const s of defAnc) if (!tipAnc.has(s)) behind++;
      aheadBehind.set(b.sha, { ahead, behind });
    }
  }

  // A commit is linear (collapsible) iff exactly one in-set parent, exactly one
  // in-set child, and it is neither a branch tip nor a tagged commit.
  const isLinear = (sha: string): boolean =>
    (parentCount.get(sha) ?? 0) === 1 &&
    (childrenCount.get(sha) ?? 0) === 1 &&
    !branchesBySha.has(sha) &&
    !tagsBySha.has(sha);

  // Group linear commits into runs via the induced linear subgraph (simple chains).
  const runIdOf = new Map<string, string>();
  const runMembers = new Map<string, string[]>();
  for (const [child, parent] of rawEdges) {
    if (!isLinear(child) || !isLinear(parent)) continue;
    // union child & parent into the same run
    const a = runIdOf.get(child);
    const b = runIdOf.get(parent);
    if (a && b && a !== b) {
      // merge b into a
      for (const m of runMembers.get(b)!) {
        runIdOf.set(m, a);
        runMembers.get(a)!.push(m);
      }
      runMembers.delete(b);
    } else if (a && !b) {
      runIdOf.set(parent, a);
      runMembers.get(a)!.push(parent);
    } else if (!a && b) {
      runIdOf.set(child, b);
      runMembers.get(b)!.push(child);
    } else if (!a && !b) {
      const id = `run:${child}`;
      runIdOf.set(child, id);
      runIdOf.set(parent, id);
      runMembers.set(id, [child, parent]);
    }
  }
  // Solo linear commits (linear but with no linear neighbour) collapse to a 1-member run.
  for (const c of commits) {
    if (isLinear(c.sha) && !runIdOf.has(c.sha)) {
      const id = `run:${c.sha}`;
      runIdOf.set(c.sha, id);
      runMembers.set(id, [c.sha]);
    }
  }

  const nodeIdOf = (sha: string): string => runIdOf.get(sha) ?? sha;

  const nodes: MapNode[] = [];

  // Anchor nodes (non-linear commits).
  for (const c of commits) {
    if (runIdOf.has(c.sha)) continue;
    const branches = branchesBySha.get(c.sha) ?? [];
    const kind: MapNode["kind"] =
      (parentCount.get(c.sha) ?? 0) >= 2
        ? "merge"
        : branches.length > 0
          ? "branch"
          : "commit";
    const ab = aheadBehind.get(c.sha);
    nodes.push({
      id: c.sha,
      kind,
      shas: [c.sha],
      label: c.sha.slice(0, 7),
      summary: firstLine(c.message),
      author: c.author,
      authorLogin: c.authorLogin,
      date: c.date,
      branches,
      tags: tagsBySha.get(c.sha) ?? [],
      ahead: ab?.ahead ?? null,
      behind: ab?.behind ?? null,
      position: { x: 0, y: 0 },
    });
  }

  // Run nodes.
  for (const [id, members] of runMembers) {
    // newest first by date (fallback: keep insertion order)
    const sorted = [...members].sort((s1, s2) => dateDesc(bySha, s1, s2));
    const newest = bySha.get(sorted[0]);
    // Surface any tags landing on a collapsed member commit.
    const runTags = sorted.flatMap((s) => tagsBySha.get(s) ?? []);
    nodes.push({
      id,
      kind: "run",
      shas: sorted,
      label: `${sorted.length} commits`,
      summary: newest ? firstLine(newest.message) : "",
      author: newest?.author ?? null,
      authorLogin: newest?.authorLogin ?? null,
      date: newest?.date ?? null,
      branches: [],
      tags: runTags,
      ahead: null,
      behind: null,
      position: { x: 0, y: 0 },
    });
  }

  // Edges between distinct node ids (internal run edges dropped, dedup).
  const edgeSet = new Set<string>();
  const edges: MapEdge[] = [];
  for (const [child, parent] of rawEdges) {
    const a = nodeIdOf(child);
    const b = nodeIdOf(parent);
    if (a === b) continue;
    const key = `${a}->${b}`;
    if (edgeSet.has(key)) continue;
    edgeSet.add(key);
    edges.push({ id: key, source: a, target: b });
  }

  return { nodes, edges };
}

function firstLine(msg: string): string {
  return (msg.split("\n")[0] ?? "").trim();
}

function dateDesc(
  bySha: Map<string, RawCommit>,
  s1: string,
  s2: string,
): number {
  const d1 = bySha.get(s1)?.date ?? "";
  const d2 = bySha.get(s2)?.date ?? "";
  return d2.localeCompare(d1);
}
