import { NextResponse } from "next/server";
import { getGraphQL, getOctokit } from "@/lib/github";
import { buildGraph, type RawBranch, type RawCommit } from "@/lib/graph";
import { layoutGraph } from "@/lib/layout";
import { graphCache } from "@/lib/cache";
import { GraphSchema, type Graph } from "@/lib/types";

export const dynamic = "force-dynamic";

const MAX_BRANCHES = 25;
const MAX_COMMITS = 500;
const PER_PAGE = 100;

interface RawFetch {
  defaultBranch: string;
  branches: RawBranch[];
  commits: RawCommit[];
  truncated: boolean;
}

/** GraphQL response shape (only the fields we read). */
interface GqlResponse {
  repository: {
    defaultBranchRef: { name: string } | null;
    refs: {
      nodes: Array<{
        name: string;
        target: {
          oid?: string;
          history?: {
            pageInfo: { hasNextPage: boolean };
            nodes: Array<{
              oid: string;
              message: string;
              committedDate: string | null;
              parents: { nodes: Array<{ oid: string }> };
              author: {
                name: string | null;
                user: { login: string } | null;
              } | null;
            }>;
          };
        };
      }>;
    };
  } | null;
}

const GRAPH_QUERY = `
  query ($owner: String!, $repo: String!, $branches: Int!, $commits: Int!) {
    repository(owner: $owner, name: $repo) {
      defaultBranchRef { name }
      refs(
        refPrefix: "refs/heads/"
        first: $branches
        orderBy: { field: TAG_COMMIT_DATE, direction: DESC }
      ) {
        nodes {
          name
          target {
            ... on Commit {
              oid
              history(first: $commits) {
                pageInfo { hasNextPage }
                nodes {
                  oid
                  message
                  committedDate
                  parents(first: 10) { nodes { oid } }
                  author { name user { login } }
                }
              }
            }
          }
        }
      }
    }
  }
`;

/** Single round-trip fetch via GraphQL. Throws on failure (caller falls back). */
async function fetchViaGraphQL(
  gql: NonNullable<Awaited<ReturnType<typeof getGraphQL>>>,
  owner: string,
  repo: string,
): Promise<RawFetch> {
  const res = await gql<GqlResponse>(GRAPH_QUERY, {
    owner,
    repo,
    branches: MAX_BRANCHES,
    commits: PER_PAGE,
  });
  const repository = res.repository;
  if (!repository) {
    const e = new Error("repository not found");
    (e as { status?: number }).status = 404;
    throw e;
  }

  const branches: RawBranch[] = [];
  const commitMap = new Map<string, RawCommit>();
  let truncated = false;

  for (const ref of repository.refs.nodes) {
    const tip = ref.target?.oid;
    if (tip) branches.push({ name: ref.name, sha: tip });
    const history = ref.target?.history;
    if (!history) continue;
    if (history.pageInfo.hasNextPage) truncated = true;
    for (const c of history.nodes) {
      if (commitMap.has(c.oid)) continue;
      if (commitMap.size >= MAX_COMMITS) {
        truncated = true;
        break;
      }
      commitMap.set(c.oid, {
        sha: c.oid,
        parents: c.parents.nodes.map((p) => p.oid),
        message: c.message,
        author: c.author?.name ?? c.author?.user?.login ?? null,
        authorLogin: c.author?.user?.login ?? null,
        date: c.committedDate,
      });
    }
  }

  return {
    defaultBranch: repository.defaultBranchRef?.name ?? "main",
    branches,
    commits: Array.from(commitMap.values()),
    truncated,
  };
}

/** REST fallback: serial pagination per branch. Used if GraphQL fails. */
async function fetchViaRest(
  octokit: NonNullable<Awaited<ReturnType<typeof getOctokit>>>,
  owner: string,
  repo: string,
): Promise<RawFetch> {
  const { data: repoInfo } = await octokit.rest.repos.get({ owner, repo });
  const defaultBranch = repoInfo.default_branch;

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

  return {
    defaultBranch,
    branches,
    commits: Array.from(commitMap.values()),
    truncated,
  };
}

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
    let raw: RawFetch;
    const gql = await getGraphQL();
    try {
      if (!gql) throw new Error("no graphql client");
      raw = await fetchViaGraphQL(gql, owner, repo);
    } catch (gqlErr) {
      // 404 = genuinely missing; don't waste a REST round-trip retrying.
      if ((gqlErr as { status?: number })?.status === 404) throw gqlErr;
      console.warn("[graph] graphql failed, falling back to REST:", gqlErr);
      raw = await fetchViaRest(octokit, owner, repo);
    }

    const { nodes, edges } = buildGraph(raw.commits, raw.branches);
    const laidOut = layoutGraph(nodes, edges);

    const graph: Graph = GraphSchema.parse({
      owner,
      repo,
      defaultBranch: raw.defaultBranch,
      truncated: raw.truncated,
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
