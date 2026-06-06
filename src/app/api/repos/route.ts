import { NextResponse } from "next/server";
import { getOctokit } from "@/lib/github";
import { type Repo } from "@/lib/types";

export const dynamic = "force-dynamic";

/** List the authenticated user's PUBLIC repos, most recently pushed first. */
export async function GET() {
  const octokit = await getOctokit();
  if (!octokit) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { data } = await octokit.rest.repos.listForAuthenticatedUser({
    visibility: "public",
    affiliation: "owner,collaborator,organization_member",
    sort: "pushed",
    per_page: 100,
  });

  const repos: Repo[] = data.map((r) => ({
    owner: r.owner.login,
    name: r.name,
    fullName: r.full_name,
    description: r.description ?? null,
    stars: r.stargazers_count ?? 0,
    pushedAt: r.pushed_at ?? null,
    defaultBranch: r.default_branch ?? "main",
  }));

  return NextResponse.json({ repos });
}
