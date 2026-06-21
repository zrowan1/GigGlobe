"use client";

import { useState, useTransition } from "react";
import { ExternalLink, ListMusic, Loader2, RefreshCw, Trash2 } from "lucide-react";

import { removeSetlist, saveSetlist, searchSetlists } from "@/app/gigs/actions";
import type { SetlistSearchResult } from "@/lib/setlist";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Setlist } from "@/types";

interface SetlistSectionProps {
  gigId: string;
  artistName: string;
  gigDate: string; // ISO yyyy-MM-dd
  cityName: string | null;
  setlist: Setlist | null;
}

// The setlist block on a gig detail page. Three states:
//   1. a setlist is saved -> show the songs + source link + actions
//   2. nothing saved yet   -> a "Setlist ophalen" button
//   3. after searching      -> a list of candidates to pick from
// All the actual setlist.fm work and saving happens in server actions; this
// component just drives the UI and shows loading/empty states.
export function SetlistSection({
  gigId,
  artistName,
  gigDate,
  cityName,
  setlist,
}: SetlistSectionProps) {
  const [pending, startTransition] = useTransition();
  // null = haven't searched yet; [] = searched, nothing found.
  const [results, setResults] = useState<SetlistSearchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSearch() {
    setError(null);
    startTransition(async () => {
      try {
        const found = await searchSetlists(artistName, gigDate, cityName);
        setResults(found);
      } catch {
        setError("Het zoeken ging mis. Probeer het later opnieuw.");
      }
    });
  }

  function handlePick(result: SetlistSearchResult) {
    setError(null);
    startTransition(async () => {
      try {
        await saveSetlist(gigId, result);
        setResults(null); // server revalidates the page with the saved setlist
      } catch {
        setError("Opslaan ging mis. Probeer het later opnieuw.");
      }
    });
  }

  function handleRemove() {
    if (!window.confirm("Setlist verwijderen?")) return;
    setError(null);
    startTransition(async () => {
      try {
        await removeSetlist(gigId);
      } catch {
        setError("Verwijderen ging mis. Probeer het later opnieuw.");
      }
    });
  }

  // --- State 1: a setlist is saved ---------------------------------------
  if (setlist) {
    return (
      <Card>
        <CardContent className="grid gap-4 py-6">
          <ol className="grid list-decimal gap-1 pl-6">
            {setlist.songs.map((song, i) => (
              <li key={i} className="whitespace-pre-wrap">
                {song.name}
                {song.cover && (
                  <span className="text-muted-foreground">
                    {" "}
                    (cover van {song.cover})
                  </span>
                )}
                {song.info && (
                  <span className="text-muted-foreground"> — {song.info}</span>
                )}
              </li>
            ))}
          </ol>

          {setlist.songs.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Deze setlist bevat geen nummers.
            </p>
          )}

          {/* setlist.fm requires a visible link back to the source. */}
          <a
            href={setlist.setlistfm_url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground underline underline-offset-4"
          >
            Bron: setlist.fm <ExternalLink className="size-3.5" />
          </a>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSearch}
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <RefreshCw />
              )}
              Opnieuw ophalen
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={pending}
            >
              <Trash2 /> Verwijderen
            </Button>
          </div>

          {/* Re-fetch can surface new candidates to pick from. */}
          {results && <Candidates results={results} onPick={handlePick} pending={pending} />}
        </CardContent>
      </Card>
    );
  }

  // --- State 3: searched, show candidates --------------------------------
  if (results) {
    return (
      <Card>
        <CardContent className="grid gap-3 py-6">
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Geen setlist gevonden op setlist.fm.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Kies de juiste setlist:
              </p>
              <Candidates results={results} onPick={handlePick} pending={pending} />
            </>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setResults(null)}
            disabled={pending}
            className="justify-self-start"
          >
            Annuleren
          </Button>
        </CardContent>
      </Card>
    );
  }

  // --- State 2: nothing yet ----------------------------------------------
  return (
    <Card>
      <CardContent className="grid gap-3 py-6">
        <p className="text-sm text-muted-foreground">
          Nog geen setlist. Haal hem op van setlist.fm op basis van artiest en
          datum.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          type="button"
          variant="outline"
          onClick={handleSearch}
          disabled={pending}
          className="justify-self-start"
        >
          {pending ? <Loader2 className="animate-spin" /> : <ListMusic />}
          Setlist ophalen
        </Button>
      </CardContent>
    </Card>
  );
}

// The list of candidate setlists to choose from. Each shows enough context
// (venue, city, tour, song count) to tell festivals/duplicates apart.
function Candidates({
  results,
  onPick,
  pending,
}: {
  results: SetlistSearchResult[];
  onPick: (result: SetlistSearchResult) => void;
  pending: boolean;
}) {
  return (
    <ul className="grid gap-2">
      {results.map((result) => {
        const location = [result.venueName, result.cityName]
          .filter(Boolean)
          .join(", ");
        return (
          <li key={result.id}>
            <button
              type="button"
              onClick={() => onPick(result)}
              disabled={pending}
              className="w-full rounded-md border border-border p-3 text-left transition-colors hover:bg-accent disabled:opacity-50"
            >
              <span className="block font-medium">
                {location || "Onbekende locatie"}
              </span>
              <span className="block text-sm text-muted-foreground">
                {result.songs.length} nummers
                {result.tourName ? ` · ${result.tourName}` : ""}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
