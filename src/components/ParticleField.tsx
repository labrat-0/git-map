"use client";

import { useEffect, useRef } from "react";

interface ParticleFieldProps {
  nodeCount?: number;
  edgeMaxDist?: number;
  edgeAlphaScale?: number;
  nodeAlphaFill?: number;
  nodeAlphaRing?: number;
  speedScale?: number;
  className?: string;
  style?: React.CSSProperties;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

export function ParticleField({
  nodeCount = 25,
  edgeMaxDist = 130,
  edgeAlphaScale = 1,
  nodeAlphaFill = 0.18,
  nodeAlphaRing = 0.22,
  speedScale = 1,
  className,
  style,
}: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let animId: number;
    let particles: Particle[] = [];

    function resize() {
      const newW = canvas!.offsetWidth;
      const newH = canvas!.offsetHeight;
      if (newW === 0 || newH === 0) return;
      const wasZero = W === 0 || H === 0;
      W = canvas!.width = newW;
      H = canvas!.height = newH;
      if (wasZero) initParticles();
    }

    function initParticles() {
      particles = Array.from({ length: nodeCount }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.35 * speedScale,
        vy: (Math.random() - 0.5) * 0.35 * speedScale,
        r: Math.random() * 2 + 1.5,
      }));
    }

    function draw() {
      ctx!.clearRect(0, 0, W, H);

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < edgeMaxDist) {
            const alpha = (1 - dist / edgeMaxDist) * 0.13 * edgeAlphaScale;
            ctx!.strokeStyle = `rgba(0,255,65,${alpha})`;
            ctx!.lineWidth = 0.7;
            ctx!.beginPath();
            ctx!.moveTo(particles[i].x, particles[i].y);
            ctx!.lineTo(particles[j].x, particles[j].y);
            ctx!.stroke();
          }
        }
      }

      for (const n of particles) {
        ctx!.fillStyle = `rgba(0,255,65,${nodeAlphaFill})`;
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx!.fill();

        ctx!.strokeStyle = `rgba(0,255,65,${nodeAlphaRing})`;
        ctx!.lineWidth = 0.5;
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, n.r + 3, 0, Math.PI * 2);
        ctx!.stroke();

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
    animId = requestAnimationFrame(draw);

    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [nodeCount, edgeMaxDist, edgeAlphaScale, nodeAlphaFill, nodeAlphaRing, speedScale]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={style}
    />
  );
}
