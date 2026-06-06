import { NextResponse } from "next/server";
import { getOctokit } from "@/lib/github";
import { diffCache } from "@/lib/cache";
import { CommitDiffSchema, type CommitDiff } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ owner: string; repo: string; sha: string }> },
) {
  const { owner, repo, sha } = await ctx.params;
  const octokit = await getOctokit();
  if (!octokit) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  // Diffs are immutable (SHA = content) → cache forever.
  const cacheKey = `${owner}/${repo}@${sha}`;
  const cached = diffCache.get(cacheKey) as CommitDiff | undefined;
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    });
  }

  try {
    const { data } = await octokit.rest.repos.getCommit({ owner, repo, ref: sha });

    const diff: CommitDiff = CommitDiffSchema.parse({
      sha: data.sha,
      message: data.commit.message,
      author: data.commit.author?.name ?? data.author?.login ?? null,
      date: data.commit.author?.date ?? null,
      additions: data.stats?.additions ?? 0,
      deletions: data.stats?.deletions ?? 0,
      files: (data.files ?? []).map((f) => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions ?? 0,
        deletions: f.deletions ?? 0,
        patch: f.patch ?? null,
      })),
    });

    diffCache.set(cacheKey, diff);
    return NextResponse.json(diff, {
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "failed to fetch diff", detail: String(err) },
      { status: 500 },
    );
  }
}
