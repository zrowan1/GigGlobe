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
     */
    "/((?!api/media/upload|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
