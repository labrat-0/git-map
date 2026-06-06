"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import type { CommitDiff, MapNode } from "@/lib/types";
import { summarizeDiffStream } from "@/lib/llm";
import { getModel, getProviderId, isConfigured } from "@/lib/byok";
import { cn } from "@/lib/utils";
import { Skeleton, SkeletonLines } from "./Skeleton";

export function InspectPanel({
  node,
  owner,
  repo,
  onClose,
  className,
}: {
  node: MapNode | null;
  owner: string | null;
  repo: string | null;
  onClose: () => void;
  className?: string;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [diff, setDiff] = useState<CommitDiff | null>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string[] | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [streamText, setStreamText] = useState<string>("");

  // Reset the manual pick when the selected node changes (render-time reset).
  const [prevNodeId, setPrevNodeId] = useState<string | undefined>(undefined);
  if (node?.id !== prevNodeId) {
    setPrevNodeId(node?.id);
    setPicked(null);
  }

  // Which sha to show: single-commit nodes auto-select; runs wait for a pick.
  const activeSha =
    picked ?? (node && node.shas.length === 1 ? node.shas[0] : null);

  // Reset the loaded diff/summary (and arm the loader) when the sha changes.
  const [prevSha, setPrevSha] = useState<string | null>(null);
  if (activeSha !== prevSha) {
    setPrevSha(activeSha);
    setDiff(null);
    setSummary(null);
    setStreamText("");
    setLoading(!!(activeSha && owner && repo));
  }

  useEffect(() => {
    if (!activeSha || !owner || !repo) return;
    let cancelled = false;
    fetch(`/api/diff/${owner}/${repo}/${activeSha}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((d: CommitDiff) => {
        if (!cancelled) setDiff(d);
      })
      .catch(() => !cancelled && toast.error("Failed to load diff"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [activeSha, owner, repo]);

  const onSummarize = useCallback(async () => {
    if (!diff) return;
    if (!isConfigured()) {
      toast.error("Open Settings to pick an AI provider + model first.");
      return;
    }
    const cacheKey = `gitmap.summary.${diff.sha}.${getProviderId()}.${getModel(getProviderId())}`;
    const cached = window.localStorage.getItem(cacheKey);
    if (cached) {
      setSummary(JSON.parse(cached) as string[]);
      return;
    }
    setSummarizing(true);
    setStreamText("");
    try {
      const bullets = await summarizeDiffStream(diff, (token) => {
        setStreamText((t) => t + token);
      });
      setSummary(bullets);
      setStreamText("");
      window.localStorage.setItem(cacheKey, JSON.stringify(bullets));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Summarize failed");
      setStreamText("");
    } finally {
      setSummarizing(false);
    }
  }, [diff]);

  return (
    <aside className={cn("w-[420px] shrink-0 h-full flex flex-col border-l border-white bg-background", className)}>
      {/* Header — always present. */}
      <header className="h-11 shrink-0 border-b border-white flex items-center justify-between px-4">
        <div className="flex items-baseline gap-3 min-w-0">
          <span className="col-eyebrow">inspect</span>
          {node && (
            <span className="font-mono text-[12px] truncate">
              {node.kind === "run" ? node.label : node.shas[0]?.slice(0, 12)}
            </span>
          )}
        </div>
        {node && (
          <button
            onClick={onClose}
            className="brand-edge p-1 hover:brand-edge-invert hover:bg-white hover:text-black"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        )}
      </header>

      {/* Empty state. */}
      {!node && (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/icon_192x192.png"
            alt=""
            width={72}
            height={72}
            className="opacity-20"
          />
          <p className="font-mono text-[11px] text-[var(--muted)] leading-relaxed">
            click a node on the map to inspect its commit, diff, and an optional
            AI summary.
          </p>
        </div>
      )}

      {/* Run node: list its commits to pick from. */}
      {node && node.shas.length > 1 && (
        <div className="border-b border-white shrink-0 max-h-36 overflow-y-auto">
          <div className="px-4 py-1.5 col-eyebrow">
            {node.shas.length} commits in run
          </div>
          {node.shas.map((s) => (
            <button
              key={s}
              onClick={() => setPicked(s)}
              className={cn(
                "w-full text-left px-4 py-1 font-mono text-[11px] hover:bg-white hover:text-black transition-colors",
                s === activeSha && "bg-white text-black",
              )}
            >
              {s.slice(0, 9)}
            </button>
          ))}
        </div>
      )}

      {/* Body. */}
      {node && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          {!activeSha && (
            <div className="px-4 py-4 col-eyebrow">select a commit above</div>
          )}

          {/* Diff loading skeleton. */}
          {loading && (
            <div className="px-4 py-4 space-y-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
              <SkeletonLines count={6} />
            </div>
          )}

          {diff && (
            <div className="gm-rise">
              <div className="px-4 py-3 border-b border-white/20">
                <div className="text-[13px] leading-snug">
                  {diff.message.split("\n")[0]}
                </div>
                <div className="font-mono text-[10px] text-[var(--muted)] mt-1.5">
                  {diff.author ?? "unknown"} ·{" "}
                  {diff.date
                    ? new Date(diff.date).toISOString().slice(0, 10)
                    : ""}{" "}
                  · +{diff.additions} / -{diff.deletions}
                </div>
                <button
                  onClick={onSummarize}
                  disabled={summarizing || !isConfigured()}
                  title={
                    isConfigured()
                      ? "Summarize with AI"
                      : "Pick an AI provider + model in Settings"
                  }
                  className={cn(
                    "mt-3 brand-edge px-2.5 py-1 text-[11px] font-mono inline-flex items-center gap-1.5",
                    "hover:brand-edge-invert hover:bg-white hover:text-black transition-colors",
                    "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-background disabled:hover:text-foreground",
                  )}
                >
                  <Sparkles size={12} />
                  {summarizing ? "summarizing…" : "summarize with AI"}
                </button>
              </div>

              {/* Streaming text (live preview while summarizing). */}
              {summarizing && streamText && (
                <div className="m-3 px-3 py-2.5 brand-edge">
                  <div className="col-eyebrow mb-1.5">AI summary · streaming</div>
                  <pre className="text-[11px] leading-snug font-mono whitespace-pre-wrap text-[var(--muted)]">
                    {streamText}
                    <span className="animate-pulse">▋</span>
                  </pre>
                </div>
              )}

              {/* Finalized bullets. */}
              {summary && (
                <div className="m-3 px-3 py-2.5 brand-edge gm-rise">
                  <div className="col-eyebrow mb-1.5">AI summary · your key</div>
                  <ul className="space-y-1.5">
                    {summary.map((b, i) => (
                      <li
                        key={i}
                        className="text-[12px] leading-snug flex gap-2"
                      >
                        <span className="text-[var(--muted)]">—</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="px-3 py-3 space-y-3">
                {diff.files.map((f) => (
                  <div key={f.filename} className="brand-edge">
                    <div className="px-2 py-1 font-mono text-[10px] border-b border-white/20 flex justify-between gap-2">
                      <span className="truncate">{f.filename}</span>
                      <span className="text-[var(--muted)] shrink-0">
                        {f.status} +{f.additions}/-{f.deletions}
                      </span>
                    </div>
                    {f.patch ? (
                      <pre className="text-[10px] font-mono overflow-x-auto leading-tight p-2">
                        {f.patch.split("\n").map((line, i) => (
                          <div
                            key={i}
                            className={cn(
                              line.startsWith("+") &&
                                !line.startsWith("+++") &&
                                "text-white",
                              line.startsWith("-") &&
                                !line.startsWith("---") &&
                                "text-[#777]",
                              line.startsWith("@@") && "text-[#5aa]",
                              !/^[+\-@]/.test(line) && "text-[#999]",
                            )}
                          >
                            {line || " "}
                          </div>
                        ))}
                      </pre>
                    ) : (
                      <div className="px-2 py-1 text-[10px] font-mono text-[var(--muted)]">
                        (no textual patch — binary or too large)
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
