import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "@/lib/auth.config";
import { verifyCredentials } from "@/lib/credentials";

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
      // Verify the login (see src/lib/credentials.ts). Return the user on
      // success, or null to reject (Auth.js then shows a CredentialsSignin
      // error).
      authorize: async (credentials) =>
        verifyCredentials(credentials?.email, credentials?.password),
    }),
  ],
});
