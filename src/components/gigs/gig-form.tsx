"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { searchVenuePlaces, type GigFormState } from "@/app/gigs/actions";
import type { GeoResult } from "@/lib/geocoding";
import type { Artist, GigWithRelations, Venue, VenueType } from "@/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  // The name and the geographic place are two separate things. The name is
  // free text (e.g. "Pinkpop") — a festival's name is rarely a place you can
  // look up on a map. The place (city/coordinates) is looked up separately via
  // Nominatim, so you can pin "Pinkpop" to "Landgraaf" without them fighting.
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

  // Name field: suggests venues you used before, matched on the typed name.
  const [showVenues, setShowVenues] = useState(false);
  const existingMatches =
    venueName.trim().length === 0
      ? []
      : venues
          .filter((v) =>
            v.name.toLowerCase().includes(venueName.trim().toLowerCase())
          )
          .slice(0, 5);

  // Place field: a separate box that geocodes a city/place via Nominatim.
  const [placeQuery, setPlaceQuery] = useState(
    [initialGig?.venue.city, initialGig?.venue.country]
      .filter(Boolean)
      .join(", ")
  );
  const [placeResults, setPlaceResults] = useState<GeoResult[]>([]);
  const [showPlaces, setShowPlaces] = useState(false);
  const [searchingPlace, setSearchingPlace] = useState(false);

  // Debounced Nominatim search on the place field. The pause keeps us well
  // under Nominatim's 1-request-per-second limit.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const query = placeQuery.trim();

    if (query.length < 3) {
      setPlaceResults([]);
      setSearchingPlace(false);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }

    setSearchingPlace(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const places = await searchVenuePlaces(query);
      setPlaceResults(places);
      setSearchingPlace(false);
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [placeQuery]);

  // Picking a venue you used before fills in everything at once: name, type,
  // and its saved place/coordinates.
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
    setPlaceQuery([venue.city, venue.country].filter(Boolean).join(", "));
    setShowVenues(false);
  }

  // Picking a place only sets the coordinates/city/country — it deliberately
  // leaves the name alone, so the festival name you typed stays intact.
  function pickPlace(place: GeoResult) {
    setVenueId(""); // a new place means we can no longer reuse a saved venue
    setCoords({
      latitude: place.latitude,
      longitude: place.longitude,
      city: place.city,
      country: place.country,
    });
    setPlaceQuery(
      [place.city, place.country].filter(Boolean).join(", ") || place.name
    );
    setShowPlaces(false);
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

      {/* Location name (free text) */}
      <div className="relative grid gap-2">
        <Label htmlFor="venueName">
          {venueType === "festival" ? "Festivalnaam" : "Locatie"}
        </Label>
        <Input
          id="venueName"
          name="venueName"
          autoComplete="off"
          placeholder={
            venueType === "festival"
              ? "Bijv. Pinkpop of Lowlands"
              : "Bijv. Ziggo Dome"
          }
          value={venueName}
          onChange={(e) => {
            setVenueName(e.target.value);
            // Typing a name means it's no longer a saved venue you picked.
            setVenueId("");
            setShowVenues(true);
          }}
          onFocus={() => setShowVenues(true)}
          onBlur={() => setTimeout(() => setShowVenues(false), 150)}
          required
        />
        {/* Hidden fields the server action reads. */}
        <input type="hidden" name="venueId" value={venueId} />
        <input type="hidden" name="latitude" value={coords.latitude ?? ""} />
        <input type="hidden" name="longitude" value={coords.longitude ?? ""} />
        <input type="hidden" name="city" value={coords.city ?? ""} />
        <input type="hidden" name="country" value={coords.country ?? ""} />

        {showVenues && existingMatches.length > 0 && (
          <ul className="absolute top-full z-10 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
            {existingMatches.map((venue) => (
              <li key={`v-${venue.id}`}>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pickExistingVenue(venue);
                  }}
                >
                  {venue.name}{" "}
                  <span className="text-xs text-muted-foreground">
                    · {[venue.city, venue.country].filter(Boolean).join(", ")} ·
                    eerder gebruikt
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Place / city lookup (geocoded via Nominatim) */}
      <div className="relative grid gap-2">
        <Label htmlFor="placeQuery">Plaats</Label>
        <Input
          id="placeQuery"
          autoComplete="off"
          placeholder={
            venueType === "festival"
              ? "Zoek de plaats, bijv. Landgraaf"
              : "Zoek de plaats, bijv. Amsterdam"
          }
          value={placeQuery}
          onChange={(e) => {
            setPlaceQuery(e.target.value);
            // Changing the place invalidates the current coordinates until a
            // new suggestion is picked, and it's no longer a saved venue.
            setVenueId("");
            setCoords({
              latitude: null,
              longitude: null,
              city: null,
              country: null,
            });
            setShowPlaces(true);
          }}
          onFocus={() => setShowPlaces(true)}
          onBlur={() => setTimeout(() => setShowPlaces(false), 150)}
        />

        {showPlaces && (searchingPlace || placeResults.length > 0) && (
          <ul className="absolute top-full z-10 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
            {searchingPlace && (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                Zoeken…
              </li>
            )}
            {placeResults.map((place) => (
              <li key={`p-${place.latitude}-${place.longitude}`}>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pickPlace(place);
                  }}
                >
                  {place.name}{" "}
                  <span className="text-xs text-muted-foreground">
                    · {place.displayName}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-muted-foreground">
          {locationLabel
            ? `📍 ${venueName || "Locatie"} — ${locationLabel}`
            : "Zoek en kies de plaats zodat we het optreden op de kaart kunnen zetten."}
        </p>
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
