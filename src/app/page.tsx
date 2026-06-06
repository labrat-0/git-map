"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { Sidebar } from "@/components/Sidebar";
import { RepoMap, type RepoMapHandle } from "@/components/RepoMap";
import { InspectPanel } from "@/components/InspectPanel";
import { ByokSettings } from "@/components/ByokSettings";
import { LoginScreen } from "@/components/LoginScreen";
import { SkeletonMap } from "@/components/Skeleton";
import { CommandSearch } from "@/components/CommandSearch";
import type { Graph, MapNode, Repo } from "@/lib/types";
import { NODE_WIDTH, NODE_HEIGHT } from "@/lib/layout";

type AuthState = "loading" | "in" | "out";

function readUrlParams() {
  if (typeof window === "undefined") return { repo: null, sha: null };
  const p = new URLSearchParams(window.location.search);
  return { repo: p.get("repo"), sha: p.get("sha") };
}

const JUMP_CHARS = "asdfjklghqwertyuiopzxcvbnm";
function makeJumpLabels(nodeIds: string[]): Map<string, string> {
  const m = new Map<string, string>();
  nodeIds.forEach((id, i) => {
    if (i < JUMP_CHARS.length) {
      m.set(id, JUMP_CHARS[i]);
    } else {
      const a = Math.floor((i - JUMP_CHARS.length) / JUMP_CHARS.length);
      const b = (i - JUMP_CHARS.length) % JUMP_CHARS.length;
      m.set(id, JUMP_CHARS[a] + JUMP_CHARS[b]);
    }
  });
  return m;
}

