# AGENTS.md — GigGlobe

> Dit bestand is bedoeld voor AI coding agents (Claude Code, OpenCode, etc.) die aan dit project werken. Lees dit volledig voordat je code schrijft.

## Wat is dit project?

**GigGlobe** is een app waarmee de gebruiker bijhoudt welke artiesten hij/zij live heeft gezien. Per optreden wordt vastgelegd: artiest, datum, venue of festival, locatie (coördinaten), en optioneel foto's/video's als herinnering. Alle bezochte locaties verschijnen als pins op een interactieve wereldkaart/globe.

**Doelgroep:** in eerste instantie de eigenaar zelf (single user), maar de architectuur moet multi-user aankunnen (elke rij heeft een `user_id` en queries worden altijd op de ingelogde gebruiker gescoped).

**Belangrijk — richting:** de app wordt **volledig selfhosted** in een Docker-container op een eigen thuisserver met **ZimaOS**. Er zijn bewust **geen cloud-afhankelijkheden** (geen Supabase-cloud, geen Vercel). Alles draait in één `docker-compose`: de Next.js-app + een eigen PostgreSQL-database, met media op een lokaal volume, bereikbaar via een reverse proxy met HTTPS.

## Tech stack (NIET afwijken zonder overleg)

| Laag | Keuze | Waarom |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | Eén codebase voor mobiel/tablet/desktop, draait als zelfstandige Node-server in een container (`output: 'standalone'`) |
| Styling | **Tailwind CSS + shadcn/ui** | Snel itereren, consistente componenten |
| Database | **PostgreSQL (self-hosted)** | Draait als eigen container in `docker-compose`, data op een lokaal volume. Volledig in eigen beheer |
| DB-toegang | **Drizzle ORM** | Lichtgewicht, TypeScript-first, SQL-dichtbij. Migraties in de repo (`drizzle-kit`) |
| Auth | **Auth.js (NextAuth v5)** met e-mail + wachtwoord | Geen externe mailserver nodig (geen magic link); sessie in een ondertekende JWT-cookie (de Credentials-provider werkt het eenvoudigst met JWT, dus géén `sessions`-tabel nodig) |
| Media-opslag | **Lokaal volume** (bind mount in de container) | Foto's en video's op schijf; de database bevat alleen het bestandspad + metadata |
| Kaart | **MapLibre GL JS** (via `react-map-gl/maplibre`) | Gratis, open source, geen Mapbox-token nodig |
| Globe-weergave | MapLibre `projection: 'globe'` | Sinds MapLibre v5 ingebouwd; geen aparte library nodig |
| Geocoding (venue → coördinaten) | **Nominatim (OpenStreetMap)** | Gratis; respecteer rate limit van 1 request/seconde |
| PWA | `@serwist/next` | Installeerbaar op telefoon, offline shell |
| Deployment | **Docker + docker-compose op ZimaOS** | Eén image, zelf te hosten; geen cloud-platform |
| Toegang | **Reverse proxy + eigen (sub)domein + HTTPS** | Bijv. via de ingebouwde ZimaOS-proxy, Traefik of Caddy |

## Architectuurprincipes

1. **Mobile first.** Ontwerp elk scherm eerst voor ~390px breed. Tablet en desktop zijn progressive enhancement (bredere grids, kaart en lijst naast elkaar).
2. **Server Components waar mogelijk**, Client Components alleen voor interactie (kaart, formulieren, upload).
3. **Toegangscontrole op applicatie-niveau.** Er is géén database-RLS meer. Elke tabel heeft een `user_id` kolom en **elke query filtert expliciet op de ingelogde `user_id`**. Centraliseer database-toegang in de data-laag (`src/lib/db`) zodat scoping niet per ongeluk wordt vergeten. Dit is nu de enige bescherming tegen datalekken tussen gebruikers — pas het overal consequent toe.
4. **Media gaat NOOIT in de database**, alleen op het gemounte volume. De database bevat alleen het bestandspad + metadata.
5. **Klein houden.** Geen state management library (geen Redux/Zustand) tenzij het echt nodig wordt. React state + server data volstaat.

## Datamodel

> SQL hieronder is het conceptuele model. In de praktijk wordt het schema gedefinieerd met **Drizzle ORM** in `src/lib/db/schema.ts` en gemigreerd met `drizzle-kit`. UUID's via `gen_random_uuid()` (de `pgcrypto`-extensie aanzetten).

```sql
-- users: eigen accounts (e-mail + wachtwoord via Auth.js)
-- Sessies staan NIET in de database maar in een JWT-cookie, dus er is geen
-- aparte sessions-tabel.
create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz default now()
);

-- artists: unieke artiesten (hergebruik bij meerdere optredens)
create table artists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users not null,
  name text not null,
  created_at timestamptz default now()
);

-- venues: locaties (venue óf festival)
create table venues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users not null,
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
  user_id uuid references users not null,
  artist_id uuid references artists not null,
  venue_id uuid references venues not null,
  gig_date date not null,
  notes text,
  rating smallint check (rating between 1 and 5),
  created_at timestamptz default now()
);

-- media: foto's en video's per gig (bestand op het volume, pad in de database)
create table media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users not null,
  gig_id uuid references gigs not null,
  storage_path text not null,
  media_type text not null check (media_type in ('photo', 'video')),
  created_at timestamptz default now()
);
```

