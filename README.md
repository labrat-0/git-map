# git-map

> Interactive 2D map of any GitHub repo's branch/commit topology — connect GitHub, pick a
> repo, explore the structure visually, and get optional AI summaries of individual commits.

**Status:** scaffolding / pre-build. This README is the source of truth for scope and intent.
It is written for two readers: the human owner and any AI agent picking up the work.

---

## What this is

A web-only, multi-tenant dashboard. A visitor signs in with GitHub, sees their **public**
repositories in a left sidebar, selects one, and is shown a top-down, zoomable 2D map (a ZUI)
of that repo's branches and commits. Clicking a node opens a side drawer with the raw commit
diff and an **optional** AI-generated 3-bullet plain-English summary of what changed.

It is intended to live as a private project during local testing, then be exposed as a subpage
of **ratlabs.tech** (via CNAME / subdomain) once stable.

## Why it exists / intent

- A fast, distinctive way to grok a repo's history at a glance — branches, merges, and the
  shape of work — without reading `git log` walls of text.
- Zero operator cost and zero liability: the operator never holds an LLM key and never proxies
  any AI traffic. AI is strictly opt-in and Bring-Your-Own-Key.
- Aligns with the ratlabs.tech house aesthetic: high-contrast monochrome, sharp, terminal-grade.

## Confirmed decisions (v1)

| Area | Decision |
|------|----------|
| Auth | GitHub **OAuth App** ("Sign in with GitHub") |
| AI | **BYOK only** (Bring Your Own Key). Optional feature. Operator holds no key, proxies no LLM traffic, carries no token cost or data-handling liability. |
| Repo scope | **Public repos only**. No private-repo data egress in v1. |
| Map model | **Collapse linear commit runs** into one expandable node; branches/merges stay distinct. Keeps large repos readable. |
| Input | Mouse/trackpad primary. Keyboard spatial nav is a later power-user enhancement. |
| Privacy of this repo | **Private** during dev; will be made reachable as a ratlabs.tech subpage later. |

## How it works (architecture)

```
Browser (Next.js / React Flow)
   |  httpOnly session cookie (GitHub token NEVER exposed to client JS)
   v
Next.js API routes (server, deployed on Vercel)
   |- /api/auth/login                 -> redirect to GitHub OAuth (CSRF `state`)
   |- /api/auth/callback              -> exchange code->token (client_secret server-side), set session
   |- /api/repos                      -> list the user's PUBLIC repos (Octokit)
   |- /api/graph/[owner]/[repo]       -> GraphQL history -> collapse linear runs -> node/edge JSON -> dagre layout
   |- /api/diff/[owner]/[repo]/[sha]  -> REST commit diff (lazy, on node click)
   v
GitHub API
```

**AI summary path deliberately bypasses the server.** The "Summarize" action calls the user's
chosen endpoint (OpenRouter or compatible) **directly from the browser** with the user's own
key. The key lives only in browser `localStorage` (explicit local-only disclosure on entry).
The operator server never sees the key or the request/response. This is the core liability
guarantee — keep it intact.

### Deployment reality

The existing site `labrat-0.github.io` is a **static GitHub Pages** site and **cannot** host
OAuth token exchange (needs `client_secret`) or API routes. `git-map` is therefore a **separate
Vercel deployment** under a ratlabs.tech subdomain, linked from the main site. Do not try to
host the OAuth/server pieces on the static Pages site.

## Tech stack

Mirrors the existing `ratlabs-cc` house stack for consistency:

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui + base-ui/react + lucide-react + sonner
- zod (schema validation)
- [`@xyflow/react`](https://reactflow.dev) (React Flow) — the canvas
- `@dagrejs/dagre` — automated tree layout
- `@octokit/rest` + Octokit GraphQL — GitHub API access
- No database in v1 (see Caching). Upstash Redis is the planned option if a shared cache is added.

## Design language (strict ratlabs alignment)

- Background: absolute black `#000000`.
- Components & nodes: **zero** border-radius, **1px** solid white borders, high contrast.
- Hover / active: invert to solid white background, black text.
- Crisp 1px borders at any zoom: use `box-shadow: 0 0 0 1px #fff` (not `border`, which blurs
  under CSS transform) and round dagre node positions to the integer pixel grid.
- Typography: monospace for hashes / technical metadata; clean sans-serif for UI labels.

## Build order (planned)

1. OAuth flow + signed httpOnly session (login, callback, logout, CSRF `state`).
2. Sidebar: list user's public repos; monochrome, sharp, invert-on-hover; click to load map.
3. Graph builder API: GraphQL history -> collapse linear chains into expandable nodes -> dagre
   positions -> zod-validated node/edge schema.
4. Canvas: React Flow with `onlyRenderVisibleElements`, custom branded node, step edges,
   expand/collapse of collapsed runs.
5. Diff drawer: lazy fetch of `/api/diff`, raw diff in monospace, "Summarize with AI" button
   (enabled only when a key is saved).
6. BYOK settings: paste/clear key + pick model; `localStorage` only; local-only disclosure.

## Caching (v1, minimal)

- Commit diffs are immutable (SHA = content) -> cache `/api/diff` by SHA via `Cache-Control:
  immutable` + Vercel data cache. No DB needed.
- Graph responses: short TTL per repo (history changes on push).
- AI summaries: cached client-side in `localStorage`, keyed by `sha + model`. A shared
  Redis SHA-cache to dedup public-repo summaries across users is a possible future addition.

## Security notes (do not regress)

- GitHub `client_secret` and access token: **server-side only**, never shipped to the browser;
  token stored in a signed httpOnly cookie session.
- OAuth `state` parameter to prevent CSRF on the callback.
- OpenRouter / LLM key: **browser-only**, never sent to the operator server, never logged.
  The LLM call goes browser -> provider directly.
- v1 is public repos only -> no private code or diffs pass through the operator.
- Secrets (`client_secret`, session signing secret) live in environment variables on Vercel,
  never committed. `.env.local` is gitignored.

## Local development (once scaffolded)

```bash
# install
npm install            # or pnpm install

# env: create .env.local with
#   GITHUB_CLIENT_ID=...
#   GITHUB_CLIENT_SECRET=...
#   SESSION_SECRET=...           # random 32+ byte string
#   OAUTH_CALLBACK_URL=http://localhost:3000/api/auth/callback

npm run dev            # http://localhost:3000
npm run build          # production build
npm run lint           # eslint
```

Register a GitHub OAuth App (Settings -> Developer settings -> OAuth Apps) with the callback
URL above for local testing; add a second callback URL for the Vercel domain when deploying.

## For the agent picking this up

- The full approved implementation plan is the authority on sequencing; this README is the
  authority on scope, intent, and the non-negotiables (BYOK/liability, security notes, brand).
- Do not introduce a server-side LLM proxy or store the user's LLM key server-side — that
  breaks the core liability guarantee.
- Do not add private-repo support in v1 without revisiting consent + access-gated caching.
- Match the `ratlabs-cc` stack and the monochrome design language above.
