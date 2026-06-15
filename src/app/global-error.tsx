"use client";

import { useEffect } from "react";

/** Root error boundary — replaces the whole document if the layout itself throws. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          height: "100vh",
          margin: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "20px",
          background: "#000000",
          color: "#ffffff",
          fontFamily: "monospace",
          textAlign: "center",
          padding: "0 24px",
        }}
      >
        <div style={{ color: "rgba(0,255,65,0.7)", letterSpacing: "0.2em", fontSize: 11 }}>
          FATAL ERROR
        </div>
        <p style={{ color: "#8a8a8a", fontSize: 12, maxWidth: 420, lineHeight: 1.6 }}>
          git-map failed to load.
          {error.digest && <span style={{ display: "block", marginTop: 8, opacity: 0.6 }}>ref: {error.digest}</span>}
        </p>
        <button
          onClick={reset}
          style={{
            boxShadow: "0 0 0 1px #ffffff",
            background: "#000000",
            color: "#ffffff",
            fontFamily: "monospace",
            fontSize: 12,
            padding: "6px 12px",
            cursor: "pointer",
            border: 0,
          }}
        >
          reload
        </button>
      </body>
    </html>
  );
}
