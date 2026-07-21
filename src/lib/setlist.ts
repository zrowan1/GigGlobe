// setlist.fm API wrapper.
//
// We use this to look up the setlist (the songs played) for a gig, by artist
// name + date. Like the Nominatim wrapper, this runs server-side because:
//   - the API requires a secret key (x-api-key header) we must not ship to the
//     browser,
//   - setlist.fm asks callers to send an identifying User-Agent.
// setlist.fm is rate limited (~2 req/sec, 1440/day), but we only call it when
// the user clicks "Setlist ophalen", so that is plenty.
//
// setlist.fm also REQUIRES that, when you display a setlist, you show a link
// back to the original page. That is why every result carries its `url`.

import type { SetlistSong } from "@/types";

const SETLISTFM_URL = "https://api.setlist.fm/rest/1.0/search/setlists";

// One candidate setlist, already flattened for our use. The user picks one of
// these (a date can have several, e.g. different artists at a festival).
export interface SetlistSearchResult {
  id: string; // setlist.fm id of this setlist
  url: string; // public setlist.fm page, for the required attribution link
  eventDate: string; // ISO date "yyyy-MM-dd"
  venueName: string | null;
  cityName: string | null;
  tourName: string | null;
  songs: SetlistSong[];
}

// The raw shapes setlist.fm returns (only the fields we use). Songs are nested
// per "set" (main set, encores); each set has an array of songs.
interface SfmSong {
  name?: string;
  info?: string;
  cover?: { name?: string };
  tape?: boolean;
}
interface SfmSetlist {
  id?: string;
  url?: string;
  eventDate?: string; // setlist.fm format "dd-MM-yyyy"
  tour?: { name?: string };
  venue?: { name?: string; city?: { name?: string } };
  sets?: { set?: { song?: SfmSong[] }[] };
}
interface SfmSearchResponse {
  setlist?: SfmSetlist[];
}

// setlist.fm wants the date as dd-MM-yyyy; our gig_date is yyyy-MM-dd.
function toSfmDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  if (!y || !m || !d) return isoDate;
  return `${d}-${m}-${y}`;
}

// setlist.fm gives back dd-MM-yyyy; turn it back into our ISO yyyy-MM-dd.
function fromSfmDate(sfmDate: string | undefined): string {
  if (!sfmDate) return "";
  const [d, m, y] = sfmDate.split("-");
  if (!y || !m || !d) return sfmDate;
  return `${y}-${m}-${d}`;
}

// Flatten the nested sets/songs into a single list of songs.
function flattenSongs(setlist: SfmSetlist): SetlistSong[] {
  const sets = setlist.sets?.set ?? [];
  const songs: SetlistSong[] = [];
  for (const set of sets) {
    for (const song of set.song ?? []) {
      const name = song.name?.trim();
      if (!name && !song.tape) continue;
      songs.push({
        name: name || "(onbekend nummer)",
        info: song.info?.trim() || null,
        cover: song.cover?.name?.trim() || null,
      });
    }
  }
  return songs;
}

function toSearchResult(s: SfmSetlist): SetlistSearchResult {
  return {
    id: s.id ?? "",
    url: s.url ?? "",
    eventDate: fromSfmDate(s.eventDate),
    venueName: s.venue?.name?.trim() || null,
    cityName: s.venue?.city?.name?.trim() || null,
    tourName: s.tour?.name?.trim() || null,
    songs: flattenSongs(s),
  };
}

// Rank candidates so the one matching the gig's stored city/venue floats to
// the top, without ever dropping the others. We deliberately do NOT filter on
// city: setlist.fm's cityName filter is strict, and for festivals the city we
// geocoded ("Landgraaf" vs. a hamlet, or a translated/misspelled name) often
// doesn't match setlist.fm's record — which would wrongly return zero results.
// Searching on artist + date and ranking locally is far more robust.
function rankByCity(
  results: SetlistSearchResult[],
  cityHint: string | null | undefined
): SetlistSearchResult[] {
  const hint = cityHint?.trim().toLowerCase();
  if (!hint) return results;

  const score = (r: SetlistSearchResult): number => {
    const city = r.cityName?.toLowerCase() ?? "";
    const venue = r.venueName?.toLowerCase() ?? "";
    if (city === hint) return 3;
    if (city.includes(hint) || hint.includes(city)) return 2;
    if (venue.includes(hint) || hint.includes(venue)) return 1;
    return 0;
  };

  // Stable sort by score (highest first); ties keep setlist.fm's own order.
  return results
    .map((r, i) => ({ r, i, s: score(r) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.r);
}

// Search setlists for an artist on a given date. Returns candidate setlists for
// the user to pick from, best city/venue match first. Returns an empty list
// when there is no API key, no match, or on any error — callers never have to
// handle exceptions for a simple lookup.
//
// `cityName` is used only as a ranking hint (see rankByCity), not as a hard
// filter, so festivals whose geocoded city differs from setlist.fm's still show
// up.
export async function searchSetlists(
  artistName: string,
  isoDate: string,
  cityName?: string | null
): Promise<SetlistSearchResult[]> {
  const apiKey = process.env.SETLISTFM_API_KEY;
  if (!apiKey) return []; // feature simply shows "no setlist found" without a key

  const name = artistName.trim();
  if (!name || !isoDate) return [];

  const url = new URL(SETLISTFM_URL);
  url.searchParams.set("artistName", name);
  url.searchParams.set("date", toSfmDate(isoDate));

  try {
    const res = await fetch(url, {
      headers: {
        "x-api-key": apiKey,
        Accept: "application/json",
        "User-Agent": "GigGlobe/0.1 (concert tracker)",
      },
      // Cache identical lookups for a day: friendlier to the rate limit and
      // faster if the user retries. Setlists rarely change after the event.
      next: { revalidate: 86400 },
    });

    // 404 means "nothing found" for this search endpoint — not an error.
    if (!res.ok) return [];

    const data = (await res.json()) as SfmSearchResponse;
    const results = (data.setlist ?? []).map(toSearchResult);
    return rankByCity(results, cityName);
  } catch {
    return [];
  }
}
