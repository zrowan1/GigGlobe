"use client";

import { useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import type { Media } from "@/types";

// Fullscreen viewer for a single media item, with prev/next navigation. Plain
// fixed overlay — no portal/dialog library needed. Photos show full-resolution;
// videos use native controls with `playsInline` and `preload="metadata"` (no
// autoplay) so they behave on iOS Safari instead of hijacking to fullscreen or
// showing a black frame.
export function MediaLightbox({
  items,
  index,
  onClose,
  onNavigate,
}: {
  items: Media[];
  index: number;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
}) {
  const count = items.length;
  const current = items[index];

  const go = useCallback(
    (delta: number) => {
      onNavigate((index + delta + count) % count);
    },
    [index, count, onNavigate]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    }
    document.addEventListener("keydown", onKey);
    // Lock background scroll while the overlay is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, go]);

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Sluiten"
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <X className="size-5" />
      </button>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            aria-label="Vorige"
            className="absolute left-2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <ChevronLeft className="size-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            aria-label="Volgende"
            className="absolute right-2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <ChevronRight className="size-6" />
          </button>
        </>
      )}

      {/* stopPropagation so tapping the media itself doesn't close the overlay */}
      <div
        className="flex max-h-[90vh] max-w-[95vw] items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {current.media_type === "video" ? (
          <video
            key={current.id}
            src={`/api/media/${current.id}`}
            controls
            playsInline
            preload="metadata"
            className="max-h-[90vh] max-w-[95vw]"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={current.id}
            src={`/api/media/${current.id}`}
            alt=""
            className="max-h-[90vh] max-w-[95vw] object-contain"
          />
        )}
      </div>
    </div>
  );
}
