import type { NextAuthConfig } from "next-auth";

// Edge-safe Auth.js config. This part is imported by the middleware, which runs
// on the Edge runtime where the database driver (pg) and bcrypt do NOT work.
// So it deliberately contains NO providers/db logic — only the session
// strategy, the login page route and the route-protection rules.
//
// The full config (with the Credentials provider) lives in src/lib/auth.ts and
// spreads this object in.
export const authConfig = {
  // Sessions live in a signed JWT cookie (no sessions table needed).
  session: { strategy: "jwt" },
  // Where Auth.js sends people who need to log in.
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    // Runs in the middleware on every matched request. Returning false sends
    // the visitor to the signIn page; returning a Response redirects.
    authorized({ auth, request }) {
      const loggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      // Never interfere with Auth.js's own endpoints (login, logout, etc.).
      if (pathname.startsWith("/api/auth")) return true;

      const onLogin = pathname.startsWith("/login");
      if (onLogin) {
        // Already logged in? Skip the login page, go home.
        if (loggedIn) return Response.redirect(new URL("/", request.nextUrl));
        return true;
      }

      // Every other page requires a logged-in user.
      return loggedIn;
    },
    // Expose the user id (stored as the JWT `sub`) on the session so queries
    // can scope on it. Edge-safe: only reads the token, no database.
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;
