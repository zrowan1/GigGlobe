import { Skeleton } from "@/components/ui/skeleton";

// Placeholder while an artist's detail page loads.
export default function ArtistDetailLoading() {
  return (
    <main className="mx-auto w-full max-w-lg p-4">
      <div className="mb-6 flex items-center gap-2">
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-7 w-1/2" />
      </div>
      <Skeleton className="mb-4 h-4 w-2/3" />
      <Skeleton className="mb-6 h-64 w-full rounded-xl" />
      <div className="grid gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </main>
  );
}
