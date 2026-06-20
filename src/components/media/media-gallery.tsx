"use client";

import { useActionState, useState } from "react";
import { Play, Trash2 } from "lucide-react";

import {
  deleteMediaItem,
  type MediaActionState,
} from "@/app/gigs/[id]/media-actions";
import { MediaLightbox } from "@/components/media/media-lightbox";
import type { Media } from "@/types";

// Thumbnail grid for a gig's media. Tap a tile to open the fullscreen lightbox;
// each tile has a delete affordance. The list comes from the server component,
// so after an upload (router.refresh) or a delete (revalidatePath) this
// re-renders with fresh data.
export function MediaGallery({ media }: { media: Media[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (media.length === 0) return null;

  return (
    <>
      <ul className="grid grid-cols-3 gap-1">
        {media.map((item, i) => (
          <li key={item.id} className="relative aspect-square">
            <button
              type="button"
              onClick={() => setLightboxIndex(i)}
              className="absolute inset-0 overflow-hidden rounded-md bg-accent"
              aria-label={
                item.media_type === "video" ? "Video bekijken" : "Foto bekijken"
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/media/${item.id}/thumb`}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
              {item.media_type === "video" && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white">
                    <Play className="size-5 fill-current" />
                  </span>
                </span>
              )}
            </button>
            <div className="absolute right-1 top-1 z-10">
              <MediaDeleteButton mediaId={item.id} />
            </div>
          </li>
        ))}
      </ul>

      {lightboxIndex !== null && (
        <MediaLightbox
          items={media}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </>
  );
}

// Small delete button per tile. Confirms before submitting, then runs the
// server action which removes the row + files and revalidates the page.
function MediaDeleteButton({ mediaId }: { mediaId: string }) {
  const [state, formAction, pending] = useActionState<
    MediaActionState,
    FormData
  >(deleteMediaItem, {});

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm("Dit item verwijderen?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="mediaId" value={mediaId} />
      <button
        type="submit"
        disabled={pending}
        aria-label="Verwijderen"
        title={state.error}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-destructive disabled:opacity-50"
      >
        <Trash2 className="size-3.5" />
      </button>
    </form>
  );
}
