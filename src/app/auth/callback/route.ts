import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// The magic link in the login email points here.
// We exchange the one-time code for a session cookie, then send the user home.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/`);
    }
  }

  // Something went wrong (expired or already-used link).
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
