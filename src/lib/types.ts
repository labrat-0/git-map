import { z } from "zod";

/** A repo entry shown in the sidebar. */
export const RepoSchema = z.object({
  owner: z.string(),
  name: z.string(),
  fullName: z.string(),
  description: z.string().nullable(),
  stars: z.number(),
  pushedAt: z.string().nullable(),
  defaultBranch: z.string(),
});
export type Repo = z.infer<typeof RepoSchema>;

/**
 * A map node. Either a single commit, a collapsed linear run of commits,
 * or a branch tip label. `kind` drives which node component renders.
 */
export const MapNodeSchema = z.object({
  id: z.string(),
  kind: z.enum(["commit", "run", "merge", "branch"]),
  /** SHAs represented by this node (1 for commit/merge, N for a collapsed run). */
  shas: z.array(z.string()),
  /** Short label: abbreviated sha, or "N commits" for a run. */
  label: z.string(),
  /** First line of the (newest) commit message. */
  summary: z.string(),
  author: z.string().nullable(),
  authorLogin: z.string().nullable(),
  date: z.string().nullable(),
  /** Branch names whose tip is this commit. */
  branches: z.array(z.string()),
  /** Tag/release names pointing at this commit (or, for runs, any member commit). */
  tags: z.array(z.string()).default([]),
  /** For branch-tip nodes: commits ahead of / behind the default branch. */
  ahead: z.number().nullable().default(null),
  behind: z.number().nullable().default(null),
  position: z.object({ x: z.number(), y: z.number() }),
});
export type MapNode = z.infer<typeof MapNodeSchema>;

export const MapEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
});
export type MapEdge = z.infer<typeof MapEdgeSchema>;

export const GraphSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  defaultBranch: z.string(),
  truncated: z.boolean(),
  nodes: z.array(MapNodeSchema),
  edges: z.array(MapEdgeSchema),
});
export type Graph = z.infer<typeof GraphSchema>;

/** A single file's diff within a commit, returned by /api/diff. */
export const DiffFileSchema = z.object({
  filename: z.string(),
  status: z.string(),
  additions: z.number(),
  deletions: z.number(),
  patch: z.string().nullable(),
});
export type DiffFile = z.infer<typeof DiffFileSchema>;

export const CommitDiffSchema = z.object({
  sha: z.string(),
  message: z.string(),
  author: z.string().nullable(),
  date: z.string().nullable(),
  additions: z.number(),
  deletions: z.number(),
  files: z.array(DiffFileSchema),
});
export type CommitDiff = z.infer<typeof CommitDiffSchema>;
