"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { GitBranch, GitMerge, Layers, Tag } from "lucide-react";
import type { MapNode } from "@/lib/types";
import { cn } from "@/lib/utils";
import { NodeAiSummaryBadge } from "./NodeAiSummaryBadge";

/** React Flow node data is the MapNode minus the fields RF owns. */
export type MapNodeData = Omit<MapNode, "position"> & {
  jumpLabel?: string;
  /** Selection active and this node is not on the highlighted ancestor path. */
  dim?: boolean;
  /** Node lies on the default-branch ancestry (the spine). */
  onSpine?: boolean;
};

const icon = {
  commit: null,
  run: Layers,
  merge: GitMerge,
  branch: GitBranch,
} as const;

function HeatRing({ shas, kind }: { shas: string[]; kind: MapNode["kind"] }) {
  if (kind !== "run" || shas.length < 2) return null;
  const norm = Math.min(shas.length / 20, 1);
  const strokeOpacity = 0.3 + norm * 0.5;
  const fillOpacity = strokeOpacity * 0.3;
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 16 16"
      className="shrink-0"
    >
      <title>{shas.length} commits</title>
      <circle
        cx="8"
        cy="8"
        r="6"
        fill="none"
        stroke="#00ff41"
        strokeWidth={1.5}
        opacity={strokeOpacity}
      />
      <circle
        cx="8"
        cy="8"
        r={6 * norm}
        fill="#00ff41"
        opacity={fillOpacity}
      />
    </svg>
  );
}

export function MapNodeView({ data, selected }: NodeProps) {
  const node = data as unknown as MapNodeData;
  const Icon = icon[node.kind];

  return (
    <div
      className={cn(
        "group map-node-3d w-[220px] h-[88px] px-3 py-2 flex flex-col justify-start gap-0.5 bg-background text-foreground transition-colors cursor-pointer overflow-visible relative",
        "hover:brand-edge-invert hover:bg-[var(--hover-bg)] hover:text-[var(--hover-fg)]",
        selected && "brand-edge-invert is-selected bg-[var(--hover-bg)] text-[var(--hover-fg)]",
      )}
      style={{
        filter: selected
          ? "drop-shadow(0 0 6px #00ff41) drop-shadow(0 0 12px rgba(0,255,65,0.5))"
          : node.onSpine
            ? "drop-shadow(0 0 4px rgba(0,255,65,0.45))"
            : "drop-shadow(0 0 3px rgba(0,255,65,0.2))",
        opacity: node.dim ? 0.28 : 1,
        transition:
          "filter 0.15s ease, opacity 0.2s ease, background 0.2s, color 0.2s",
      }}
    >
      {node.jumpLabel && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <span className="font-mono text-[18px] font-bold tracking-widest text-white">
            {node.jumpLabel}
          </span>
        </div>
      )}
      <Handle type="target" position={Position.Top} className="!bg-foreground !border-0 !w-1.5 !h-1.5" />

      {/* Row 1: icon + SHA label + branch badges */}
      <div className="flex items-center gap-1.5 min-w-0">
        {Icon ? <Icon size={12} className="shrink-0" /> : null}
        <span className="font-mono text-[11px] tracking-tight shrink-0">
          {node.label}
        </span>
        {node.branches.map((b) => (
          <span
            key={b}
            className="font-mono text-[9px] px-1 shrink-0 brand-edge"
            title={b}
          >
            {b}
          </span>
        ))}
        {node.tags.map((t) => (
          <span
            key={t}
            className="font-mono text-[9px] px-1 shrink-0 inline-flex items-center gap-0.5 text-[#ffb020] shadow-[0_0_0_1px_#ffb020]"
            title={`tag: ${t}`}
          >
            <Tag size={8} />
            {t}
          </span>
        ))}
        {(node.ahead != null || node.behind != null) &&
          (node.ahead || node.behind) ? (
          <span
            className="font-mono text-[9px] shrink-0 ml-auto text-[var(--muted)]"
            title={`${node.ahead ?? 0} ahead / ${node.behind ?? 0} behind default branch`}
          >
            ↑{node.ahead ?? 0} ↓{node.behind ?? 0}
          </span>
        ) : null}
      </div>

      {/* Hover detail card (escapes the node; pointer-events off so it never blocks clicks). */}
      <div className="pointer-events-none absolute left-1/2 bottom-full mb-2 -translate-x-1/2 z-50 hidden group-hover:block w-[240px] brand-edge bg-black px-3 py-2 text-left shadow-[0_8px_24px_rgba(0,0,0,0.8)]">
        <div className="text-[12px] leading-snug text-white whitespace-normal break-words">
          {node.summary || "(no message)"}
        </div>
        <div className="mt-1.5 font-mono text-[9px] text-[var(--muted)] flex flex-wrap gap-x-2 gap-y-0.5">
          <span>{node.author ?? node.authorLogin ?? "unknown"}</span>
          {node.date && <span>{node.date.slice(0, 10)}</span>}
          {node.kind === "run" && <span>{node.shas.length} commits</span>}
          {node.kind !== "run" && <span className="text-[#5aa]">{node.kind}</span>}
        </div>
        {(node.branches.length > 0 || node.tags.length > 0) && (
          <div className="mt-1 font-mono text-[9px] flex flex-wrap gap-1">
            {node.branches.map((b) => (
              <span key={b} className="text-white">⎇ {b}</span>
            ))}
            {node.tags.map((t) => (
              <span key={t} className="text-[#ffb020]">⌗ {t}</span>
            ))}
          </div>
        )}
      </div>

      {/* Row 2: commit summary */}
      <div className="text-[12px] leading-tight truncate" title={node.summary}>
        {node.summary || "(no message)"}
      </div>

      {/* Row 3: avatar + heat ring + AI badge + author */}
      <div className="flex items-center gap-1.5 min-w-0 mt-auto">
        {node.authorLogin && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`https://avatars.githubusercontent.com/${node.authorLogin}?s=48`}
            alt={node.authorLogin}
            width={16}
            height={16}
            className="shrink-0"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
        <HeatRing shas={node.shas} kind={node.kind} />
        <NodeAiSummaryBadge sha={node.shas[0]} />
        <span className="font-mono text-[9px] text-[var(--muted)] truncate shrink">
          {node.author ?? node.authorLogin ?? "unknown"}
        </span>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-foreground !border-0 !w-1.5 !h-1.5" />
    </div>
  );
}
