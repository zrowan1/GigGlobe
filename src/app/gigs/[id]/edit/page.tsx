import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { updateGig } from "@/app/gigs/actions";
import { GigForm } from "@/components/gigs/gig-form";
import { Button } from "@/components/ui/button";
import type { Artist, GigWithRelations, Venue } from "@/types";

// Edit page. It reuses the exact same GigForm as "new", but pre-filled with
// the existing gig and wired to the updateGig action.
export default async function EditGigPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: gigData }, { data: artists }, { data: venues }] =
    await Promise.all([
      supabase
        .from("gigs")
        .select(
          "*, artist:artists(id,name), venue:venues(id,name,type,city,country,latitude,longitude)"
        )
        .eq("id", id)
        .maybeSingle(),
      supabase.from("artists").select("*").order("name"),
      supabase.from("venues").select("*").order("name"),
    ]);

  const gig = gigData as GigWithRelations | null;
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
      </div>

      <GigForm
        artists={(artists as Artist[]) ?? []}
        venues={(venues as Venue[]) ?? []}
        action={updateGig}
        initialGig={gig}
        submitLabel="Wijzigingen opslaan"
      />
    </main>
  );
}
