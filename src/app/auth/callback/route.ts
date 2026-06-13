import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// The magic link in the login email points here.
// We exchange the one-time code for a session cookie, then send the user home.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // On Vercel the request host is behind a proxy, so we trust the
      // forwarded host to redirect to the real public domain (not the
      // internal one). Locally we just use the request origin.
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocal = process.env.NODE_ENV === "development";

      if (!isLocal && forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Something went wrong (expired or already-used link).
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
