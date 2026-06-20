// Helper for streaming a stored media file back as an HTTP response, with
// HTTP Range support. Range matters for <video>: iOS Safari issues range
// requests to seek/scrub, and won't play a video served without it.

import { createReadStream } from "node:fs";
import { Readable } from "node:stream";

import { fileSize, resolveMediaPath } from "@/lib/media/storage";

const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

function contentTypeForPath(relPath: string): string {
  const ext = relPath.split(".").pop()?.toLowerCase() ?? "";
  return EXT_MIME[ext] ?? "application/octet-stream";
}

// User-scoped, so safe to cache aggressively and forever (the UUID path is
// immutable). `private` keeps shared proxies from caching one user's media.
const CACHE_CONTROL = "private, max-age=31536000, immutable";

function nodeToWeb(stream: Readable): ReadableStream {
  return Readable.toWeb(stream) as unknown as ReadableStream;
}

// Parse a single-range "bytes=start-end" header against a known size. Returns
// null for "no range" or an unsatisfiable/invalid range (caller then serves
// the whole file, or a 416 for the explicitly-unsatisfiable case).
function parseRange(
  header: string | null,
  size: number
): { start: number; end: number } | "invalid" | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return "invalid";

  const [, startRaw, endRaw] = match;
  let start: number;
  let end: number;
  if (startRaw === "") {
    // Suffix range: last N bytes.
    const suffix = Number.parseInt(endRaw!, 10);
    if (!suffix) return "invalid";
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number.parseInt(startRaw, 10);
    end = endRaw === "" ? size - 1 : Number.parseInt(endRaw, 10);
  }

  if (start > end || start >= size) return "invalid";
  return { start, end: Math.min(end, size - 1) };
}

// Stream `relPath` (relative to MEDIA_DIR) as a Response, honouring the
// request's Range header. Returns 404 if the file is missing.
export async function streamMediaFile(
  request: Request,
  relPath: string
): Promise<Response> {
  const size = await fileSize(relPath);
  if (size === null) return new Response("Not found", { status: 404 });

  const abs = resolveMediaPath(relPath);
  const contentType = contentTypeForPath(relPath);
  const range = parseRange(request.headers.get("range"), size);

  if (range === "invalid") {
    return new Response("Range Not Satisfiable", {
      status: 416,
      headers: { "content-range": `bytes */${size}` },
    });
  }

  if (range) {
    const { start, end } = range;
    const stream = createReadStream(abs, { start, end });
    return new Response(nodeToWeb(stream), {
      status: 206,
      headers: {
        "content-type": contentType,
        "content-length": String(end - start + 1),
        "content-range": `bytes ${start}-${end}/${size}`,
        "accept-ranges": "bytes",
        "cache-control": CACHE_CONTROL,
      },
    });
  }

  const stream = createReadStream(abs);
  return new Response(nodeToWeb(stream), {
    status: 200,
    headers: {
      "content-type": contentType,
      "content-length": String(size),
      "accept-ranges": "bytes",
      "cache-control": CACHE_CONTROL,
    },
  });
}
