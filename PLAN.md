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

## Fase 1 — Optredens toevoegen en bekijken (2-3 sessies)

**Doel: de kern werkt, zonder kaart en zonder media.**

- [ ] Formulier "Nieuw optreden": artiest, datum, venue/festival-naam, type (venue of festival)
- [ ] Venue-zoekfunctie met Nominatim: je typt "Ziggo Dome" en de app vindt automatisch de coördinaten
- [ ] Hergebruik: bestaande artiesten en venues verschijnen als suggesties (geen dubbele "Kendrick Lamar" in je database)
- [ ] Lijstweergave van alle optredens, gesorteerd op datum (nieuwste eerst)
- [ ] Detailpagina per optreden
- [ ] Optreden bewerken en verwijderen

**Klaar wanneer:** je kunt op je telefoon binnen 30 seconden een optreden toevoegen en terugzien in de lijst.

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

## Fase 3 — Foto's en video's (2 sessies)

**Doel: herinneringen vastleggen per optreden.**

- [ ] Upload vanaf de detailpagina: meerdere foto's/video's tegelijk, rechtstreeks vanaf je telefoon (camera roll), naar het media-volume
- [ ] Progress bar tijdens upload; grote video's gestreamd naar schijf (niet volledig in geheugen)
- [ ] Thumbnails genereren voor foto's (server-side, bijv. met `sharp`)
- [ ] Media-galerij op de detailpagina: grid van thumbnails, tikken voor fullscreen lightbox
- [ ] Video's afspelen met poster-frame en play-knop (iOS-proof)
- [ ] Media verwijderen (bestand van het volume én rij uit de database)

**Klaar wanneer:** je staat op een festival, voegt het optreden toe en uploadt direct drie foto's vanaf je telefoon.

---

## Fase 4 — PWA & afwerking (1-2 sessies)

**Doel: voelt als een echte app.**

- [ ] PWA-manifest + service worker: installeerbaar op homescreen, eigen icoon, splash screen
- [ ] Responsive layout afmaken: desktop toont kaart en lijst naast elkaar, mobiel als tabs
- [ ] Donkere modus (kaart heeft sowieso een dark style — past mooi)
- [ ] Lege-staat schermen ("Nog geen optredens — voeg je eerste toe!")
- [ ] Loading states en error handling overal netjes

**Klaar wanneer:** de app staat als icoon op je telefoon en is niet van een native app te onderscheiden.

---

## Fase 5 — Leuke extra's (backlog, geen verplichting)

Ideeën voor later, in volgorde van hoe vet ze zijn:

- **Jaaroverzicht** ("Jouw 2026: 14 optredens, 3 landen, meest geziene artiest: ...") — Spotify Wrapped-stijl
- **Spotify-koppeling**: artiestfoto's en genres automatisch ophalen
- **Setlist.fm-integratie**: setlist van het concert erbij tonen
- **Delen**: een publieke read-only link naar je globe
- **Statistieken-pagina**: grafieken per jaar, genre, land
- **Export**: al je data als JSON/CSV downloaden
- **Vrienden taggen** die mee waren

---

## Volgorde van werken (samenvatting)

```
Fase 0: Fundament          ████ ~1-2 sessies
Fase R: Migratie selfhost  ██████ ~2-3 sessies
Fase 1: Optredens CRUD     ████████ ~2-3 sessies
Fase 2: Kaart & globe      ██████ ~2 sessies ✅
Fase 3: Media uploads      ██████ ~2 sessies
Fase 4: PWA & polish       ████ ~1-2 sessies
```

**Belangrijk:** na fase 1 is de app al bruikbaar. Na fase 2 is hij al vet. Niet alles hoeft af voordat je hem gebruikt — begin met je eerste echte optredens invoeren zodra fase 1 staat, dan test je meteen met echte data.

## Eerste concrete stap

Fase R en Fase 2 zijn afgerond: de code draait op de selfhost-stack (Drizzle + Postgres + Auth.js + Docker) en de home page is nu de interactieve globe met pins. De eerstvolgende inhoudelijke klus is **Fase 3 — foto's en video's** (media-upload naar het volume).

Om de huidige app lokaal te draaien:

```bash
cp .env.example .env.local            # vul DATABASE_URL, AUTH_SECRET, AUTH_URL, MEDIA_DIR in
docker compose up -d db               # lokale PostgreSQL
npm run db:migrate                    # tabellen aanmaken
npm run seed -- jij@voorbeeld.nl pw   # login-account aanmaken
npm run dev                           # app op http://localhost:3000
```
