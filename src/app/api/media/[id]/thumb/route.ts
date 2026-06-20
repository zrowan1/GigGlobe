// GET /api/media/<id>/thumb — serve the photo thumbnail.
//
// Same auth + ownership gate as the original. Videos have no thumbnail
// (thumbnail_path is null); for photos whose thumbnail couldn't be generated
// (e.g. HEIC on a build without a decoder) we fall back to the original so the
// gallery still shows something.

import { auth } from "@/lib/auth";
import { getMedia } from "@/lib/db/queries";
import { streamMediaFile } from "@/lib/media/serve";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const item = await getMedia(userId, id);
  if (!item) return new Response("Not found", { status: 404 });

  const relPath = item.thumbnail_path ?? item.storage_path;
  return streamMediaFile(request, relPath);
}
