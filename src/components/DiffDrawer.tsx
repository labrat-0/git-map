"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import type { CommitDiff, MapNode } from "@/lib/types";
import { summarizeDiff } from "@/lib/llm";
import { getModel, hasKey } from "@/lib/byok";
import { cn } from "@/lib/utils";

export function DiffDrawer({
  node,
  owner,
  repo,
  onClose,
}: {
  node: MapNode | null;
  owner: string | null;
  repo: string | null;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [diff, setDiff] = useState<CommitDiff | null>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string[] | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  // Reset the manual pick when the selected node changes (render-time reset,
  // the React-recommended alternative to setState-in-effect).
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
    setLoading(!!(activeSha && owner && repo));
  }

  // Fetch the diff whenever the active sha changes. No synchronous setState in
  // the effect body — only async-callback updates.
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
    if (!hasKey()) {
      toast.error("Add an OpenRouter key in Settings first.");
      return;
    }
    const cacheKey = `gitmap.summary.${diff.sha}.${getModel()}`;
    const cached = window.localStorage.getItem(cacheKey);
    if (cached) {
      setSummary(JSON.parse(cached));
      return;
    }
    setSummarizing(true);
    try {
      const bullets = await summarizeDiff(diff);
      setSummary(bullets);
      window.localStorage.setItem(cacheKey, JSON.stringify(bullets));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Summarize failed");
    } finally {
      setSummarizing(false);
    }
  }, [diff]);

  if (!node) return null;

  return (
    <div className="w-[480px] shrink-0 h-full flex flex-col border-l border-white bg-background">
      <div className="px-3 py-3 border-b border-white flex items-center justify-between">
        <span className="font-mono text-[12px] truncate">
          {node.kind === "run" ? node.label : node.shas[0]?.slice(0, 12)}
        </span>
        <button
          onClick={onClose}
          className="brand-edge p-1 hover:brand-edge-invert hover:bg-white hover:text-black"
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>

      {/* Run node: list its commits to pick from. */}
      {node.shas.length > 1 && (
        <div className="border-b border-white max-h-40 overflow-y-auto">
          <div className="px-3 py-1 text-[10px] font-mono text-[var(--muted)]">
            {node.shas.length} commits in run
          </div>
          {node.shas.map((s) => (
            <button
              key={s}
              onClick={() => setPicked(s)}
              className={cn(
                "w-full text-left px-3 py-1 font-mono text-[11px] hover:bg-white hover:text-black",
                s === activeSha && "bg-white text-black",
              )}
            >
              {s.slice(0, 9)}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {!activeSha && (
          <div className="px-3 py-3 text-[11px] font-mono text-[var(--muted)]">
            select a commit above
          </div>
        )}
        {loading && (
          <div className="px-3 py-3 text-[11px] font-mono text-[var(--muted)]">
            loading diff…
          </div>
        )}
        {diff && (
          <div>
            <div className="px-3 py-2 border-b border-white/30">
              <div className="text-[13px] leading-snug">
                {diff.message.split("\n")[0]}
              </div>
              <div className="font-mono text-[10px] text-[var(--muted)] mt-1">
                {diff.author ?? "unknown"} ·{" "}
                {diff.date ? new Date(diff.date).toISOString().slice(0, 10) : ""} · +
                {diff.additions} / -{diff.deletions}
              </div>
              <button
                onClick={onSummarize}
                disabled={summarizing || !hasKey()}
                title={hasKey() ? "Summarize with AI" : "Add an OpenRouter key in Settings"}
                className={cn(
                  "mt-2 brand-edge px-2 py-1 text-[11px] font-mono inline-flex items-center gap-1",
                  "hover:brand-edge-invert hover:bg-white hover:text-black",
                  "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-background disabled:hover:text-foreground",
                )}
              >
                <Sparkles size={12} />
                {summarizing ? "summarizing…" : "summarize with AI"}
              </button>
            </div>

            {summary && (
              <div className="px-3 py-2 border-b border-white/30 brand-edge m-2">
                <div className="text-[10px] font-mono text-[var(--muted)] mb-1">
                  AI summary (your key)
                </div>
                <ul className="space-y-1">
                  {summary.map((b, i) => (
                    <li key={i} className="text-[12px] leading-snug flex gap-1.5">
                      <span>—</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="px-3 py-2 space-y-3">
              {diff.files.map((f) => (
                <div key={f.filename} className="brand-edge">
                  <div className="px-2 py-1 font-mono text-[10px] border-b border-white/30 flex justify-between gap-2">
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
                            line.startsWith("+") && !line.startsWith("+++") && "text-white",
                            line.startsWith("-") && !line.startsWith("---") && "text-[#777]",
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
    </div>
  );
}
