import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/lib/auth";
import { listArtists, listVenues } from "@/lib/db/queries";
import { createGig } from "@/app/gigs/actions";
import { GigForm } from "@/components/gigs/gig-form";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

// "New gig" page. It loads your existing artists and venues so the form can
// suggest them (no duplicate "Kendrick Lamar" in the database).
export default async function NewGigPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [artists, venues] = await Promise.all([
    listArtists(session.user.id),
    listVenues(session.user.id),
  ]);

  return (
    <main className="mx-auto w-full max-w-lg p-4">
      <div className="mb-6 flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link href="/gigs" aria-label="Terug naar overzicht">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">Nieuw optreden</h1>
        <ThemeToggle className="ml-auto shrink-0" />
      </div>

      <GigForm
        artists={artists}
        venues={venues}
        action={createGig}
        submitLabel="Optreden opslaan"
      />
    </main>
  );
}
