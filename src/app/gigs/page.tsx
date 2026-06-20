import Link from "next/link";
import { redirect } from "next/navigation";
import { Globe, Plus } from "lucide-react";

import { auth } from "@/lib/auth";
import { listGigs } from "@/lib/db/queries";
import { Button } from "@/components/ui/button";
import { GigsList } from "@/components/gigs/gigs-list";
import { ThemeToggle } from "@/components/theme-toggle";

// Standalone list of all your gigs, newest first. The same list also appears in
// the home view (desktop sidebar / mobile tab); both render <GigsList />.
export default async function GigsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const gigs = await listGigs(session.user.id);

  return (
    <main className="mx-auto w-full max-w-2xl p-4">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon">
            <Link href="/" aria-label="Terug naar de kaart">
              <Globe />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">Optredens</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild>
            <Link href="/gigs/new">
              <Plus /> Nieuw
            </Link>
          </Button>
        </div>
      </div>

      <GigsList gigs={gigs} />
    </main>
  );
}
