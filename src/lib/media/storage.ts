// Disk-storage helpers for media files. Files live on the volume at MEDIA_DIR
// (mounted to /media in the container), never in the database — the DB only
// keeps the *relative* path. This module is the single place that turns a
// relative path into an absolute one, and it guards against path traversal so
// a crafted value can never escape MEDIA_DIR.
//
// Layout on disk:
//   <MEDIA_DIR>/<userId>/<gigId>/<mediaId>.<ext>         (original)
//   <MEDIA_DIR>/<userId>/<gigId>/<mediaId>.thumb.webp    (photo thumbnail)
//
// Filenames are the row UUID (never the client's filename) so there are no
// collisions and no way to smuggle a path through the name.

import { mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";

// Absolute path to the media root. Resolved once from MEDIA_DIR; a relative
// MEDIA_DIR (e.g. "./media" in local dev) is resolved against the cwd.
export function mediaRoot(): string {
  const dir = process.env.MEDIA_DIR;
  if (!dir) throw new Error("MEDIA_DIR is not set");
  return path.resolve(dir);
}

// Turn a relative path (as stored in the DB) into an absolute one, refusing
// anything that would resolve outside MEDIA_DIR. Throws on traversal attempts.
export function resolveMediaPath(relativePath: string): string {
  const root = mediaRoot();
  const abs = path.resolve(root, relativePath);
  // The resolved path must sit inside root. Compare with a trailing separator
  // so "/media-evil" can't pass as a child of "/media".
  if (abs !== root && !abs.startsWith(root + path.sep)) {
    throw new Error("Invalid media path");
  }
  return abs;
}

export interface MediaRelPaths {
  dir: string; // relative directory, e.g. "<userId>/<gigId>"
  original: string; // relative path of the original file
  thumbnail: string; // relative path of the (photo) thumbnail
}

// Build the relative paths for a new media item. `ext` is the original file's
// extension without a dot (e.g. "jpg", "mp4").
export function buildRelPaths(
  userId: string,
  gigId: string,
  mediaId: string,
  ext: string
): MediaRelPaths {
  const dir = path.posix.join(userId, gigId);
  return {
    dir,
    original: path.posix.join(dir, `${mediaId}.${ext}`),
    thumbnail: path.posix.join(dir, `${mediaId}.thumb.webp`),
  };
}

// Create the directory for a relative path (recursively). Takes a relative
// directory path and resolves it safely under MEDIA_DIR first.
export async function ensureDir(relativeDir: string): Promise<void> {
  await mkdir(resolveMediaPath(relativeDir), { recursive: true });
}

// Delete one or more files by relative path. Missing files are ignored, so
// this is safe to call during cleanup even if a file was never written.
export async function removeFiles(
  ...relativePaths: (string | null | undefined)[]
): Promise<void> {
  await Promise.all(
    relativePaths
      .filter((p): p is string => Boolean(p))
      .map((p) => rm(resolveMediaPath(p), { force: true }))
  );
}

// Size of a stored file in bytes (used by the serving route for Content-Length
// and Range handling). Returns null if the file is missing.
export async function fileSize(relativePath: string): Promise<number | null> {
  try {
    const s = await stat(resolveMediaPath(relativePath));
    return s.size;
  } catch {
    return null;
  }
}
