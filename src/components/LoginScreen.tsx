"use client";

import { useEffect, useRef } from "react";
import { LogIn } from "lucide-react";
import { toast } from "sonner";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

export function LoginScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Preserve existing error-toast behavior from OAuth redirect.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err === "oauth_state") toast.error("Sign-in expired. Try again.");
    if (err === "oauth_token") toast.error("GitHub rejected the sign-in.");
  }, []);

  // Animated git-topology node graph on canvas.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const NODE_COUNT = 25;
    const EDGE_MAX_DIST = 130;
    let W = 0;
    let H = 0;
    let animId: number;
    let nodes: Node[] = [];

    function resize() {
      W = canvas!.width = canvas!.offsetWidth;
      H = canvas!.height = canvas!.offsetHeight;
    }

    function initNodes() {
      nodes = Array.from({ length: NODE_COUNT }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 2 + 1.5,
      }));
    }

    function draw() {
      ctx!.clearRect(0, 0, W, H);

      // Draw edges between nearby nodes.
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < EDGE_MAX_DIST) {
            const alpha = (1 - dist / EDGE_MAX_DIST) * 0.13;
            ctx!.strokeStyle = `rgba(0,255,65,${alpha})`;
            ctx!.lineWidth = 0.7;
            ctx!.beginPath();
            ctx!.moveTo(nodes[i].x, nodes[i].y);
            ctx!.lineTo(nodes[j].x, nodes[j].y);
            ctx!.stroke();
          }
        }
      }

      // Draw nodes: filled circle + outer ring.
      for (const n of nodes) {
        ctx!.fillStyle = "rgba(0,255,65,0.18)";
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx!.fill();

        ctx!.strokeStyle = "rgba(0,255,65,0.22)";
        ctx!.lineWidth = 0.5;
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, n.r + 3, 0, Math.PI * 2);
        ctx!.stroke();

        // Update position, wrap at edges.
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -20) n.x = W + 20;
        if (n.x > W + 20) n.x = -20;
        if (n.y < -20) n.y = H + 20;
        if (n.y > H + 20) n.y = -20;
      }

      animId = requestAnimationFrame(draw);
    }

    resize();
    initNodes();
    draw();

    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return (
    <main className="h-screen w-screen relative overflow-hidden flex items-center justify-center bg-black">
      {/* Animated background canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Icon with radial glow + pulse */}
        <div className="relative mb-6">
          <div
            className="absolute"
            style={{
              inset: "-20px",
              background:
                "radial-gradient(circle, rgba(0,255,65,0.18) 0%, transparent 70%)",
              animation: "gm-pulse 3s ease-in-out infinite",
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/icon_192x192.png"
            alt="git-map"
            width={72}
            height={72}
            className="relative block"
            style={{
              filter:
                "drop-shadow(0 0 14px #00ff41) drop-shadow(0 0 28px rgba(0,255,65,0.4))",
            }}
          />
        </div>

        {/* Wordmark */}
        <h1
          className="font-mono text-4xl font-normal tracking-wide mb-2"
          style={{ textShadow: "0 0 40px rgba(255,255,255,0.12)" }}
        >
          git-map
        </h1>

        {/* Tagline */}
        <p
          className="font-mono text-[11px] uppercase tracking-[0.22em] mb-10"
          style={{ color: "rgba(0,255,65,0.75)" }}
        >
          interactive branch topology
        </p>

        {/* CTA */}
        <a
          href="/api/auth/login"
          className="font-mono text-[12px] uppercase tracking-[0.18em] inline-flex items-center gap-2.5 px-8 py-3 mb-4 transition-all duration-150"
          style={{
            border: "1px solid #00ff41",
            color: "#00ff41",
            boxShadow:
              "0 0 24px rgba(0,255,65,0.09), inset 0 0 24px rgba(0,255,65,0.05)",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget;
            el.style.background = "#00ff41";
            el.style.color = "#000000";
            el.style.boxShadow = "0 0 40px rgba(0,255,65,0.3)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget;
            el.style.background = "transparent";
            el.style.color = "#00ff41";
            el.style.boxShadow =
              "0 0 24px rgba(0,255,65,0.09), inset 0 0 24px rgba(0,255,65,0.05)";
          }}
        >
          <LogIn size={14} />
          connect github
        </a>

        {/* Fine print */}
        <p
          className="font-mono text-[10px] tracking-[0.1em]"
          style={{ color: "#2a2a2a" }}
        >
          public repos only · no data stored
        </p>
      </div>

      {/* Footer attribution */}
      <div className="absolute bottom-5 left-0 right-0 flex justify-center">
        <a
          href="https://ratlabs.tech"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[10px] tracking-[0.12em] no-underline transition-colors duration-150"
          style={{ color: "#2a2a2a" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#555555";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#2a2a2a";
          }}
        >
          presented by ratlabs.tech
        </a>
      </div>
    </main>
  );
}
