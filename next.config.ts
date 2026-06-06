import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone build for the Fly.io Docker runner (`node server.js`).
  output: "standalone",
};

export default nextConfig;
