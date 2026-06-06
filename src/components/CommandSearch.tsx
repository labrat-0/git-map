"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Graph, MapNode } from "@/lib/types";
import type { RepoMapHandle } from "./RepoMap";

const MAX_RESULTS = 8;

function matchNode(node: MapNode, q: string): boolean {
  if (!q) return true;
  const lq = q.toLowerCase();
  return (
    node.shas.some((s) => s.startsWith(lq)) ||
    node.summary.toLowerCase().includes(lq) ||
    (node.author?.toLowerCase().includes(lq) ?? false) ||
    node.branches.some((b) => b.toLowerCase().includes(lq))
  );
}

export function CommandSearch({
  graph,
  onSelect,
  onClose,
  mapRef,
}: {
  graph: Graph;
  onSelect: (node: MapNode) => void;
  onClose: () => void;
  mapRef: React.RefObject<RepoMapHandle | null>;
}) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = graph.nodes
    .filter((n) => matchNode(n, query))
    .slice(0, MAX_RESULTS);

  // Clamp cursor when results change.
  const clampedCursor = Math.min(cursor, Math.max(0, results.length - 1));

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setCursor((c) => Math.min(c + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setCursor((c) => Math.max(c - 1, 0));
      } else if (e.key === "Enter") {
        const node = results[clampedCursor];
        if (node) {
          mapRef.current?.flyTo(node.position);
          onSelect(node);
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [results, clampedCursor, onSelect, onClose, mapRef]);

  function handleResultClick(node: MapNode) {
    mapRef.current?.flyTo(node.position);
    onSelect(node);
    onClose();
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-[540px] max-w-[90vw] bg-background brand-edge flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/20">
          <Search size={14} className="text-[var(--muted)] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            placeholder="sha, commit message, author, branch…"
            className="flex-1 bg-transparent font-mono text-[12px] outline-none placeholder:text-[var(--muted)]"
          />
          <kbd className="font-mono text-[9px] text-[var(--muted)] brand-edge px-1">
            esc
          </kbd>
        </div>

        {/* Results */}
        {results.length === 0 ? (
          <div className="px-4 py-3 font-mono text-[11px] text-[var(--muted)]">
            no matches
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {results.map((node, i) => (
              <button
                key={node.id}
                onClick={() => handleResultClick(node)}
                className={cn(
                  "w-full text-left px-3 py-2 flex items-start gap-3 transition-colors",
                  i === clampedCursor
                    ? "bg-white text-black"
                    : "hover:bg-white/10",
                )}
              >
                <span className="font-mono text-[10px] shrink-0 mt-0.5 opacity-60">
                  {node.shas[0]?.slice(0, 8)}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="text-[12px] truncate block">
                    {node.summary || "(no message)"}
                  </span>
                  <span className="font-mono text-[9px] opacity-60 truncate block">
                    {node.author ?? "unknown"}
                    {node.branches.length > 0 && ` · ${node.branches.join(", ")}`}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Footer hint */}
        <div className="border-t border-white/10 px-3 py-1.5 flex gap-3 font-mono text-[9px] text-[var(--muted)]">
          <span>↑↓ navigate</span>
          <span>↵ select + fly</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
