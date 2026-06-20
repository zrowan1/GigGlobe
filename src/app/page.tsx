import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getGigStats, listGigs, listVenuesWithGigCounts } from "@/lib/db/queries";
import { HomeView } from "@/components/home/home-view";

// Home page: the world map plus the gigs list. On desktop they sit side by
// side; on mobile they are two tabs. All data is fetched here (server-side,
// scoped to the logged-in user) and handed to the client <HomeView />.
export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [venues, stats, gigs] = await Promise.all([
    listVenuesWithGigCounts(session.user.id),
    getGigStats(session.user.id),
    listGigs(session.user.id),
  ]);

  return <HomeView venues={venues} stats={stats} gigs={gigs} />;
}
