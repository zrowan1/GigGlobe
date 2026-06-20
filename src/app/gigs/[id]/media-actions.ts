"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { deleteMedia } from "@/lib/db/queries";
import { removeFiles } from "@/lib/media/storage";

export interface MediaActionState {
  error?: string;
}

async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");
  return userId;
}

// Delete one media item: remove the DB row first (scoped to the user, so you
// can only delete your own), then delete the files it pointed at. Doing the
// row first means the returned paths tell us exactly what to unlink, and a
// missing file is ignored by removeFiles.
export async function deleteMediaItem(
  _prevState: MediaActionState,
  formData: FormData
): Promise<MediaActionState> {
  const mediaId = String(formData.get("mediaId") ?? "").trim();
  if (!mediaId) return { error: "Onbekend item." };

  const userId = await requireUserId();

  const removed = await deleteMedia(userId, mediaId);
  if (!removed) return { error: "Item niet gevonden." };

  await removeFiles(removed.storage_path, removed.thumbnail_path);

  revalidatePath(`/gigs/${removed.gig_id}`);
  return {};
}
