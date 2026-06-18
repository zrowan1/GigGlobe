import Link from "next/link";

import { auth } from "@/lib/auth";
import { signOut } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Home page. In Phase 2 this becomes the map/globe.
// For now it proves that login works and shows who you are.
export default async function Home() {
  const session = await auth();
  const user = session?.user;

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">🌍 GigGlobe</CardTitle>
          <CardDescription>
            Je bent ingelogd als <strong>{user?.email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm text-muted-foreground">
            Hier komt straks de wereldkaart met al je optredens. Bekijk
            voorlopig je optredens in de lijst.
          </p>
          <Button asChild className="w-full">
            <Link href="/gigs">Mijn optredens</Link>
          </Button>
          <form action={signOut}>
            <Button variant="outline" type="submit" className="w-full">
              Uitloggen
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
