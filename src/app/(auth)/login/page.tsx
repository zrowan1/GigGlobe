"use client";

import { useActionState } from "react";

import { authenticate } from "@/app/(auth)/login/actions";
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

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(authenticate, {});

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">🌍 GigGlobe</CardTitle>
          <CardDescription>
            Log in met je e-mailadres en wachtwoord.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">E-mailadres</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="jij@voorbeeld.nl"
                autoComplete="email"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Wachtwoord</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Bezig met inloggen…" : "Inloggen"}
            </Button>
            {state.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
