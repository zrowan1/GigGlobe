import NextAuth from "next-auth";

import { authConfig } from "@/lib/auth.config";

// Auth.js provides the middleware from the edge-safe config. It runs the
// `authorized` callback on every matched request to enforce login.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and images.
     *
     * `api/media/upload` is excluded on purpose: when a request passes through
     * middleware, Next.js buffers its body in memory with a 10MB default cap,
     * which silently truncated large video uploads. That route streams the body
     * straight to disk and does its own `auth()` check, so it neither needs the
     * middleware nor should be subject to the body cap.
     *
     * `sw.js`, the Serwist worker chunks and `manifest.webmanifest` are public
     * PWA assets: they must stay fetchable without a session so the app can be
     * installed, otherwise the auth redirect would serve login HTML instead.
     */
    "/((?!api/media/upload|_next/static|_next/image|favicon.ico|sw.js|swe-worker-.*\\.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
