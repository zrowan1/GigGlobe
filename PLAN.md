# PLAN.md — GigGlobe bouwplan

> Gefaseerd plan om GigGlobe te bouwen: een app om bij te houden welke artiesten je live hebt gezien, met een wereldkaart die volloopt met pins en foto's/video's per optreden. **De app wordt volledig selfhosted in een Docker-container op een eigen ZimaOS-thuisserver.**

## Het idee in één zin

Je voegt een optreden toe (artiest + datum + venue/festival), de locatie verschijnt als pin op een interactieve globe, en per optreden kun je foto's en video's uploaden als herinnering.

## Waarom deze aanpak werkt

- **Eén codebase, alle platforms.** Een Next.js PWA werkt in de browser op telefoon, tablet en desktop, en is op je telefoon te installeren als app-icoon (zonder app store).
- **Volledig in eigen beheer.** Alles draait in één `docker-compose` op je eigen ZimaOS-server: de app en een eigen PostgreSQL-database. Geen cloud-diensten, geen abonnementen, je data blijft thuis.
- **Eén container om te installeren.** Je bouwt één image en zet die met `docker compose up` op ZimaOS neer; media staan op een lokaal volume zodat ze updates overleven.
- **MapLibre en Nominatim zijn gratis.** Inclusief de 3D globe-weergave en het omzetten van venue-namen naar coördinaten — geen API-sleutels of abonnementen nodig.

---

## Fase 0 — Fundament (1-2 sessies)

**Doel: project draait lokaal én als container, ook al is het leeg.**

- [ ] Next.js project opzetten met TypeScript + Tailwind + shadcn/ui (`output: 'standalone'`)
- [ ] PostgreSQL als eigen container in `docker-compose`, met een volume voor de data
- [ ] Drizzle ORM + schema (`users`, `sessions`, `artists`, `venues`, `gigs`, `media` uit AGENTS.md) en eerste migratie
- [ ] Auth.js (NextAuth v5): login met e-mail + wachtwoord, sessies in Postgres
- [ ] `Dockerfile` + `docker-compose.yml` (app + postgres + media-volume)
- [ ] Reverse proxy + eigen (sub)domein met HTTPS

**Klaar wanneer:** je kunt inloggen op een lege app, lokaal én als draaiende container op je ZimaOS-server via je domein.

---

## Fase R — Migratie naar selfhost ✅ (afgerond)

**Doel: de bestaande Supabase/Vercel-code ombouwen naar de selfhost-stack uit AGENTS.md.** De huidige code was gebouwd op Supabase (cloud) + Vercel; deze fase heeft die afhankelijkheden eruit gehaald. De feature-fases hieronder (1–4) zijn inhoudelijk gelijk gebleven — alleen de onderliggende techniek is veranderd.

