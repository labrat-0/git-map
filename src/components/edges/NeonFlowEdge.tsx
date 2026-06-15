"use client";

import { BaseEdge, getSmoothStepPath, type EdgeProps } from "@xyflow/react";

interface NeonEdgeData {
  onSpine?: boolean;
  onPath?: boolean;
  dim?: boolean;
}

export function NeonFlowEdge({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  data,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const { onSpine, onPath, dim } = (data ?? {}) as NeonEdgeData;

  // Visual weight: highlighted selection path > default-branch spine > side branch.
  // A dimmed edge (selection active, not on path) fades into the background.
  let glowWidth = 1.5;
  let glowOpacity = 0.55;
  let baseOpacity = 0.3;
  let dashDuration = "1.8s";
  if (dim) {
    glowOpacity = 0.1;
    baseOpacity = 0.06;
  } else if (onPath) {
    glowWidth = 2.6;
    glowOpacity = 1;
    baseOpacity = 0.5;
    dashDuration = "1.1s";
  } else if (onSpine) {
    glowWidth = 2.1;
    glowOpacity = 0.9;
    baseOpacity = 0.4;
    dashDuration = "1.4s";
  }

  return (
    <>
      <defs>
        <filter id={`glow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ stroke: "#ffffff", strokeWidth: 1, opacity: baseOpacity }}
      />
      <path
        d={edgePath}
        fill="none"
        stroke="#00ff41"
        strokeWidth={glowWidth}
        strokeDasharray="6 10"
        strokeLinecap="butt"
        filter={`url(#glow-${id})`}
        style={{
          animation: `neon-dash ${dashDuration} linear infinite`,
          opacity: glowOpacity,
        }}
      />
    </>
  );
}
