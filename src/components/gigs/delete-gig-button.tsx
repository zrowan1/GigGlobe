"use client";

import { Trash2 } from "lucide-react";

import { deleteGig } from "@/app/gigs/actions";
import { Button } from "@/components/ui/button";

// Delete button with a confirmation step, so a stray tap doesn't wipe a gig.
// The actual delete runs server-side via the deleteGig action.
export function DeleteGigButton({ gigId }: { gigId: string }) {
  return (
    <form
      action={deleteGig}
      onSubmit={(e) => {
        if (!window.confirm("Dit optreden verwijderen? Dit kan niet ongedaan worden gemaakt.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="gigId" value={gigId} />
      <Button type="submit" variant="destructive" className="w-full">
        <Trash2 /> Verwijderen
      </Button>
    </form>
  );
}
