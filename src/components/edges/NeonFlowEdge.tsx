"use client";

import { BaseEdge, getSmoothStepPath, type EdgeProps } from "@xyflow/react";

export function NeonFlowEdge({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

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
        style={{ stroke: "#ffffff", strokeWidth: 1, opacity: 0.35 }}
      />
      <path
        d={edgePath}
        fill="none"
        stroke="#00ff41"
        strokeWidth={1.5}
        strokeDasharray="6 10"
        strokeLinecap="butt"
        filter={`url(#glow-${id})`}
        style={{ animation: "neon-dash 1.8s linear infinite", opacity: 0.7 }}
      />
    </>
  );
}
