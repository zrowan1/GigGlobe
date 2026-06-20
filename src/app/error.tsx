"use client";

// Catches unexpected errors in any route below the root layout and shows a
// friendly Dutch message with a retry button instead of a blank screen.

import { useEffect } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to the server/browser console so the cause is recoverable.
    console.error(error);
  }, [error]);

  return (
    <main className="flex h-svh w-full flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-4xl">😵</p>
      <div>
        <h1 className="text-xl font-semibold">Er ging iets mis</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Probeer het opnieuw. Blijft het misgaan, herlaad dan de pagina.
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={reset}>Opnieuw proberen</Button>
        <Button asChild variant="outline">
          <Link href="/">Naar de kaart</Link>
        </Button>
      </div>
    </main>
  );
}
