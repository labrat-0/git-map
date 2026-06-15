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

## P1 — features (done)
4. ✅ Tags/releases badged on nodes (tagged commits stay discrete).
5. ✅ Hover preview card (summary, author, date, branches, tags) — `MapNodeView`.
6. ✅ Branch ahead/behind vs default branch on tips.
7. ✅ Drill into a run — already handled by InspectPanel's commit list.

## P2 — bigger bets
8. ⏸️ Private-repo opt-in — DEFERRED (2026-06-15). OAuth Apps only offer the
   broad `repo` scope (read+write all private); not worth the grant. Revisit via
   a fine-grained GitHub App if private mapping is ever needed.
9. ✅ AI run/range summary — `llm.ts` `summarizeRun`, surfaced in InspectPanel.
10. ⏸️ "Load more history" past 500 — DEFERRED (2026-06-15). Needs GraphQL
    cursors + graph merge + re-layout; low payoff for most repos.
11. ⏸️ Persistent/shared cache — DEFERRED (2026-06-15). In-memory LRU is adequate
    (survives between requests; only lost on redeploy; graphs have 60s TTL).

## P3 — polish/infra (done)
12. ✅ Error boundaries — `app/error.tsx` + `app/global-error.tsx`.
13. ✅ CI GitHub Action — `.github/workflows/ci.yml` (lint + test + build).
    Required fixing the long-standing `NodeAiSummaryBadge` set-state-in-effect
    lint error (cache now derived in render).
14. ✅ a11y pass — keyboard `:focus-visible` neon ring; bumped `--muted`
    contrast to clear WCAG AA on black.
