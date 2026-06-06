# git-map Login Hero Redesign — Design Spec

## Context

The current login screen is a plain centered card with a small logo and "connect github" link. The goal is a full-screen hero landing page that sells the product visually before asking the user to sign in — marketable, atmospheric, on-brand.

## Design Direction

**Hero Full-Screen** with animated git-topology background.

## Visual Design

### Layout
Full viewport (`h-screen w-screen`), black background, all content centered vertically and horizontally. No scrolling. Single-action page — one CTA, no nav.

### Background
Canvas element filling the full screen. Draws ~25 nodes (circles, ~1.5–3.5px radius) connected by edges when within 120px of each other. All elements in `#00ff41` at ~12–18% opacity. Nodes drift slowly (0.2–0.4px/frame), wrapping at viewport edges. Runs in `requestAnimationFrame` loop. No external library — native Canvas API only.

### Center Content Stack (vertical, centered)
1. **Icon** — `/icons/icon_192x192.png`, 72×72px. CSS `drop-shadow` glow in `#00ff41` (two layers: tight 14px + loose 28px at 33% opacity). A `radial-gradient` pulse div behind it animates opacity 0.6→1 and scale 1→1.15 over 3s ease-in-out loop.
2. **Wordmark** — `"git-map"`, `font-mono`, 36px, `#ffffff`, subtle white text-shadow.
3. **Tagline** — `"interactive branch topology"`, 11px, `letter-spacing: 0.22em`, `uppercase`, `#00ff41` at 75% opacity.
4. **CTA button** — `<a href="/api/auth/login">`, styled as button. `1px solid #00ff41` border, `#00ff41` text, transparent background, inner glow (`box-shadow: 0 0 24px #00ff4118, inset 0 0 24px #00ff4108`), `letter-spacing: 0.18em`, uppercase, `font-mono`. Hover: fill `#00ff41`, text `#000000`, outer glow intensifies. Label: `"⬡ connect github"`.
5. **Fine print** — `"public repos only · no data stored"`, 10px, `#2a2a2a` (barely visible).

### Footer Attribution
Fixed bottom-center. `"presented by ratlabs.tech"`, 10px `font-mono`, `color: #333`. Entire text is an `<a href="https://ratlabs.tech" target="_blank" rel="noopener">` that lightens to `#555` on hover. No underline by default.

### Error Handling
Preserve existing toast behavior: on mount, read `?error=oauth_state` / `?error=oauth_token` from URL and show Sonner toast (already implemented in `LoginScreen.tsx`).

## Technical Constraints

- **Zero border-radius** — global `border-radius: 0 !important` is already set in `globals.css`. Do not override.
- **Font** — `font-mono` (Geist Mono via CSS var). No new font imports.
- **No new dependencies** — Canvas API only for animation. No animation libraries.
- **CSS vars** — use `--background`, `--foreground`, `--muted` where appropriate. The neon green `#00ff41` is introduced as a login-page accent only; do not add it to `:root` globals.
- **Existing auth flow unchanged** — `<a href="/api/auth/login">` stays as-is.

## Files Modified

| File | Change |
|------|--------|
| `src/components/LoginScreen.tsx` | Full rewrite of JSX. Canvas animation added via `useEffect` + `useRef`. All other logic (error toasts) preserved. |

No other files change.

## Verification

1. Run `npm run dev`, open `http://localhost:3000` while logged out — see hero page.
2. Confirm: canvas animates (nodes drift, edges draw/fade), icon pulses, CTA glows.
3. Hover CTA — background fills `#00ff41`, text goes black.
4. Click CTA — navigates to GitHub OAuth (same-tab, existing behavior).
5. Visit `/?error=oauth_state` — Sonner toast appears.
6. Click "ratlabs.tech" attribution — opens `https://ratlabs.tech` in new tab.
7. Run `npm run build` — no TypeScript or lint errors.
8. Resize window — canvas resizes, content stays centered.
