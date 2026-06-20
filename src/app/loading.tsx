// Shown while the home page (map + list) loads its data. Mirrors the dark globe
// background so there's no white flash before the map appears.
export default function HomeLoading() {
  return (
    <div className="flex h-svh w-full items-center justify-center bg-[#0a0613] text-sm text-[#cbb8ff]">
      <div className="flex flex-col items-center gap-3">
        <div className="size-10 animate-spin rounded-full border-2 border-[#00e5ff]/30 border-t-[#00e5ff]" />
        Kaart laden…
      </div>
    </div>
  );
}
