"use client";

import { forwardRef } from "react";
import dynamic from "next/dynamic";
import { MapContext } from "./nodes/MapContext";
import type { Graph, MapNode } from "@/lib/types";

// WebGL force graph is client-only (relies on browser APIs). Disable SSR.
// ssr:false is permitted here because this is a Client Component.
const RepoMap3D = dynamic(
  () => import("./RepoMap3D").then((m) => m.RepoMap3D),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center text-xs text-[#00ff41]/60">
        loading map…
      </div>
    ),
  },
);

export interface RepoMapHandle {
  /** Legacy {x,y} fly — retained for type compat; prefer flyToId in 3D. */
  flyTo(position: { x: number; y: number }): void;
  /** Fly the camera to a node by id. */
  flyToId(id: string): void;
  fitAll(): void;
}

interface RepoMapProps {
  graph: Graph | null;
  selectedNodeId: string | null;
  onSelectNode: (node: MapNode) => void;
  jumpLabels?: Map<string, string>;
}

export const RepoMap = forwardRef<RepoMapHandle, RepoMapProps>(
  function RepoMap({ graph, selectedNodeId, onSelectNode }, ref) {
    return (
      <MapContext.Provider
        value={{ owner: graph?.owner ?? "", repo: graph?.repo ?? "" }}
      >
        <RepoMap3D
          ref={ref}
          graph={graph}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
        />
      </MapContext.Provider>
    );
  },
);
