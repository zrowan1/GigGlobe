import type { MetadataRoute } from "next";

// The web app manifest. Next serves this at /manifest.webmanifest and it tells
// the phone how to install GigGlobe to the homescreen: name, icon, colors and
// "standalone" display (open without browser chrome, like a native app).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GigGlobe",
    short_name: "GigGlobe",
    description: "Jouw concertgeschiedenis op de wereldkaart",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0613",
    theme_color: "#0a0613",
    lang: "nl",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
