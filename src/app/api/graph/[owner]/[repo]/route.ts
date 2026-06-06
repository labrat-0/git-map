import { NextResponse } from "next/server";
import { getOctokit } from "@/lib/github";
import { buildGraph, type RawBranch, type RawCommit } from "@/lib/graph";
import { layoutGraph } from "@/lib/layout";
import { graphCache } from "@/lib/cache";
import { GraphSchema, type Graph } from "@/lib/types";

export const dynamic = "force-dynamic";

const MAX_COMMITS = 300;
const PER_PAGE = 100;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ owner: string; repo: string }> },
) {
  const { owner, repo } = await ctx.params;
  const octokit = await getOctokit();
  if (!octokit) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const cacheKey = `${owner}/${repo}`;
  const cached = graphCache.get(cacheKey) as Graph | undefined;
  if (cached) return NextResponse.json(cached);

  try {
    const { data: repoInfo } = await octokit.rest.repos.get({ owner, repo });
    const defaultBranch = repoInfo.default_branch;

    const { data: branchData } = await octokit.rest.repos.listBranches({
      owner,
      repo,
      per_page: PER_PAGE,
    });
    const branches: RawBranch[] = branchData.map((b) => ({
      name: b.name,
      sha: b.commit.sha,
    }));

    const commits: RawCommit[] = [];
    let truncated = false;
    for (let page = 1; commits.length < MAX_COMMITS; page++) {
      const { data } = await octokit.rest.repos.listCommits({
        owner,
        repo,
        sha: defaultBranch,
        per_page: PER_PAGE,
        page,
      });
      if (data.length === 0) break;
      for (const c of data) {
        commits.push({
          sha: c.sha,
          parents: c.parents.map((p) => p.sha),
          message: c.commit.message,
          author: c.commit.author?.name ?? c.author?.login ?? null,
          date: c.commit.author?.date ?? null,
        });
      }
      if (data.length < PER_PAGE) break;
      if (commits.length >= MAX_COMMITS) {
        truncated = true;
        break;
      }
    }

    const { nodes, edges } = buildGraph(commits, branches);
    const laidOut = layoutGraph(nodes, edges);

    const graph: Graph = GraphSchema.parse({
      owner,
      repo,
      defaultBranch,
      truncated,
      nodes: laidOut,
      edges,
    });

    graphCache.set(cacheKey, graph);
    return NextResponse.json(graph);
  } catch (err: unknown) {
    const status =
      typeof err === "object" && err && "status" in err
        ? (err as { status: number }).status
        : 500;
    return NextResponse.json(
      { error: "failed to build graph", detail: String(err) },
      { status: status === 404 ? 404 : 500 },
    );
  }
}
