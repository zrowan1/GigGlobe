import Link from "next/link";
import { redirect } from "next/navigation";
import { Globe, Plus } from "lucide-react";

import { auth } from "@/lib/auth";
import { getDetailedStats } from "@/lib/db/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { StatsView } from "@/components/stats/stats-view";

// The statistics page: a summary of everything you've seen — most-seen artists,
// most-visited venues and festivals, top countries and cities, a timeline of
// gigs per year, and ratings. Data is aggregated in SQL (getDetailedStats) and
// drawn with Recharts inside <StatsView />.
export default async function StatsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const stats = await getDetailedStats(session.user.id);

  return (
    <main className="mx-auto w-full max-w-3xl p-4">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon">
            <Link href="/" aria-label="Terug naar de kaart">
              <Globe />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">Statistieken</h1>
        </div>
        <ThemeToggle />
      </div>

      {stats.totals.gigs === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-4xl">📊</p>
            <div>
              <p className="font-medium">Nog geen statistieken</p>
              <p className="text-sm text-muted-foreground">
                Voeg je eerste optreden toe — daarna zie je hier wie je het
                vaakst zag, waar je het meest was en meer.
              </p>
            </div>
            <Button asChild>
              <Link href="/gigs/new">
                <Plus /> Eerste optreden toevoegen
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <StatsView stats={stats} />
      )}
    </main>
  );
}