- [x] `@supabase/*`-client vervangen door **Drizzle ORM** + een Postgres-verbinding (`src/lib/db`)
- [x] Database-schema overzetten naar Drizzle (`users` + de inhoudelijke tabellen; géén `sessions`-tabel want JWT)
- [x] Magic-link login vervangen door **Auth.js** met e-mail + wachtwoord (account aanmaken via `npm run seed`)
- [x] `vercel.json` en Supabase-env vars verwijderen; `.env.example` bijwerken (`DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `MEDIA_DIR`)
- [x] `Dockerfile` + `docker-compose.yml` toevoegen (app + postgres + media-volume)
- [ ] **Later (Fase 3):** lokale media-upload + serveer-route — bewust nog niet gebouwd, hoort bij de media-fase

**Klaar wanneer:** de app draait volledig zonder Supabase of Vercel, in containers op je eigen server. ✅ De media-upload schuift mee naar Fase 3 (de `media`-tabel staat al wel in het schema).

---

## Fase 1 — Optredens toevoegen en bekijken (2-3 sessies) ✅ (afgerond)

**Doel: de kern werkt, zonder kaart en zonder media.**

- [x] Formulier "Nieuw optreden": artiest, datum, venue/festival-naam, type (venue of festival)
- [x] Venue-zoekfunctie met Nominatim: je typt "Ziggo Dome" en de app vindt automatisch de coördinaten
- [x] Hergebruik: bestaande artiesten en venues verschijnen als suggesties (geen dubbele "Kendrick Lamar" in je database)
- [x] Lijstweergave van alle optredens, gesorteerd op datum (nieuwste eerst)
- [x] Detailpagina per optreden
- [x] Optreden bewerken en verwijderen

**Klaar wanneer:** je kunt op je telefoon binnen 30 seconden een optreden toevoegen en terugzien in de lijst. ✅

---

## Fase 2 — De kaart en globe (2 sessies) ✅ (afgerond)

**Doel: het visuele hart van de app.**

- [x] MapLibre kaart als homepagina, met een pin per unieke venue
- [x] Globe-projectie via MapLibre v5 `projection: 'globe'`: van veraf een draaibare 3D-globe die bij inzoomen vanzelf plat wordt, plus een knopje om handmatig globe ↔ plat te wisselen
- [x] Pin aanklikken → popup met venue-naam + aantal optredens daar → doorklikken naar de optredens
- [x] Clustering: meerdere venues dicht bij elkaar worden samengevoegd bij uitzoomen (MapLibre's ingebouwde GeoJSON-clustering, geen extra library)
- [x] Tellertje/statistiek: "X optredens · Y venues · Z landen"

**Kaarttegels:** OpenFreeMap (gratis vector-tegels, geen API-sleutel, geen account) — past bij het selfhost-principe. De stijl wordt op het laden van de kaart herkleurd naar GigGlobe's donkere thema via `src/lib/map/style.ts` (`applyArtStyle`); pas de `ART_STYLE`-palette daar aan om de look te veranderen.

**Klaar wanneer:** je opent de app en ziet in één oogopslag je hele concertgeschiedenis op de wereld. ✅

---

## Fase 3 — Foto's en video's (2 sessies) ✅ (afgerond)

**Doel: herinneringen vastleggen per optreden.**

- [x] Upload vanaf de detailpagina: meerdere foto's/video's tegelijk, rechtstreeks vanaf je telefoon (camera roll), naar het media-volume
- [x] Progress bar tijdens upload; grote video's gestreamd naar schijf (niet volledig in geheugen)
- [x] Thumbnails genereren voor foto's (server-side, met `sharp`)
- [x] Media-galerij op de detailpagina: grid van thumbnails, tikken voor fullscreen lightbox
- [x] Video's afspelen met play-knop (iOS-proof: native `<video playsInline>`, geen autoplay; bewust géén ffmpeg/poster-frames om de image licht te houden)
- [x] Media verwijderen (bestand van het volume én rij uit de database)

**Aanpak:** upload via een streaming Route Handler (`POST /api/media/upload`) zodat grote video's
niet in het geheugen komen en de client via `XMLHttpRequest` een echte progress bar krijgt.
Serveren via geauthenticeerde, user-scoped routes (`GET /api/media/[id]` met Range-support, plus
`/thumb`) — bestanden staan buiten `public/`. Opslag onder `MEDIA_DIR` als
`<userId>/<gigId>/<mediaId>.<ext>`. Bij het verwijderen van een heel optreden worden de media
(rijen + bestanden) nu meegenomen.

**Klaar wanneer:** je staat op een festival, voegt het optreden toe en uploadt direct drie foto's vanaf je telefoon. ✅

---

## Fase 4 — PWA & afwerking (1-2 sessies) ✅ (afgerond)

**Doel: voelt als een echte app.**

- [x] PWA-manifest + service worker: installeerbaar op homescreen, eigen icoon, splash screen
- [x] Responsive layout afmaken: desktop toont kaart en lijst naast elkaar, mobiel als tabs
- [x] Donkere modus (kaart heeft sowieso een dark style — past mooi)
- [x] Lege-staat schermen ("Nog geen optredens — voeg je eerste toe!")
- [x] Loading states en error handling overal netjes

**Aanpak:** PWA via **`@serwist/next`** — de service worker wordt uit `src/app/sw.ts`
gebouwd naar `public/sw.js` (uit in dev), het manifest komt uit `src/app/manifest.ts`,
en de neon-globe iconen worden met `sharp` gegenereerd via `npm run icons`
(`scripts/generate-icons.ts` → `public/icons/`). Donkere modus met licht/donker-toggle
via **`next-themes`** (standaard donker, voorkeur onthouden); het dark-palette stond al
in `globals.css`. De home is nu één gecombineerde view (`src/components/home/home-view.tsx`):
desktop kaart + lijst naast elkaar, mobiel als tabs (de kaart blijft gemount bij
tab-wissel). Loading/error/not-found via `loading.tsx`, `error.tsx`, `not-found.tsx`.
De middleware-matcher laat `sw.js`, de Serwist-chunks en `manifest.webmanifest` bewust
door zonder login, zodat de PWA installeerbaar blijft.

**Mobiele polish:** rechtsbovenin de kaart deelden de zwevende actieknoppen (Nieuw /
thema / uitloggen), de MapLibre-zoomknoppen en de globe-toggle dezelfde hoek en liepen
op telefoons over elkaar. Opgelost door de MapLibre-controls op mobiel onder de
actieknoppen-rij te duwen (`.maplibregl-ctrl-top-right { margin-top }` in `globals.css`,
gereset op `lg+`) en de globe-toggle responsive eronder te zetten (`top-44 lg:top-28`),
zodat alles netjes verticaal stapelt. Op desktop staan de actieknoppen in de zijbalk, dus
daar verandert niets.

**Klaar wanneer:** de app staat als icoon op je telefoon en is niet van een native app te onderscheiden. ✅

---

## Fase 5a — Artiest- en venue-detailpagina's ✅ (afgerond)

**Doel: doorklikken op wat je al hebt vastgelegd.**

- [x] `/artists/[id]` — alle keren dat je één artiest zag, met mini-kaart en "X keer gezien · Y venues · Z landen"
- [x] `/venues/[id]` — alle optredens op één venue, met mini-kaart en "X optredens · Y artiesten"
- [x] Artiestnaam en venue op de optreden-detailpagina zijn nu links naar die pagina's
- [x] Kaart-popup ("Bekijk optredens") linkt nu naar de **venue-pagina** in plaats van de hele lijst

**Aanpak:** geen nieuwe tabellen en geen nieuwe dependency — alles komt uit gegevens die er al waren.
Vier user-scoped query-helpers erbij (`getArtist`, `getVenue`, `listGigsByArtist`, `listGigsByVenue` in
`src/lib/db/queries.ts`), plus `src/lib/gigs.ts` met kleine helpers die een optredenlijst omrekenen naar
unieke venues/landen/artiesten voor de kopregels en de mini-kaart. De bestaande `WorldMap` kreeg een
`compact`-stand (zonder zoomknoppen en globe-toggle) zodat hij ook in een klein kadertje past, en de
bestaande `GigsList` wordt hergebruikt. Een onbekende of andermans id geeft een 404 — dat is meteen het
bewijs dat de `user_id`-scoping werkt.

---

## Fase 5 — Leuke extra's (backlog, geen verplichting)

Ideeën voor later, in volgorde van hoe vet ze zijn:

- **Jaaroverzicht** ("Jouw 2026: 14 optredens, 3 landen, meest geziene artiest: ...") — Spotify Wrapped-stijl
- **Spotify-koppeling**: artiestfoto's en genres automatisch ophalen
- **Setlist.fm-integratie** ✅: setlist van het concert erbij tonen. Op de
  gig-detailpagina haal je met één knop de gespeelde nummers op van setlist.fm
  (zoeken op artiest + datum, zelf de juiste match kiezen). De setlist wordt
  opgeslagen in de database (`setlists`-tabel, songs als JSONB) zodat hij offline
  beschikbaar blijft, met een verplichte bronlink terug naar setlist.fm. Zet de
  gratis `SETLISTFM_API_KEY` (zie `.env.example`); zonder sleutel toont de knop
  netjes "geen setlist gevonden".
- **Delen**: een publieke read-only link naar je globe
- **Statistieken-pagina**: grafieken per jaar, genre, land
- **Export**: al je data als JSON/CSV downloaden
- **Vrienden taggen** die mee waren

### Nieuwe kandidaten ter beoordeling

Concrete extra features om uit te kiezen. De inschatting (waarde = hoeveel het toevoegt,
inspanning = hoeveel werk) is grof bedoeld als hulp bij het prioriteren — niet als belofte.

**Vinden & ordenen**

- **Zoeken & filteren in de lijst** — filter optredens op artiest, jaar, land of type (venue/festival) en zoek op naam. *Waarde: hoog · Inspanning: laag.* De lijst groeit snel; dit is waarschijnlijk de meest dagelijkse winst. **← nu het grootste openstaande item**
- ✅ **Artiest- en venue-detailpagina's** — klik een artiest aan en zie alle keren dat je 'm zag (met mini-kaart); idem per venue. *Afgerond* — zie "Fase 5a" hieronder.
- ✅ **Rating & notitie per optreden** — sterren + een vrij notitieveld. *Was al gebouwd* (kolommen `rating`/`notes` zitten sinds migratie `0000` in `gigs`, de velden staan in het optreden-formulier en zijn zichtbaar op de detailpagina en in de lijst).
- **Vrije tags/labels** — zelf labels toekennen ("met vrienden", "regen", "festivalzomer") en erop filteren. *Waarde: midden · Inspanning: midden.*

**Op de kaart**

- **Concertreis-animatie** — lijnen tussen venues in chronologische volgorde, als een reisroute over de globe die je kunt afspelen. *Waarde: hoog (wow-factor) · Inspanning: midden/hoog.*
- **Heatmap-laag** — schakelbare warmtelaag die laat zien waar je het vaakst was. *Waarde: midden · Inspanning: laag.* MapLibre heeft een ingebouwd heatmap-type.
- **Tijdlijn-scrubber** — een schuif onderaan de kaart om door de jaren te scrollen; pins verschijnen naarmate je vooruit gaat. *Waarde: midden/hoog · Inspanning: hoog.*

**Inzicht & herinnering**

- **Jaaroverzicht / "Wrapped"** (zie hierboven) — gedeelde basis met de statistiekenpagina. *Waarde: hoog · Inspanning: midden.*
- **"Op deze dag"** — toont op de homepagina optredens van vandaag in eerdere jaren. *Waarde: midden · Inspanning: laag.* Leuk in combinatie met PWA-notificaties.
- **PWA-push-notificaties** — herinneringen via de service worker die er al staat (bijv. "op deze dag" of een aankomend, alvast ingepland optreden). *Waarde: midden · Inspanning: midden/hoog* (push-subscriptions + VAPID-sleutels, selfhost-vriendelijk).

**Beheer & selfhost**

- **Backup & restore** — knop om een archief van database + media te downloaden en terug te zetten; past goed bij het selfhost-principe (jouw data, jouw back-up). *Waarde: hoog · Inspanning: midden.*
- **Data-export** (zie hierboven, JSON/CSV) — lichter alternatief/voorloper van een volledige backup. *Waarde: midden · Inspanning: laag.*
- **Bulk-import** — meerdere optredens in één keer toevoegen via CSV (of later vanuit Spotify-geschiedenis). *Waarde: midden · Inspanning: midden.* Handig om je historie in één keer in te laden.

---

## Volgorde van werken (samenvatting)

```
Fase 0: Fundament          ████ ~1-2 sessies
Fase R: Migratie selfhost  ██████ ~2-3 sessies ✅
Fase 1: Optredens CRUD     ████████ ~2-3 sessies ✅
Fase 2: Kaart & globe      ██████ ~2 sessies ✅
Fase 3: Media uploads      ██████ ~2 sessies ✅
Fase 4: PWA & polish       ████ ~1-2 sessies ✅
Fase 5a: Artiest/venue     ████ ~1 sessie ✅
```

**Belangrijk:** na fase 1 is de app al bruikbaar. Na fase 2 is hij al vet. Niet alles hoeft af voordat je hem gebruikt — begin met je eerste echte optredens invoeren zodra fase 1 staat, dan test je meteen met echte data.

## Eerste concrete stap

Fase R, 1, 2, 3, 4 en 5a zijn afgerond: de code draait op de selfhost-stack (Drizzle + Postgres + Auth.js + Docker), de home page is de gecombineerde kaart + lijst (desktop naast elkaar, mobiel als tabs), per optreden kun je foto's en video's uploaden/bekijken/verwijderen, de app is een installeerbare PWA met eigen neon-icoon, donkere modus (met toggle) en nette loading/error-schermen, en je kunt doorklikken naar een artiest- of venue-pagina met alle optredens daar.

**Wat nu?** Het grootste openstaande backlog-item is **zoeken & filteren in de lijst** (hoge waarde, lage inspanning). Daarnaast liggen er nog twee afgeronde branches klaar die nooit gemerged zijn: een **statistiekenpagina** (`claude/concert-statistics-feature-ijfzm2`, voegt een `recharts`-dependency toe) en een **setlist.fm-koppeling** (`claude/setlist-fm-integration-x973uj`, externe API met sleutel + een extra migratie). Allebei raken ze `src/lib/db/queries.ts`, dus wie als tweede landt moet even rebasen.

Om de huidige app lokaal te draaien:

```bash
cp .env.example .env.local            # vul DATABASE_URL, AUTH_SECRET, AUTH_URL, MEDIA_DIR in
docker compose up -d db               # lokale PostgreSQL
npm run db:migrate                    # tabellen aanmaken
npm run seed -- jij@voorbeeld.nl pw   # login-account aanmaken
npm run dev                           # app op http://localhost:3000
```
