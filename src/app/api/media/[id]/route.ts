// GET /api/media/<id> — serve the original photo/video file.
//
// Files live on the volume outside `public/`, so this route is the only way to
// reach them. It auth-checks and loads the row scoped to the user; if it isn't
// the user's media we 404, which is the access-control boundary (requirement:
// media must not be world-readable).

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

  return streamMediaFile(request, item.storage_path);
}
