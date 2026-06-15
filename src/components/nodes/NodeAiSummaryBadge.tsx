"use client";

import { useEffect, useState } from "react";
import { isConfigured, getProviderId, getModel } from "@/lib/byok";
import { summarizeDiff } from "@/lib/llm";
import type { CommitDiff } from "@/lib/types";
import { useMapCtx } from "./MapContext";

interface NodeAiSummaryBadgeProps {
  sha: string;
}

/** Read a cached first-bullet synchronously (client only); null if absent. */
function readCachedBullet(
  sha: string,
  owner: string,
  repo: string,
): string | null {
  if (typeof window === "undefined" || !isConfigured() || !owner || !repo) {
    return null;
  }
  const providerId = getProviderId();
  const cached = window.localStorage.getItem(
    `gitmap.summary.${sha}.${providerId}.${getModel(providerId)}`,
  );
  if (!cached) return null;
  try {
    return (JSON.parse(cached) as string[])[0] ?? null;
  } catch {
    return null; // stale cache entry
  }
}

export function NodeAiSummaryBadge({ sha }: NodeAiSummaryBadgeProps) {
  const { owner, repo } = useMapCtx();
  // Cache is read during render (no setState-in-effect); the effect only runs
  // the async fetch when nothing is cached yet.
  const cached = readCachedBullet(sha, owner, repo);
  const [fetched, setFetched] = useState<string | null>(null);
  const summary = fetched ?? cached;

  useEffect(() => {
    if (!isConfigured() || !owner || !repo || cached) return;
    let cancelled = false;
    const providerId = getProviderId();
    const cacheKey = `gitmap.summary.${sha}.${providerId}.${getModel(providerId)}`;
    fetch(`/api/diff/${owner}/${repo}/${sha}`)
      .then((r) => (r.ok ? (r.json() as Promise<CommitDiff>) : Promise.reject()))
      .then((diff) => summarizeDiff(diff))
      .then((bullets) => {
        if (cancelled) return;
        window.localStorage.setItem(cacheKey, JSON.stringify(bullets));
        setFetched(bullets[0] ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [sha, owner, repo, cached]);

  if (!summary) return null;
  return (
    <span
      className="font-mono text-[8px] truncate shrink"
      style={{ color: "rgba(0,255,65,0.75)" }}
      title={summary}
    >
      {summary}
    </span>
  );
}
