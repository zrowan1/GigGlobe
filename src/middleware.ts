import NextAuth from "next-auth";

import { authConfig } from "@/lib/auth.config";

// Auth.js provides the middleware from the edge-safe config. It runs the
// `authorized` callback on every matched request to enforce login.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and images.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
