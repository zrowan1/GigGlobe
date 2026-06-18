import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { authConfig } from "@/lib/auth.config";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

// Full Auth.js config, used by the API route handler and server actions (Node
// runtime). It adds the email + password provider on top of the edge-safe
// authConfig.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Wachtwoord", type: "password" },
      },
      // Verify the login: look up the user by email and compare the password
      // against the stored bcrypt hash. Return the user on success, or null to
      // reject (Auth.js then shows a CredentialsSignin error).
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email };
      },
    }),
  ],
});