function nearestInDir(
  nodes: MapNode[],
  current: MapNode,
  dir: "left" | "right" | "up" | "down",
): MapNode | null {
  const cx = current.position.x + NODE_WIDTH / 2;
  const cy = current.position.y + NODE_HEIGHT / 2;
  let best: MapNode | null = null;
  let bestScore = -Infinity;
  for (const n of nodes) {
    if (n.id === current.id) continue;
    const nx = n.position.x + NODE_WIDTH / 2;
    const ny = n.position.y + NODE_HEIGHT / 2;
    const dx = nx - cx;
    const dy = ny - cy;
    let primary: number, perp: number;
    if (dir === "left") { primary = -dx; perp = Math.abs(dy); }
    else if (dir === "right") { primary = dx; perp = Math.abs(dy); }
    else if (dir === "up") { primary = -dy; perp = Math.abs(dx); }
    else { primary = dy; perp = Math.abs(dx); }
    if (primary <= 0) continue;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const score = primary - perp * 0.5 - dist * 0.05;
    if (score > bestScore) { bestScore = score; best = n; }
  }
  return best;
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
  const [focusBranch, setFocusBranch] = useState<string>("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [jumpMode, setJumpMode] = useState(false);
  const [jumpBuffer, setJumpBuffer] = useState("");
  const [jumpLabels, setJumpLabels] = useState<Map<string, string>>(new Map());

  const [{ repo: urlRepo, sha: urlSha }] = useState(readUrlParams);
  const urlRestoredRef = useRef(false);
  const nodeRestoredRef = useRef(false);
  const mapRef = useRef<RepoMapHandle>(null);

  // Branch names + filtered graph (declared BEFORE keyboard nav effect).
  const branchNames = useMemo(
    () =>
      graph
        ? [...new Set(graph.nodes.flatMap((n) => n.branches))].sort()
        : [],
    [graph],
  );

  const displayGraph = useMemo<Graph | null>(() => {
    if (!graph || !focusBranch) return graph;
    const tipNode = graph.nodes.find((n) => n.branches.includes(focusBranch));
    if (!tipNode) return graph;
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

  // Filtered jump labels (only matching the buffer).
  const activeJumpLabels = useMemo(() => {
    if (!jumpMode) return undefined;
    if (!jumpBuffer) return jumpLabels;
    const filtered = new Map<string, string>();
    for (const [id, lbl] of jumpLabels) {
      if (lbl.startsWith(jumpBuffer)) filtered.set(id, lbl);
    }
    return filtered;
  }, [jumpMode, jumpBuffer, jumpLabels]);

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
    setJumpMode(false);
    setJumpBuffer("");
    setJumpLabels(new Map());
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

  // Restore URL-specified repo once repos available.
  useEffect(() => {
    if (urlRestoredRef.current || repos.length === 0 || !urlRepo) return;
    const repo = repos.find((r) => r.fullName === urlRepo);
    if (!repo) return;
    urlRestoredRef.current = true;
    Promise.resolve().then(() => selectRepo(repo));
  }, [repos, urlRepo, selectRepo]);

  // Restore URL-specified node once graph available (one-time).
  useEffect(() => {
    if (nodeRestoredRef.current || !graph || !urlSha) return;
    const node =
      graph.nodes.find((n) => n.id === urlSha) ??
      graph.nodes.find((n) => n.shas.includes(urlSha));
    if (!node) return;
    nodeRestoredRef.current = true;
    Promise.resolve().then(() => setSelectedNode(node));
  }, [graph, urlSha]);

  // Reflect state in URL.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (selectedRepo) params.set("repo", selectedRepo.fullName);
    if (selectedNode) params.set("sha", selectedNode.id);
    const qs = params.toString();
    history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [selectedRepo, selectedNode]);

  // Keyboard navigation.
  useEffect(() => {
    let lastKey = "";
    const handler = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement;
      if (tgt.matches("input, textarea, select, [contenteditable]")) return;
      const twoKey = lastKey + e.key;
      lastKey = e.key;

      // Jump mode: consume keys to match labels.
      if (jumpMode) {
        if (e.key === "Escape") {
          setJumpMode(false);
          setJumpBuffer("");
          return;
        }
        if (e.key.length === 1 && /[a-z]/.test(e.key)) {
          e.preventDefault();
          const newBuf = jumpBuffer + e.key;
          setJumpBuffer(newBuf);
          const inverseMap = new Map(
            [...jumpLabels].map(([id, lbl]) => [lbl, id]),
          );
          const matches = [...inverseMap.entries()].filter(([lbl]) =>
            lbl.startsWith(newBuf),
          );
          if (matches.length === 1 || inverseMap.has(newBuf)) {
            const nodeId =
              inverseMap.get(newBuf) ?? matches[0]?.[1];
            if (nodeId && graph) {
              const node = graph.nodes.find((n) => n.id === nodeId);
              if (node) {
                mapRef.current?.flyTo(node.position);
                setSelectedNode(node);
              }
            }
            setJumpMode(false);
            setJumpBuffer("");
          } else if (matches.length === 0) {
            setJumpMode(false);
            setJumpBuffer("");
          }
        }
        return;
      }

      if (e.key === "/" && !searchOpen) {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }

      if (twoKey === "zz" && selectedNode) {
        mapRef.current?.flyTo(selectedNode.position);
        return;
      }
      if (twoKey === "za") {
        mapRef.current?.fitAll();
        return;
      }

      if (!graph) return;
      const visibleNodes = displayGraph?.nodes ?? graph.nodes;

      const dirs: Record<string, "left" | "right" | "up" | "down"> = {
        h: "left", l: "right", k: "up", j: "down",
      };
      if (e.key in dirs) {
        e.preventDefault();
        const current = selectedNode ?? visibleNodes[0];
        if (!current) return;
        const next = nearestInDir(visibleNodes, current, dirs[e.key]);
        if (next) {
          setSelectedNode(next);
          mapRef.current?.flyTo(next.position);
        }
        return;
      }

      if (e.key === "f") {
        e.preventDefault();
        const newLabels = makeJumpLabels(visibleNodes.map((n) => n.id));
        setJumpLabels(newLabels);
        setJumpMode(true);
        setJumpBuffer("");
        return;
      }

      if (e.key === "Escape") {
        setSelectedNode(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [graph, displayGraph, selectedNode, searchOpen, jumpMode, jumpBuffer, jumpLabels]);

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
      <Sidebar
        repos={repos}
        loading={reposLoading}
        selectedFullName={selectedRepo?.fullName ?? null}
        onSelect={selectRepo}
        login={login}
        onOpenSettings={() => setSettingsOpen(true)}
      />

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
              <span
                className="brand-edge px-1.5 py-0.5 cursor-default"
                title="/ search · h/j/k/l navigate · f jump labels · zz center · za fit all"
              >
                / search
              </span>
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
            ref={mapRef}
            graph={displayGraph}
            selectedNodeId={selectedNode?.id ?? null}
            onSelectNode={setSelectedNode}
            jumpLabels={activeJumpLabels}
          />
        </div>
      </section>

      <InspectPanel
        node={selectedNode}
        owner={selectedRepo?.owner ?? null}
        repo={selectedRepo?.name ?? null}
        onClose={() => setSelectedNode(null)}
      />

      <ByokSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {searchOpen && displayGraph && (
        <CommandSearch
          graph={displayGraph}
          onSelect={setSelectedNode}
          onClose={() => setSearchOpen(false)}
          mapRef={mapRef}
        />
      )}

      {jumpMode && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 font-mono text-[11px] brand-edge px-3 py-1.5 bg-background">
          jump: {jumpBuffer || "type a label…"}{" "}
          <span className="text-[var(--muted)]">esc to cancel</span>
        </div>
      )}
    </main>
  );
}