Belangrijk: één festival-bezoek met meerdere artiesten = meerdere `gigs`-rijen die naar dezelfde `venue` en dezelfde datum wijzen. Dat is bewust.

> Houd `users` minimaal (e-mail + wachtwoord-hash) maar zorg dat álle inhoudelijke tabellen (`artists`, `venues`, `gigs`, `media`) naar `users` verwijzen. De login (`authorize`) zoekt de user op e-mail en vergelijkt het wachtwoord met de bcrypt-hash; de user-id reist daarna mee in de JWT.

## Mappenstructuur

```
src/
  app/
    (auth)/login/          # inlogpagina (e-mail + wachtwoord)
    page.tsx               # home = de kaart/globe
    gigs/                  # lijstweergave van alle optredens
    gigs/new/              # nieuw optreden toevoegen
    gigs/[id]/             # detailpagina met media-galerij
    api/media/             # upload + serveren van bestanden vanaf het volume
  components/
    map/                   # MapLibre componenten
    gigs/                  # formulieren, kaarten, lijstitems
    ui/                    # shadcn/ui componenten
  lib/
    db/                    # Drizzle client, schema (schema.ts) + query-helpers
    auth.ts                # Auth.js configuratie
    geocoding.ts           # Nominatim wrapper
  types/                   # gedeelde TypeScript types
drizzle/                   # gegenereerde migraties (drizzle-kit)
Dockerfile                 # multi-stage build van de app-image
docker-compose.yml         # app + postgres + volumes
```

## Conventies voor agents

- **Taal:** UI-teksten in het Nederlands. Code, comments en commit messages in het Engels.
- **Commits:** kleine, atomaire commits met duidelijke messages (`feat:`, `fix:`, `chore:`).
- **Uitleg verplicht:** de eigenaar van dit project is een beginnende developer. Leg bij elke wijziging in normale taal uit wát je hebt gedaan en waaróm. Vermijd jargon of leg het uit als je het gebruikt.
- **Iteratief werken:** bouw in kleine stappen die elk afzonderlijk testbaar zijn. Geef na elke stap aan hoe de gebruiker het kan testen (welke command, welke URL).
- **Geen verrassingen:** installeer geen extra dependencies zonder te benoemen wat ze doen en waarom ze nodig zijn.
- **Environment variables:** alle secrets in `.env.local` (lokaal) en via de `docker-compose`-omgeving (productie), nooit hardcoden. Documenteer nieuwe variabelen in `.env.example`. Verwachte variabelen: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL` (publieke URL van de app), `MEDIA_DIR` (pad naar het media-volume).

## Veelgemaakte valkuilen in dit project

- **Vergeet nooit op `user_id` te filteren** in een query. Zonder database-RLS is dit de enige scheiding tussen gebruikers; één ongescopte query = datalek. Gebruik de helpers in `src/lib/db`.
- Nominatim blokkeert je bij >1 request/seconde. Debounce de zoekfunctie en cache resultaten.
- Video-uploads kunnen groot zijn: stream de upload naar het volume (niet volledig in geheugen laden) en toon altijd een progress bar. Let op de Next.js body-size limiet voor route handlers/server actions en stel die bewust in. Reverse proxy mag de upload-grootte niet onnodig beperken (`client_max_body_size` o.i.d.).
- MapLibre rendert client-side: laad de kaartcomponent met `dynamic(() => import(...), { ssr: false })`.
- iOS Safari heeft beperkingen met video-autoplay: toon video's met poster-frame en expliciete play-knop.
- Achter een reverse proxy moet de app de juiste publieke URL kennen: zet `X-Forwarded-Host` en `X-Forwarded-Proto` door, stel `AUTH_URL` in op het publieke (sub)domein en draai met `AUTH_TRUST_HOST=true` zodat Auth.js de doorgegeven host vertrouwt voor zijn redirects.
- Media op een volume betekent dat je de map moet **mounten** en in de image niet meebakt; bij een nieuwe container mag bestaande media niet verdwijnen.

## Testen & kwaliteit

- `npm run dev` moet altijd zonder errors starten (met een lokale Postgres, bijv. `docker compose up db`).
- `npm run build` moet slagen vóór elke release.
- `docker compose build` + `docker compose up` moet de volledige stack (app + postgres) lokaal draaien zoals op ZimaOS.
- Test elke feature op mobiel formaat (DevTools → 390px breed) vóórdat je hem af noemt.
