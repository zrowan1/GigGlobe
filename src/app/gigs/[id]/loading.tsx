import { Skeleton } from "@/components/ui/skeleton";

// Placeholder while a single gig's detail page loads.
export default function GigDetailLoading() {
  return (
    <main className="mx-auto w-full max-w-lg p-4">
      <Skeleton className="mb-6 h-9 w-9 rounded-md" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="mt-2 h-5 w-1/2" />
      <Skeleton className="mt-1 h-4 w-1/3" />
      <div className="mt-6 grid grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full rounded-md" />
        ))}
      </div>
    </main>
  );
}
