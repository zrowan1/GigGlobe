# AGENTS.md — GigGlobe

> Dit bestand is bedoeld voor AI coding agents (Claude Code, OpenCode, etc.) die aan dit project werken. Lees dit volledig voordat je code schrijft.

## Wat is dit project?

**GigGlobe** is een app waarmee de gebruiker bijhoudt welke artiesten hij/zij live heeft gezien. Per optreden wordt vastgelegd: artiest, datum, venue of festival, locatie (coördinaten), en optioneel foto's/video's als herinnering. Alle bezochte locaties verschijnen als pins op een interactieve wereldkaart/globe.

**Doelgroep:** in eerste instantie de eigenaar zelf (single user), maar de architectuur moet multi-user aankunnen (Supabase auth is vanaf dag 1 aanwezig).

## Tech stack (NIET afwijken zonder overleg)

| Laag | Keuze | Waarom |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | Eén codebase voor mobiel/tablet/desktop, deploybaar op Vercel |
| Styling | **Tailwind CSS + shadcn/ui** | Snel itereren, consistente componenten |
| Database & Auth | **Supabase** (Postgres + Auth + Storage) | Gebruiker heeft al een Supabase-account; Row Level Security voor multi-user |
| Media-opslag | **Supabase Storage** | Foto's en video's per optreden, met signed URLs |
| Kaart | **MapLibre GL JS** (via `react-map-gl/maplibre`) | Gratis, open source, geen Mapbox-token nodig |
| Globe-weergave | MapLibre `projection: 'globe'` | Sinds MapLibre v5 ingebouwd; geen aparte library nodig |
| Geocoding (venue → coördinaten) | **Nominatim (OpenStreetMap)** | Gratis; respecteer rate limit van 1 request/seconde |
| PWA | `@serwist/next` | Installeerbaar op telefoon, offline shell |
| Deployment | **Vercel** | Gebruiker heeft Vercel gekoppeld |

## Architectuurprincipes

1. **Mobile first.** Ontwerp elk scherm eerst voor ~390px breed. Tablet en desktop zijn progressive enhancement (bredere grids, kaart en lijst naast elkaar).
2. **Server Components waar mogelijk**, Client Components alleen voor interactie (kaart, formulieren, upload).
3. **Alle database-toegang via Supabase met Row Level Security (RLS).** Elke tabel heeft een `user_id` kolom en een RLS-policy `auth.uid() = user_id`. Geen uitzonderingen.
4. **Media gaat NOOIT in de database**, alleen in Supabase Storage. De database bevat alleen het pad + metadata.
5. **Klein houden.** Geen state management library (geen Redux/Zustand) tenzij het echt nodig wordt. React state + server data volstaat.

## Datamodel

```sql
-- artists: unieke artiesten (hergebruik bij meerdere optredens)
create table artists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  created_at timestamptz default now()
);

-- venues: locaties (venue óf festival)
create table venues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  type text not null check (type in ('venue', 'festival')),
  city text,
  country text,
  latitude double precision not null,
  longitude double precision not null,
  created_at timestamptz default now()
);

-- gigs: het optreden zelf
create table gigs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  artist_id uuid references artists not null,
  venue_id uuid references venues not null,
  gig_date date not null,
  notes text,
  rating smallint check (rating between 1 and 5),
  created_at timestamptz default now()
);

-- media: foto's en video's per gig
create table media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  gig_id uuid references gigs not null,
  storage_path text not null,
  media_type text not null check (media_type in ('photo', 'video')),
  created_at timestamptz default now()
);
```

Belangrijk: één festival-bezoek met meerdere artiesten = meerdere `gigs`-rijen die naar dezelfde `venue` en dezelfde datum wijzen. Dat is bewust.

## Mappenstructuur

```
src/
  app/
    (auth)/login/          # inlogpagina
    page.tsx               # home = de kaart/globe
    gigs/                  # lijstweergave van alle optredens
    gigs/new/              # nieuw optreden toevoegen
    gigs/[id]/             # detailpagina met media-galerij
  components/
    map/                   # MapLibre componenten
    gigs/                  # formulieren, kaarten, lijstitems
    ui/                    # shadcn/ui componenten
  lib/
    supabase/              # client + server helpers
    geocoding.ts           # Nominatim wrapper
  types/                   # gedeelde TypeScript types
```

## Conventies voor agents

- **Taal:** UI-teksten in het Nederlands. Code, comments en commit messages in het Engels.
- **Commits:** kleine, atomaire commits met duidelijke messages (`feat:`, `fix:`, `chore:`).
- **Uitleg verplicht:** de eigenaar van dit project is een beginnende developer. Leg bij elke wijziging in normale taal uit wát je hebt gedaan en waaróm. Vermijd jargon of leg het uit als je het gebruikt.
- **Iteratief werken:** bouw in kleine stappen die elk afzonderlijk testbaar zijn. Geef na elke stap aan hoe de gebruiker het kan testen (welke command, welke URL).
- **Geen verrassingen:** installeer geen extra dependencies zonder te benoemen wat ze doen en waarom ze nodig zijn.
- **Environment variables:** alle secrets in `.env.local`, nooit hardcoden. Documenteer nieuwe variabelen in `.env.example`.

## Veelgemaakte valkuilen in dit project

- Nominatim blokkeert je bij >1 request/seconde. Debounce de zoekfunctie en cache resultaten.
- Video-uploads kunnen groot zijn: gebruik Supabase resumable uploads (TUS) voor bestanden >6MB en toon altijd een progress bar.
- MapLibre rendert client-side: laad de kaartcomponent met `dynamic(() => import(...), { ssr: false })`.
- iOS Safari heeft beperkingen met video-autoplay: toon video's met poster-frame en expliciete play-knop.
- RLS vergeten op een nieuwe tabel = datalek. Elke `create table` migration bevat direct de bijbehorende policies.

## Testen & kwaliteit

- `npm run dev` moet altijd zonder errors starten.
- `npm run build` moet slagen vóór elke deploy.
- Test elke feature op mobiel formaat (DevTools → 390px breed) vóórdat je hem af noemt.
