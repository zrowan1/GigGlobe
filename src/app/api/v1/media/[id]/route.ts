// DELETE /api/v1/media/<id> — delete one photo/video (row + files on disk).
// Uploading and viewing go through /api/media/upload and /api/media/<id>,
// which accept the app's bearer token as well.

import { getRequestUserId } from "@/lib/api/auth";
import { isUuid, notFound, unauthorized } from "@/lib/api/http";
import { deleteMedia } from "@/lib/db/queries";
import { removeFiles } from "@/lib/media/storage";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const userId = await getRequestUserId(request);
  if (!userId) return unauthorized();

  const { id } = await params;
  if (!isUuid(id)) return notFound();

  // Scoped to the user: someone else's media simply isn't found.
  const removed = await deleteMedia(userId, id);
  if (!removed) return notFound();

  await removeFiles(removed.storage_path, removed.thumbnail_path);
  return new Response(null, { status: 204 });
}
