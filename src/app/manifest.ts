import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "git-map",
    short_name: "git-map",
    description:
      "Interactive 2D map of any GitHub repo's branch/commit topology.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/icons/icon_192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon_512x512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon_512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
