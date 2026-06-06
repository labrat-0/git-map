"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { GitBranch, GitMerge, Layers } from "lucide-react";
import type { MapNode } from "@/lib/types";
import { cn } from "@/lib/utils";

/** React Flow node data is the MapNode minus the fields RF owns. */
export type MapNodeData = Omit<MapNode, "position">;

const icon = {
  commit: null,
  run: Layers,
  merge: GitMerge,
  branch: GitBranch,
} as const;

export function MapNodeView({ data, selected }: NodeProps) {
  const node = data as unknown as MapNodeData;
  const Icon = icon[node.kind];

  return (
    <div
      className={cn(
        "brand-edge w-[220px] h-[64px] px-3 py-2 flex flex-col justify-center gap-0.5 bg-background text-foreground transition-colors cursor-pointer overflow-hidden",
        "hover:brand-edge-invert hover:bg-[var(--hover-bg)] hover:text-[var(--hover-fg)]",
        selected && "brand-edge-invert bg-[var(--hover-bg)] text-[var(--hover-fg)]",
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-foreground !border-0 !w-1.5 !h-1.5" />
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
      </div>
      <div className="text-[12px] leading-tight truncate" title={node.summary}>
        {node.summary || "(no message)"}
      </div>
      <div className="font-mono text-[9px] text-[var(--muted)] truncate">
        {node.author ?? "unknown"}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-foreground !border-0 !w-1.5 !h-1.5" />
    </div>
  );
}
