"use client";

import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn("animate-pulse bg-white/[0.07]", className)}
      style={style}
      aria-hidden
    />
  );
}

/** A stack of skeleton lines mimicking loading content. */
export function SkeletonLines({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3"
          style={{ width: `${70 + ((i * 37) % 25)}%` } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

/** Skeleton that mimics the map graph while loading. */
export function SkeletonMap() {
  const boxes = [
    { w: 220, h: 64, x: "50%", delay: "0ms" },
    { w: 220, h: 64, x: "20%", delay: "80ms" },
    { w: 220, h: 64, x: "70%", delay: "120ms" },
    { w: 220, h: 64, x: "35%", delay: "40ms" },
    { w: 220, h: 64, x: "60%", delay: "160ms" },
  ];
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 pointer-events-none px-12">
      {boxes.map((b, i) => (
        <Skeleton
          key={i}
          className="shrink-0"
          style={
            {
              width: b.w,
              height: b.h,
              marginLeft: `calc(${b.x} - ${b.w / 2}px)`,
              animationDelay: b.delay,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
