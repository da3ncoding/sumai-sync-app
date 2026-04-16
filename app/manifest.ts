import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SumaiSync",
    short_name: "SumaiSync",
    description: "2人で進める住まい探し",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#34d399",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
