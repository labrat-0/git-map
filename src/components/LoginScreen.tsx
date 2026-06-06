"use client";

import { useEffect } from "react";
import { LogIn } from "lucide-react";
import { toast } from "sonner";

export function LoginScreen() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err === "oauth_state") toast.error("Sign-in expired. Try again.");
    if (err === "oauth_token") toast.error("GitHub rejected the sign-in.");
  }, []);

  return (
    <main className="flex-1 flex items-center justify-center">
      <div className="brand-edge max-w-md w-full mx-4 p-8 flex flex-col gap-5">
        <div>
          <h1 className="font-mono text-2xl tracking-tight">git-map</h1>
          <p className="text-[13px] text-[var(--muted)] mt-2 leading-snug">
            An interactive 2D map of any GitHub repo&apos;s branch and commit
            topology. Connect your account, pick a public repo, and explore.
          </p>
        </div>

        <a
          href="/api/auth/login"
          className="brand-edge px-4 py-2 inline-flex items-center justify-center gap-2 font-mono text-[13px] hover:brand-edge-invert hover:bg-white hover:text-black transition-colors"
        >
          <LogIn size={16} />
          connect github
        </a>

        <p className="text-[10px] text-[var(--muted)] leading-snug">
          v1 reads public repositories only. AI summaries are optional and use
          your own OpenRouter key, sent directly from your browser — never to
          this server.
        </p>
      </div>
    </main>
  );
}
