// What we accept on upload, and how to label it. The server route is the
// authoritative gate (the client `accept` attribute is only a UX hint and can
// be bypassed), so all checks that matter live here.

import type { MediaType } from "@/types";

// MIME type -> file extension (no dot). The key set is also the allow-list:
// anything not here is rejected by the upload route.
const PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  // iPhones often hand us HEIC/HEIF. We accept it; thumbnail generation is
  // best-effort and falls back to no thumbnail if the build's sharp can't
  // decode it (see thumbnail.ts).
  "image/heic": "heic",
  "image/heif": "heif",
};

const VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov", // iPhone .mov
  "video/webm": "webm",
};

// Strip any "; charset=..." parameter and lowercase, so "Video/MP4; x=y"
// still matches.
function normalizeMime(mime: string): string {
  return mime.split(";")[0]!.trim().toLowerCase();
}

// Classify an upload by its MIME type. Returns the media type and the
// extension to store the file under, or null if the type isn't allowed.
export function classify(
  mime: string
): { mediaType: MediaType; ext: string } | null {
  const m = normalizeMime(mime);
  if (m in PHOTO_TYPES) return { mediaType: "photo", ext: PHOTO_TYPES[m]! };
  if (m in VIDEO_TYPES) return { mediaType: "video", ext: VIDEO_TYPES[m]! };
  return null;
}

// Maximum upload size in bytes, from MEDIA_MAX_UPLOAD_MB (default 500 MB).
export function maxUploadBytes(): number {
  const mb = Number.parseInt(process.env.MEDIA_MAX_UPLOAD_MB ?? "", 10);
  const safeMb = Number.isFinite(mb) && mb > 0 ? mb : 500;
  return safeMb * 1024 * 1024;
}
