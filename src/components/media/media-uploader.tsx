"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface UploadItem {
  key: string;
  name: string;
  progress: number; // 0..100
  status: "uploading" | "done" | "error";
  error?: string;
}

// Upload a single file with XMLHttpRequest so we get real upload-progress
// events (fetch has none in Safari). The body is the raw file; the route reads
// the MIME from Content-Type and the gig from the query string.
function uploadFile(
  gigId: string,
  file: File,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/media/upload?gigId=${encodeURIComponent(gigId)}`);
    xhr.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream"
    );
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        let message = "Upload mislukt.";
        try {
          message = JSON.parse(xhr.responseText).error ?? message;
        } catch {
          // keep default
        }
        reject(new Error(message));
      }
    };
    xhr.onerror = () => reject(new Error("Netwerkfout tijdens upload."));
    xhr.send(file);
  });
}

// Upload control on the gig detail page. Lets you pick multiple photos/videos
// from the camera roll and uploads them one by one, showing a progress bar per
// file. When everything is done it refreshes the page so the gallery re-renders
// with the new items.
export function MediaUploader({ gigId }: { gigId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [busy, setBusy] = useState(false);

  function update(key: string, patch: Partial<UploadItem>) {
    setItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, ...patch } : it))
    );
  }

  async function handleFiles(files: FileList) {
    const queued: UploadItem[] = Array.from(files).map((file, i) => ({
      key: `${Date.now()}-${i}-${file.name}`,
      name: file.name,
      progress: 0,
      status: "uploading",
    }));
    setItems(queued);
    setBusy(true);

    // Sequential: gentle on a phone's uplink and keeps progress readable.
    let anyOk = false;
    for (let i = 0; i < queued.length; i++) {
      const item = queued[i];
      const file = files[i];
      try {
        await uploadFile(gigId, file, (pct) => update(item.key, { progress: pct }));
        update(item.key, { status: "done", progress: 100 });
        anyOk = true;
      } catch (e) {
        update(item.key, {
          status: "error",
          error: e instanceof Error ? e.message : "Upload mislukt.",
        });
      }
    }

    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    if (anyOk) {
      // Re-fetch the server component so the gallery shows the new media, then
      // clear the finished progress rows.
      router.refresh();
      setItems((prev) => prev.filter((it) => it.status === "error"));
    }
  }

  return (
    <div className="grid gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        // No `capture` attribute on purpose: that would force the live camera;
        // without it the OS offers the whole camera roll.
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            void handleFiles(e.target.files);
          }
        }}
      />
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />}
        {busy ? "Bezig met uploaden…" : "Foto's & video's toevoegen"}
      </Button>

      {items.length > 0 && (
        <ul className="grid gap-2">
          {items.map((it) => (
            <li key={it.key} className="grid gap-1">
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="truncate">{it.name}</span>
                <span className="shrink-0">
                  {it.status === "error"
                    ? "Mislukt"
                    : it.status === "done"
                      ? "Klaar"
                      : `${it.progress}%`}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-accent">
                <div
                  className={
                    it.status === "error"
                      ? "h-full bg-destructive transition-all"
                      : "h-full bg-primary transition-all"
                  }
                  style={{ width: `${it.status === "error" ? 100 : it.progress}%` }}
                />
              </div>
              {it.error && (
                <p className="text-xs text-destructive">{it.error}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
