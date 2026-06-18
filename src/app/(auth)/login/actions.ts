"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/lib/auth";

export interface LoginState {
  error?: string;
}

// Server action for the login form. Calls Auth.js signIn with the email +
// password. On success signIn throws a redirect (to "/") which must propagate;
// on bad credentials it throws an AuthError which we turn into a message.
export async function authenticate(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "E-mailadres of wachtwoord klopt niet." };
    }
    // Re-throw the redirect (and anything unexpected) so Next.js handles it.
    throw error;
  }
}
