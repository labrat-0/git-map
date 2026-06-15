"use client";

import { useEffect } from "react";

/** Route-segment error boundary. Catches render/runtime errors below the layout. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-5 bg-background text-foreground px-6 text-center">
      <div className="font-mono text-[11px] tracking-widest text-[#00ff41]/70 uppercase">
        something broke
      </div>
      <p className="font-mono text-[12px] text-[var(--muted)] max-w-md leading-relaxed">
        The map hit an unexpected error. Your session is intact — try again.
        {error.digest && (
          <span className="block mt-2 opacity-60">ref: {error.digest}</span>
        )}
      </p>
      <button
        onClick={reset}
        className="brand-edge px-3 py-1.5 text-[12px] font-mono hover:brand-edge-invert hover:bg-white hover:text-black transition-colors focus-ring"
      >
        retry
      </button>
    </div>
  );
}
