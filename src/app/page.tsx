"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Sidebar } from "@/components/Sidebar";
import { RepoMap } from "@/components/RepoMap";
import { InspectPanel } from "@/components/InspectPanel";
import { ByokSettings } from "@/components/ByokSettings";
import { LoginScreen } from "@/components/LoginScreen";
import type { Graph, MapNode, Repo } from "@/lib/types";

type AuthState = "loading" | "in" | "out";

export default function Home() {
  const [auth, setAuth] = useState<AuthState>("loading");
  const [login, setLogin] = useState<string | null>(null);

  const [repos, setRepos] = useState<Repo[]>([]);
  const [reposLoading, setReposLoading] = useState(true);

  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [graph, setGraph] = useState<Graph | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);

  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Auth probe.
  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { login: string }) => {
        setLogin(d.login);
        setAuth("in");
      })
      .catch(() => setAuth("out"));
  }, []);

  // Load repos once authed. (reposLoading starts true; flipped in finally —
  // no synchronous setState in the effect body.)
  useEffect(() => {
    if (auth !== "in") return;
    fetch("/api/repos")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { repos: Repo[] }) => setRepos(d.repos))
      .catch(() => toast.error("Failed to load repos"))
      .finally(() => setReposLoading(false));
  }, [auth]);

  const selectRepo = useCallback((repo: Repo) => {
    setSelectedRepo(repo);
    setSelectedNode(null);
    setGraph(null);
    setGraphLoading(true);
    fetch(`/api/graph/${repo.owner}/${repo.name}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((g: Graph) => {
        setGraph(g);
        if (g.truncated) {
          toast.message("Showing the most recent commits (history truncated).");
        }
      })
      .catch(() => toast.error("Failed to build map"))
      .finally(() => setGraphLoading(false));
  }, []);

  if (auth === "loading") {
    return (
      <main className="h-screen w-screen flex items-center justify-center font-mono text-[12px] text-[var(--muted)]">
        loading…
      </main>
    );
  }

  if (auth === "out") {
    return <LoginScreen />;
  }

  const nodeCount = graph?.nodes.length ?? 0;

  return (
    <main className="h-screen w-screen flex overflow-hidden">
      {/* LEFT — repos */}
      <Sidebar
        repos={repos}
        loading={reposLoading}
        selectedFullName={selectedRepo?.fullName ?? null}
        onSelect={selectRepo}
        login={login}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* MIDDLE — map */}
      <section className="flex-1 min-w-0 flex flex-col">
        <header className="h-11 shrink-0 border-b border-white flex items-center justify-between px-4">
          <div className="min-w-0 flex items-baseline gap-3">
            <span className="col-eyebrow">map</span>
            {selectedRepo ? (
              <span className="font-mono text-[12px] truncate">
                {selectedRepo.fullName}
              </span>
            ) : (
              <span className="font-mono text-[12px] text-[var(--muted)]">
                no repo selected
              </span>
            )}
          </div>
          {selectedRepo && graph && (
            <div className="flex items-center gap-2 shrink-0 font-mono text-[10px] text-[var(--muted)]">
              <span className="brand-edge px-1.5 py-0.5">
                {graph.defaultBranch}
              </span>
              <span>{nodeCount} nodes</span>
              {graph.truncated && (
                <span className="brand-edge px-1.5 py-0.5">truncated</span>
              )}
            </div>
          )}
        </header>

        <div className="flex-1 min-h-0 relative">
          {!selectedRepo && (
            <div className="absolute inset-0 flex items-center justify-center font-mono text-[12px] text-[var(--muted)] pointer-events-none">
              select a repo →
            </div>
          )}
          {selectedRepo && graphLoading && (
            <div className="absolute inset-0 flex items-center justify-center font-mono text-[12px] text-[var(--muted)] z-10 pointer-events-none">
              building map…
            </div>
          )}
          <RepoMap
            graph={graph}
            selectedNodeId={selectedNode?.id ?? null}
            onSelectNode={setSelectedNode}
          />
        </div>
      </section>

      {/* RIGHT — inspect */}
      <InspectPanel
        node={selectedNode}
        owner={selectedRepo?.owner ?? null}
        repo={selectedRepo?.name ?? null}
        onClose={() => setSelectedNode(null)}
      />

      <ByokSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}
