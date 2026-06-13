import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { createGig } from "@/app/gigs/actions";
import { GigForm } from "@/components/gigs/gig-form";
import { Button } from "@/components/ui/button";
import type { Artist, Venue } from "@/types";

// "New gig" page. It loads your existing artists and venues so the form can
// suggest them (no duplicate "Kendrick Lamar" in the database).
export default async function NewGigPage() {
  const supabase = await createClient();

  const [{ data: artists }, { data: venues }] = await Promise.all([
    supabase.from("artists").select("*").order("name"),
    supabase.from("venues").select("*").order("name"),
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
      </div>

      <GigForm
        artists={(artists as Artist[]) ?? []}
        venues={(venues as Venue[]) ?? []}
        action={createGig}
        submitLabel="Optreden opslaan"
      />
    </main>
  );
}
