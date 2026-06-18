import type { DefaultSession } from "next-auth";

// Add the user id to the session type. We set it from the JWT in the session
// callback (see src/lib/auth.config.ts) and use it to scope database queries.
declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}
