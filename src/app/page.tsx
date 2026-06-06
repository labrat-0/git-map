"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Sidebar } from "@/components/Sidebar";
import { RepoMap } from "@/components/RepoMap";
import { InspectPanel } from "@/components/InspectPanel";
import { ByokSettings } from "@/components/ByokSettings";
import { LoginScreen } from "@/components/LoginScreen";
import { SkeletonMap } from "@/components/Skeleton";
import type { Graph, MapNode, Repo } from "@/lib/types";

type AuthState = "loading" | "in" | "out";

// Read URL params once at module-evaluation time so lazy state init is safe.
function readUrlParams() {
  if (typeof window === "undefined") return { repo: null, sha: null };
  const p = new URLSearchParams(window.location.search);
  return { repo: p.get("repo"), sha: p.get("sha") };
}

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

  // Branch focus: "" = all, otherwise filter to that branch's ancestry.
  const [focusBranch, setFocusBranch] = useState<string>("");

  // URL deep-link restore — read once on mount.
  const [{ repo: urlRepo, sha: urlSha }] = useState(readUrlParams);
  const urlRestoredRef = useRef(false);

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

  // Load repos once authed.
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
    setFocusBranch("");
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

  // Restore URL-specified repo once the repos list is available.
  useEffect(() => {
    if (urlRestoredRef.current || repos.length === 0 || !urlRepo) return;
    const repo = repos.find((r) => r.fullName === urlRepo);
    if (!repo) return;
    urlRestoredRef.current = true;
    Promise.resolve().then(() => selectRepo(repo));
  }, [repos, urlRepo, selectRepo]);

  // Restore URL-specified node once the graph is available (one-time).
  const nodeRestoredRef = useRef(false);
  useEffect(() => {
    if (nodeRestoredRef.current || !graph || !urlSha) return;
    const node =
      graph.nodes.find((n) => n.id === urlSha) ??
      graph.nodes.find((n) => n.shas.includes(urlSha));
    if (!node) return;
    nodeRestoredRef.current = true;
    Promise.resolve().then(() => setSelectedNode(node));
  }, [graph, urlSha]);

  // Reflect current state in the URL (no navigation, just replaceState).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (selectedRepo) params.set("repo", selectedRepo.fullName);
    if (selectedNode) params.set("sha", selectedNode.id);
    const qs = params.toString();
    history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [selectedRepo, selectedNode]);

  // Branch names visible in the current graph (for the focus selector).
  const branchNames = useMemo(
    () =>
      graph
        ? [...new Set(graph.nodes.flatMap((n) => n.branches))].sort()
        : [],
    [graph],
  );

  // Client-side filtered graph for the branch focus selector.
  const displayGraph = useMemo(() => {
    if (!graph || !focusBranch) return graph;
    const tipNode = graph.nodes.find((n) => n.branches.includes(focusBranch));
    if (!tipNode) return graph;
    // BFS from tip following source→target (child→parent).
    const adj = new Map<string, string[]>();
    for (const e of graph.edges) {
      const arr = adj.get(e.source) ?? [];
      arr.push(e.target);
      adj.set(e.source, arr);
    }
    const reachable = new Set<string>();
    const queue = [tipNode.id];
    while (queue.length) {
      const id = queue.shift()!;
      if (reachable.has(id)) continue;
      reachable.add(id);
      for (const next of adj.get(id) ?? []) queue.push(next);
    }
    return {
      ...graph,
      nodes: graph.nodes.filter((n) => reachable.has(n.id)),
      edges: graph.edges.filter(
        (e) => reachable.has(e.source) && reachable.has(e.target),
      ),
    };
  }, [graph, focusBranch]);

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

  const nodeCount = displayGraph?.nodes.length ?? 0;

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
              {/* Branch focus selector */}
              {branchNames.length > 1 && (
                <select
                  value={focusBranch}
                  onChange={(e) => setFocusBranch(e.target.value)}
                  className="bg-background text-foreground font-mono text-[10px] px-1.5 py-0.5 cursor-pointer focus:outline-none"
                  style={{ boxShadow: "0 0 0 1px #fff" }}
                  aria-label="Branch focus"
                >
                  <option value="">all branches</option>
                  {branchNames.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              )}
              {branchNames.length === 1 && (
                <span className="brand-edge px-1.5 py-0.5">
                  {branchNames[0]}
                </span>
              )}
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
          {selectedRepo && graphLoading && <SkeletonMap />}
          <RepoMap
            graph={displayGraph}
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
