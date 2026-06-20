import Link from "next/link";

import { Button } from "@/components/ui/button";

// Shown for unknown URLs and whenever a page calls notFound().
export default function NotFound() {
  return (
    <main className="flex h-svh w-full flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-4xl">🌍</p>
      <div>
        <h1 className="text-xl font-semibold">Pagina niet gevonden</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Deze pagina bestaat niet (meer).
        </p>
      </div>
      <Button asChild>
        <Link href="/">Terug naar de kaart</Link>
      </Button>
    </main>
  );
}
