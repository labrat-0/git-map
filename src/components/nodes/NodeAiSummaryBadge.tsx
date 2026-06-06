"use client";

import { useEffect, useState } from "react";
import { isConfigured, getProviderId, getModel } from "@/lib/byok";
import { summarizeDiff } from "@/lib/llm";
import type { CommitDiff } from "@/lib/types";
import { useMapCtx } from "./MapContext";

interface NodeAiSummaryBadgeProps {
  sha: string;
}

export function NodeAiSummaryBadge({ sha }: NodeAiSummaryBadgeProps) {
  const { owner, repo } = useMapCtx();
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    if (!isConfigured() || !owner || !repo) return;
    const providerId = getProviderId();
    const cacheKey = `gitmap.summary.${sha}.${providerId}.${getModel(providerId)}`;
    const cached = window.localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const bullets = JSON.parse(cached) as string[];
        setSummary(bullets[0] ?? null);
      } catch {
        // stale cache entry — ignore
      }
      return;
    }
    fetch(`/api/diff/${owner}/${repo}/${sha}`)
      .then((r) => (r.ok ? (r.json() as Promise<CommitDiff>) : Promise.reject()))
      .then((diff) => summarizeDiff(diff))
      .then((bullets) => {
        window.localStorage.setItem(cacheKey, JSON.stringify(bullets));
        setSummary(bullets[0] ?? null);
      })
      .catch(() => {});
  }, [sha, owner, repo]);

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
