"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function LoginForm() {
  const searchParams = useSearchParams();
  const linkError = searchParams.get("error") === "auth";

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setStatus(error ? "error" : "sent");
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">🌍 GigGlobe</CardTitle>
        <CardDescription>
          Log in met je e-mailadres. Je krijgt een inloglink gemaild — geen
          wachtwoord nodig.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === "sent" ? (
          <p className="text-sm">
            ✅ Check je inbox! We hebben een inloglink gestuurd naar{" "}
            <strong>{email}</strong>. De link werkt één keer.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4">
            {linkError && (
              <p className="text-sm text-destructive">
                Die inloglink is verlopen of al gebruikt. Vraag hieronder een
                nieuwe aan.
              </p>
            )}
            <div className="grid gap-2">
              <Label htmlFor="email">E-mailadres</Label>
              <Input
                id="email"
                type="email"
                placeholder="jij@voorbeeld.nl"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={status === "sending"}>
              {status === "sending" ? "Versturen..." : "Stuur inloglink"}
            </Button>
            {status === "error" && (
              <p className="text-sm text-destructive">
                Er ging iets mis. Probeer het opnieuw.
              </p>
            )}
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
