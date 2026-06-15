# git-map Enhancement Plan

Living roadmap from the 2026-06-15 app review. Tiered by value/effort.
P0 = current sprint.

## Findings (why)
- `@octokit/graphql` is a dependency but unused; `api/graph` fetches branches
  serially over REST → slow + rate-limit heavy on large repos.
- No automated tests (~3400 LOC). Pure logic (`graph.ts`, `layout.ts`, `byok.ts`)
  is untested and high-churn.
- No security headers / CSP; BYOK keys live in `localStorage` (XSS exposure).
- Public repos only (`read:user`); in-memory-only cache (lost per deploy);
  single-commit AI summaries only; hard 500-commit / 25-branch cap.

## P0 — foundation (this sprint)
1. **Security headers + CSP** — `next.config.ts` `headers()`: CSP, X-Frame-Options,
   Referrer-Policy, X-Content-Type-Options. Mitigates BYOK key theft.
2. **Unit tests (Vitest)** — cover `graph.ts` (run collapsing, merges, branch tips),
   `layout.ts` (deterministic positions), `byok.ts`. First safety net; guards #3.
3. **GraphQL graph fetch** — replace serial REST in `api/graph/[owner]/[repo]/route.ts`
   with a single `@octokit/graphql` query (refs → commit history + parents).
   Keep `RawBranch`/`RawCommit` shape so `buildGraph`/`layout` are untouched.
   Fall back / preserve `truncated` semantics + rate-limit handling.

## P1 — features
4. Tags/releases badged on nodes.
5. Hover preview tooltip (full message + stats) — `MapNodeView`.
6. Branch ahead/behind vs default branch on tips.
7. Expand/collapse collapsed "N commits" run nodes.

## P2 — bigger bets
8. Private-repo opt-in (second OAuth scope tier).
9. AI range/branch/whole-repo summaries — `llm.ts`.
10. "Load more history" time-windowed pagination past the 500 cap.
11. Persistent/shared cache (Upstash Redis or Fly volume).

## P3 — polish/infra
12. Error boundaries + richer empty/error states.
13. CI GitHub Action (lint + test + build).
14. a11y / contrast pass on the neon theme.
