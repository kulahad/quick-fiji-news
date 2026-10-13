import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quick Fiji News",
    short_name: "Fiji News",
    description: "The latest headlines from Fiji and the Pacific.",
    start_url: "/",
    display: "standalone",
    background_color: "#fffaf0",
    theme_color: "#123943",
    icons: [
      {
        src: "/icon-192-v4.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512-v4.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-v4.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
