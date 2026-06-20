// Photo thumbnails via sharp. We generate a small webp from the original so
// the gallery grid loads fast and doesn't pull full-resolution images.
//
// Videos get no thumbnail here — they're rendered natively in the browser
// (see media-lightbox), so this module only handles photos.

import sharp from "sharp";

import { resolveMediaPath } from "@/lib/media/storage";

const THUMB_MAX = 600; // longest edge of the thumbnail, in px

export interface ThumbnailResult {
  // Original image dimensions (after EXIF rotation), or null if unreadable.
  width: number | null;
  height: number | null;
  // True if a thumbnail file was actually written.
  thumbnailWritten: boolean;
}

// Read the original photo, bake in its EXIF orientation, and write a webp
// thumbnail. Best-effort: if sharp can't decode the format (e.g. HEIC on a
// build without libheif), we return dimensions=null and thumbnailWritten=false
// instead of throwing, so the upload still succeeds.
export async function makePhotoThumbnail(
  originalRelPath: string,
  thumbnailRelPath: string
): Promise<ThumbnailResult> {
  const srcAbs = resolveMediaPath(originalRelPath);
  const destAbs = resolveMediaPath(thumbnailRelPath);

  try {
    // .rotate() with no args applies the EXIF orientation tag, so portrait
    // phone photos aren't shown sideways. metadata() after rotate gives the
    // displayed dimensions.
    const pipeline = sharp(srcAbs).rotate();
    const meta = await pipeline.metadata();

    await pipeline
      .resize(THUMB_MAX, THUMB_MAX, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(destAbs);

    return {
      width: meta.width ?? null,
      height: meta.height ?? null,
      thumbnailWritten: true,
    };
  } catch {
    return { width: null, height: null, thumbnailWritten: false };
  }
}
