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
      <div className="px-3 py-3 border-b border-white flex items-center justify-between">
        <span className="font-mono text-sm tracking-tight">git-map</span>
        <button
          onClick={onOpenSettings}
          className="brand-edge p-1 hover:brand-edge-invert hover:bg-white hover:text-black"
          aria-label="Settings"
        >
          <Settings size={14} />
        </button>
      </div>

      <div className="px-3 py-2 border-b border-white flex items-center gap-2">
        <Search size={14} className="text-[var(--muted)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="filter repos"
          className="bg-transparent outline-none text-[12px] font-mono flex-1 placeholder:text-[var(--muted)]"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="px-3 py-3 text-[11px] font-mono text-[var(--muted)]">
            loading repos…
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="px-3 py-3 text-[11px] font-mono text-[var(--muted)]">
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
                "w-full text-left px-3 py-2 border-b border-white/20 transition-colors",
                "hover:bg-white hover:text-black",
                active && "bg-white text-black",
              )}
            >
              <div className="font-mono text-[12px] truncate">{r.name}</div>
              <div
                className={cn(
                  "text-[10px] truncate",
                  active ? "text-black/70" : "text-[var(--muted)]",
                )}
              >
                {r.owner}
              </div>
              <div
                className={cn(
                  "flex items-center gap-1 text-[10px] font-mono mt-0.5",
                  active ? "text-black/70" : "text-[var(--muted)]",
                )}
              >
                <Star size={9} /> {r.stars}
              </div>
            </button>
          );
        })}
      </div>

      <div className="px-3 py-2 border-t border-white flex items-center justify-between">
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
