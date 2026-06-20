// Streaming upload endpoint: POST /api/media/upload?gigId=<id>
//
// The request body is the raw file bytes (one file per request); the file's
// MIME type comes from the Content-Type header. We stream the body straight to
// disk so a large video never sits fully in memory. We deliberately use a
// Route Handler (not a Server Action) because actions buffer the whole body
// and give the browser no upload-progress events.

import { createWriteStream } from "node:fs";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

import { auth } from "@/lib/auth";
import { getGig, insertMedia } from "@/lib/db/queries";
import {
  buildRelPaths,
  ensureDir,
  removeFiles,
  resolveMediaPath,
} from "@/lib/media/storage";
import { makePhotoThumbnail } from "@/lib/media/thumbnail";
import { classify, maxUploadBytes } from "@/lib/media/validation";

// We touch the filesystem and Node streams, so this must run on the Node
// runtime, not the Edge runtime.
export const runtime = "nodejs";

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(request: Request): Promise<Response> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return json({ error: "Niet ingelogd." }, 401);

  const gigId = new URL(request.url).searchParams.get("gigId")?.trim();
  if (!gigId) return json({ error: "gigId ontbreekt." }, 400);

  // Ownership gate: you can only attach media to your own gig.
  const gig = await getGig(userId, gigId);
  if (!gig) return json({ error: "Optreden niet gevonden." }, 404);

  const kind = classify(request.headers.get("content-type") ?? "");
  if (!kind) return json({ error: "Bestandstype niet toegestaan." }, 415);

  if (!request.body) return json({ error: "Geen bestand ontvangen." }, 400);

  const cap = maxUploadBytes();
  // Fast pre-reject using the advertised length; the byte counter below is the
  // real enforcement (Content-Length can lie or be absent).
  const advertised = Number.parseInt(
    request.headers.get("content-length") ?? "",
    10
  );
  if (Number.isFinite(advertised) && advertised > cap) {
    return json({ error: "Bestand is te groot." }, 413);
  }

  const mediaId = crypto.randomUUID();
  const paths = buildRelPaths(userId, gigId, mediaId, kind.ext);

  try {
    await ensureDir(paths.dir);

    // Stream body -> disk, counting bytes and aborting if the cap is exceeded.
    let bytes = 0;
    const counter = new Transform({
      transform(chunk, _enc, cb) {
        bytes += chunk.length;
        if (bytes > cap) {
          cb(new Error("TOO_LARGE"));
          return;
        }
        cb(null, chunk);
      },
    });

    const source = Readable.fromWeb(request.body as import("stream/web").ReadableStream);
    const dest = createWriteStream(resolveMediaPath(paths.original));
    await pipeline(source, counter, dest);

    // Photos get a thumbnail + dimensions; videos are rendered natively, so
    // they keep thumbnailPath = null.
    let thumbnailPath: string | null = null;
    let width: number | null = null;
    let height: number | null = null;
    if (kind.mediaType === "photo") {
      const thumb = await makePhotoThumbnail(paths.original, paths.thumbnail);
      width = thumb.width;
      height = thumb.height;
      thumbnailPath = thumb.thumbnailWritten ? paths.thumbnail : null;
    }

    const row = await insertMedia(userId, {
      gigId,
      storagePath: paths.original,
      thumbnailPath,
      mediaType: kind.mediaType,
      width,
      height,
    });

    return json(row, 201);
  } catch (e) {
    // Never leave a half-written file behind referenced by no DB row.
    await removeFiles(paths.original, paths.thumbnail);
    if (e instanceof Error && e.message === "TOO_LARGE") {
      return json({ error: "Bestand is te groot." }, 413);
    }
    return json({ error: "Upload mislukt." }, 500);
  }
}
