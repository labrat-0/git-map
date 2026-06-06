"use client";

import { useMemo, useState } from "react";
import { Search, Settings, Star } from "lucide-react";
import type { Repo } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Sidebar({
  repos,
  loading,
  selectedFullName,
  onSelect,
  login,
  onOpenSettings,
}: {
  repos: Repo[];
  loading: boolean;
  selectedFullName: string | null;
  onSelect: (repo: Repo) => void;
  login: string | null;
  onOpenSettings: () => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter((r) => r.fullName.toLowerCase().includes(q));
  }, [repos, query]);

  return (
    <aside className="w-72 shrink-0 h-full flex flex-col border-r border-white bg-background">
      <div className="h-11 shrink-0 px-4 border-b border-white flex items-center justify-between">
        <span className="font-mono text-[13px] tracking-tight flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon_32x32.png" alt="" width={16} height={16} />
          git-map
        </span>
        <button
          onClick={onOpenSettings}
          className="brand-edge p-1 hover:brand-edge-invert hover:bg-white hover:text-black"
          aria-label="Settings"
        >
          <Settings size={14} />
        </button>
      </div>

      <div className="shrink-0 px-4 py-2 border-b border-white flex items-center gap-2">
        <Search size={13} className="text-[var(--muted)] shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="filter repos"
          className="bg-transparent outline-none text-[12px] font-mono flex-1 min-w-0 placeholder:text-[var(--muted)]"
        />
        <span className="col-eyebrow shrink-0">{filtered.length}</span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading && (
          <div className="px-4 py-3 font-mono text-[11px] text-[var(--muted)]">
            loading repos…
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="px-4 py-3 font-mono text-[11px] text-[var(--muted)]">
            no public repos
          </div>
        )}
        {filtered.map((r) => {
          const active = r.fullName === selectedFullName;
          return (
            <button
              key={r.fullName}
              onClick={() => onSelect(r)}
              className={cn(
                "w-full text-left px-4 py-2 border-b border-white/10 transition-colors group",
                "hover:bg-white hover:text-black",
                active && "bg-white text-black",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[12px] truncate">{r.name}</span>
                <span
                  className={cn(
                    "flex items-center gap-1 text-[10px] font-mono shrink-0",
                    active ? "text-black/60" : "text-[var(--muted)]",
                  )}
                >
                  <Star size={9} /> {r.stars}
                </span>
              </div>
              <div
                className={cn(
                  "text-[10px] truncate",
                  active ? "text-black/60" : "text-[var(--muted)]",
                )}
              >
                {r.owner}
              </div>
            </button>
          );
        })}
      </div>

      <div className="shrink-0 px-4 py-2 border-t border-white flex items-center justify-between">
        <span className="font-mono text-[11px] truncate">
          {login ? `@${login}` : ""}
        </span>
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="brand-edge px-2 py-0.5 text-[10px] font-mono hover:brand-edge-invert hover:bg-white hover:text-black"
          >
            logout
          </button>
        </form>
      </div>
    </aside>
  );
}
