import { NextResponse } from "next/server";
import { getOctokit } from "@/lib/github";
import { buildGraph, type RawBranch, type RawCommit } from "@/lib/graph";
import { layoutGraph } from "@/lib/layout";
import { graphCache } from "@/lib/cache";
import { GraphSchema, type Graph } from "@/lib/types";

export const dynamic = "force-dynamic";

const MAX_BRANCHES = 25;
const MAX_COMMITS = 500;
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

    // List branches sorted by most-recently-updated, cap at MAX_BRANCHES.
    const { data: branchData } = await octokit.rest.repos.listBranches({
      owner,
      repo,
      sort: "updated" as never,
      per_page: MAX_BRANCHES,
    });
    const branches: RawBranch[] = branchData.map((b) => ({
      name: b.name,
      sha: b.commit.sha,
    }));

    // Accumulate commits across all branches into a deduplicated map.
    const commitMap = new Map<string, RawCommit>();
    let truncated = false;

    outer: for (const branch of branches) {
      if (commitMap.size >= MAX_COMMITS) {
        truncated = true;
        break;
      }
      try {
        for (let page = 1; ; page++) {
          const { data } = await octokit.rest.repos.listCommits({
            owner,
            repo,
            sha: branch.sha,
            per_page: PER_PAGE,
            page,
          });
          for (const c of data) {
            if (commitMap.has(c.sha)) continue;
            commitMap.set(c.sha, {
              sha: c.sha,
              parents: c.parents.map((p) => p.sha),
              message: c.commit.message,
              author: c.commit.author?.name ?? c.author?.login ?? null,
              authorLogin: c.author?.login ?? null,
              date: c.commit.author?.date ?? null,
            });
            if (commitMap.size >= MAX_COMMITS) {
              truncated = true;
              break outer;
            }
          }
          if (data.length < PER_PAGE) break;
        }
      } catch (err: unknown) {
        // 403 = rate-limited; return what we have so far.
        const status =
          typeof err === "object" && err && "status" in err
            ? (err as { status: number }).status
            : 0;
        if (status === 403) {
          truncated = true;
          break;
        }
        throw err;
      }
    }

    const commits = Array.from(commitMap.values());
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
    console.error("[graph]", err);
    return NextResponse.json(
      { error: "failed to build graph" },
      { status: status === 404 ? 404 : 500 },
    );
  }
}
