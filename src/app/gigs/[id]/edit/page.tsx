import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/lib/auth";
import { getGig, listArtists, listVenues } from "@/lib/db/queries";
import { updateGig } from "@/app/gigs/actions";
import { GigForm } from "@/components/gigs/gig-form";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

// Edit page. It reuses the exact same GigForm as "new", but pre-filled with
// the existing gig and wired to the updateGig action.
export default async function EditGigPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [gig, artists, venues] = await Promise.all([
    getGig(session.user.id, id),
    listArtists(session.user.id),
    listVenues(session.user.id),
  ]);

  if (!gig) notFound();

  return (
    <main className="mx-auto w-full max-w-lg p-4">
      <div className="mb-6 flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/gigs/${gig.id}`} aria-label="Terug">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">Optreden bewerken</h1>
        <ThemeToggle className="ml-auto shrink-0" />
      </div>

      <GigForm
        artists={artists}
        venues={venues}
        action={updateGig}
        initialGig={gig}
        submitLabel="Wijzigingen opslaan"
      />
    </main>
  );
}
