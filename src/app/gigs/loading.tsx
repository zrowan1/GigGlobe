import { Skeleton } from "@/components/ui/skeleton";

// Placeholder rows while the gigs list loads.
export default function GigsLoading() {
  return (
    <main className="mx-auto w-full max-w-2xl p-4">
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="grid gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] w-full rounded-xl" />
        ))}
      </div>
    </main>
  );
}
