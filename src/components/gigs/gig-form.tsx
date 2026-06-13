"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { searchVenuePlaces, type GigFormState } from "@/app/gigs/actions";
import type { GeoResult } from "@/lib/geocoding";
import type { Artist, GigWithRelations, Venue, VenueType } from "@/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// One venue suggestion shown in the dropdown. It is either an existing venue
// you used before, or a fresh place found via Nominatim.
type VenueSuggestion =
  | { kind: "existing"; venue: Venue }
  | { kind: "new"; place: GeoResult };

interface GigFormProps {
  // Existing rows, used for "reuse" suggestions so you don't create duplicates.
  artists: Artist[];
  venues: Venue[];
  // The server action to run on submit (create or update).
  action: (state: GigFormState, formData: FormData) => Promise<GigFormState>;
  // When editing, the gig we are editing (pre-fills the form).
  initialGig?: GigWithRelations;
  submitLabel: string;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export function GigForm({
  artists,
  venues,
  action,
  initialGig,
  submitLabel,
}: GigFormProps) {
  const [state, formAction, isPending] = useActionState<GigFormState, FormData>(
    action,
    {}
  );

  // --- Artist field -------------------------------------------------------
  const [artistName, setArtistName] = useState(initialGig?.artist.name ?? "");
  const [artistId, setArtistId] = useState(initialGig?.artist.id ?? "");
  const [showArtists, setShowArtists] = useState(false);

  const artistMatches =
    artistName.trim().length === 0
      ? []
      : artists.filter(
          (a) =>
            a.name.toLowerCase().includes(artistName.trim().toLowerCase()) &&
            a.name.toLowerCase() !== artistName.trim().toLowerCase()
        );

  // --- Venue field --------------------------------------------------------
  const [venueName, setVenueName] = useState(initialGig?.venue.name ?? "");
  const [venueId, setVenueId] = useState(initialGig?.venue.id ?? "");
  const [venueType, setVenueType] = useState<VenueType>(
    initialGig?.venue.type ?? "venue"
  );
  const [coords, setCoords] = useState<{
    latitude: number | null;
    longitude: number | null;
    city: string | null;
    country: string | null;
  }>({
    latitude: initialGig?.venue.latitude ?? null,
    longitude: initialGig?.venue.longitude ?? null,
    city: initialGig?.venue.city ?? null,
    country: initialGig?.venue.country ?? null,
  });
  const [venueResults, setVenueResults] = useState<VenueSuggestion[]>([]);
  const [showVenues, setShowVenues] = useState(false);
  const [searching, setSearching] = useState(false);

  // Debounced search: when the user types a venue name we look both at the
  // venues they used before and (after a short pause) at Nominatim. The pause
  // keeps us well under Nominatim's 1-request-per-second limit.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const query = venueName.trim();

    const existing: VenueSuggestion[] = venues
      .filter((v) => v.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 3)
      .map((venue) => ({ kind: "existing", venue }));

    if (query.length < 3) {
      setVenueResults(existing);
      setSearching(false);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }

    setSearching(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const places = await searchVenuePlaces(query);
      const fromNominatim: VenueSuggestion[] = places.map((place) => ({
        kind: "new",
        place,
      }));
      setVenueResults([...existing, ...fromNominatim]);
      setSearching(false);
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [venueName, venues]);

  function pickExistingVenue(venue: Venue) {
    setVenueId(venue.id);
    setVenueName(venue.name);
    setVenueType(venue.type);
    setCoords({
      latitude: venue.latitude,
      longitude: venue.longitude,
      city: venue.city,
      country: venue.country,
    });
    setShowVenues(false);
  }

  function pickNewPlace(place: GeoResult) {
    setVenueId(""); // it's a brand-new venue, no id yet
    setVenueName(place.name);
    setCoords({
      latitude: place.latitude,
      longitude: place.longitude,
      city: place.city,
      country: place.country,
    });
    setShowVenues(false);
  }

  const locationLabel =
    coords.latitude !== null
      ? [coords.city, coords.country].filter(Boolean).join(", ") ||
        "Locatie geselecteerd"
      : null;

  return (
    <form action={formAction} className="grid gap-5">
      {initialGig && <input type="hidden" name="gigId" value={initialGig.id} />}

      {/* Artist */}
      <div className="relative grid gap-2">
        <Label htmlFor="artistName">Artiest</Label>
        <Input
          id="artistName"
          name="artistName"
          autoComplete="off"
          placeholder="Bijv. Kendrick Lamar"
          value={artistName}
          onChange={(e) => {
            setArtistName(e.target.value);
            setArtistId(""); // typing means it's no longer the picked artist
            setShowArtists(true);
          }}
          onFocus={() => setShowArtists(true)}
          onBlur={() => setTimeout(() => setShowArtists(false), 150)}
          required
        />
        <input type="hidden" name="artistId" value={artistId} />
        {showArtists && artistMatches.length > 0 && (
          <ul className="absolute top-full z-10 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
            {artistMatches.slice(0, 5).map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setArtistName(a.name);
                    setArtistId(a.id);
                    setShowArtists(false);
                  }}
                >
                  {a.name}{" "}
                  <span className="text-xs text-muted-foreground">
                    · eerder gezien
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Date */}
      <div className="grid gap-2">
        <Label htmlFor="gigDate">Datum</Label>
        <Input
          id="gigDate"
          name="gigDate"
          type="date"
          max={todayISO()}
          defaultValue={initialGig?.gig_date ?? todayISO()}
          required
        />
      </div>

      {/* Venue type */}
      <div className="grid gap-2">
        <Label htmlFor="venueType">Type</Label>
        <select
          id="venueType"
          name="venueType"
          value={venueType}
          onChange={(e) => setVenueType(e.target.value as VenueType)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
        >
          <option value="venue">Venue (zaal/club)</option>
          <option value="festival">Festival</option>
        </select>
      </div>

      {/* Venue search */}
      <div className="relative grid gap-2">
        <Label htmlFor="venueName">Locatie</Label>
        <Input
          id="venueName"
          name="venueName"
          autoComplete="off"
          placeholder="Zoek bijv. Ziggo Dome of Lowlands"
          value={venueName}
          onChange={(e) => {
            setVenueName(e.target.value);
            setVenueId("");
            setCoords({
              latitude: null,
              longitude: null,
              city: null,
              country: null,
            });
            setShowVenues(true);
          }}
          onFocus={() => setShowVenues(true)}
          onBlur={() => setTimeout(() => setShowVenues(false), 150)}
        />
        {/* Hidden fields the server action reads. */}
        <input type="hidden" name="venueId" value={venueId} />
        <input
          type="hidden"
          name="latitude"
          value={coords.latitude ?? ""}
        />
        <input
          type="hidden"
          name="longitude"
          value={coords.longitude ?? ""}
        />
        <input type="hidden" name="city" value={coords.city ?? ""} />
        <input type="hidden" name="country" value={coords.country ?? ""} />

        {showVenues && (searching || venueResults.length > 0) && (
          <ul className="absolute top-full z-10 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
            {searching && (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                Zoeken…
              </li>
            )}
            {venueResults.map((s) =>
              s.kind === "existing" ? (
                <li key={`v-${s.venue.id}`}>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pickExistingVenue(s.venue);
                    }}
                  >
                    {s.venue.name}{" "}
                    <span className="text-xs text-muted-foreground">
                      · {[s.venue.city, s.venue.country].filter(Boolean).join(", ")} · eerder gebruikt
                    </span>
                  </button>
                </li>
              ) : (
                <li key={`p-${s.place.latitude}-${s.place.longitude}`}>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pickNewPlace(s.place);
                    }}
                  >
                    {s.place.name}{" "}
                    <span className="text-xs text-muted-foreground">
                      · {s.place.displayName}
                    </span>
                  </button>
                </li>
              )
            )}
          </ul>
        )}

        {locationLabel && (
          <p className="text-xs text-muted-foreground">
            📍 {venueName}
            {locationLabel !== "Locatie geselecteerd" ? ` — ${locationLabel}` : ""}
          </p>
        )}
      </div>

      {/* Rating (optional) */}
      <div className="grid gap-2">
        <Label htmlFor="rating">Beoordeling (optioneel)</Label>
        <select
          id="rating"
          name="rating"
          defaultValue={initialGig?.rating?.toString() ?? ""}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
        >
          <option value="">Geen beoordeling</option>
          <option value="5">★★★★★</option>
          <option value="4">★★★★</option>
          <option value="3">★★★</option>
          <option value="2">★★</option>
          <option value="1">★</option>
        </select>
      </div>

      {/* Notes (optional) */}
      <div className="grid gap-2">
        <Label htmlFor="notes">Notities (optioneel)</Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="Hoe was het? Met wie was je?"
          defaultValue={initialGig?.notes ?? ""}
        />
      </div>

      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Bezig met opslaan…" : submitLabel}
      </Button>
    </form>
  );
}
