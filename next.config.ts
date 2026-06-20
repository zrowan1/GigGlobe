import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  // Build a self-contained Node server (.next/standalone) so the Docker image
  // can run the app with `node server.js` without the full node_modules tree.
  output: "standalone",
  // Pin the file-tracing root to this project. Without it Next can pick a
  // parent directory (if there's a stray lockfile higher up) and trace the
  // wrong files into the standalone bundle.
  outputFileTracingRoot: process.cwd(),
  // Make sure sharp (used for photo thumbnails in the media upload route) and
  // its native binaries are copied into the standalone bundle. Without this the
  // app builds fine locally but thumbnail generation can crash in the Docker
  // image because the native module isn't traced.
  outputFileTracingIncludes: {
    "/api/media/upload": ["./node_modules/sharp/**/*", "./node_modules/@img/**/*"],
  },
};

// Wrap the config with Serwist so it compiles src/app/sw.ts into public/sw.js
// and registers the service worker. Disabled in development to avoid caching
// getting in the way while you work.
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(nextConfig);
