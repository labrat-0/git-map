import type { NextConfig } from "next";

// CSP. Notes on the looser directives:
// - script/style 'unsafe-inline': Next App Router injects inline hydration
//   scripts and libraries (sonner, React Flow) set inline styles. A nonce-based
//   policy would need middleware; deferred.
// - connect-src https:: BYOK sends AI requests from the browser directly to a
//   user-supplied provider base URL (any https host), so we cannot enumerate it.
// - frame-ancestors 'none': the app is meant to be linked to, not embedded.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "img-src 'self' data: https://avatars.githubusercontent.com",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self' https:",
  "form-action 'self' https://github.com",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  // Standalone build so the app can run as `node server.js` in any container.
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
