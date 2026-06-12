# PLAN.md — GigGlobe bouwplan

> Gefaseerd plan om GigGlobe te bouwen: een app om bij te houden welke artiesten je live hebt gezien, met een wereldkaart die volloopt met pins en foto's/video's per optreden.

## Het idee in één zin

Je voegt een optreden toe (artiest + datum + venue/festival), de locatie verschijnt als pin op een interactieve globe, en per optreden kun je foto's en video's uploaden als herinnering.

## Waarom deze aanpak werkt

- **Eén codebase, alle platforms.** Een Next.js PWA werkt in de browser op telefoon, tablet en desktop, en is op je telefoon te installeren als app-icoon (zonder app store).
- **Supabase doet het zware werk.** Database, login én bestandsopslag in één dienst die je al hebt.
- **MapLibre is gratis.** Inclusief de 3D globe-weergave — geen Mapbox-abonnement nodig.
- **Vercel deploy in één command.** Je hebt Vercel al gekoppeld.

---

## Fase 0 — Fundament (1 sessie)

**Doel: project draait lokaal en is gedeployed, ook al is het leeg.**

- [ ] Next.js project opzetten met TypeScript + Tailwind + shadcn/ui
- [ ] Supabase project aanmaken, `.env.local` configureren
- [ ] Database-migraties draaien (tabellen uit AGENTS.md: `artists`, `venues`, `gigs`, `media`) inclusief RLS-policies
- [ ] Supabase Auth: simpele login met magic link (e-mail)
- [ ] Eerste deploy naar Vercel

**Klaar wanneer:** je kunt inloggen op een lege app, lokaal én op een live URL.

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

## Fase 2 — De kaart en globe (2 sessies)

**Doel: het visuele hart van de app.**

- [ ] MapLibre kaart als homepagina, met een pin per unieke venue
- [ ] Globe-projectie: op desktop/tablet een draaibare 3D-globe, op mobiel een platte kaart (performance)
- [ ] Pin aanklikken → popup met venue-naam + aantal optredens daar → doorklikken naar de optredens
- [ ] Clustering: meerdere venues dicht bij elkaar worden samengevoegd bij uitzoomen
- [ ] Tellertje/statistiek: "X optredens · Y venues · Z landen"

**Klaar wanneer:** je opent de app en ziet in één oogopslag je hele concertgeschiedenis op de wereld.

---

## Fase 3 — Foto's en video's (2 sessies)

**Doel: herinneringen vastleggen per optreden.**

- [ ] Upload vanaf de detailpagina: meerdere foto's/video's tegelijk, rechtstreeks vanaf je telefoon (camera roll)
- [ ] Progress bar tijdens upload; resumable uploads voor grote video's
- [ ] Thumbnails genereren voor foto's (Supabase image transformations)
- [ ] Media-galerij op de detailpagina: grid van thumbnails, tikken voor fullscreen lightbox
- [ ] Video's afspelen met poster-frame en play-knop (iOS-proof)
- [ ] Media verwijderen

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
Fase 0: Fundament          ████ ~1 sessie
Fase 1: Optredens CRUD     ████████ ~2-3 sessies
Fase 2: Kaart & globe      ██████ ~2 sessies
Fase 3: Media uploads      ██████ ~2 sessies
Fase 4: PWA & polish       ████ ~1-2 sessies
```

**Belangrijk:** na fase 1 is de app al bruikbaar. Na fase 2 is hij al vet. Niet alles hoeft af voordat je hem gebruikt — begin met je eerste echte optredens invoeren zodra fase 1 staat, dan test je meteen met echte data.

## Eerste concrete stap

Open een terminal en run:

```bash
npx create-next-app@latest gigglobe --typescript --tailwind --app
```

Dit maakt de projectmap aan met Next.js (het framework), TypeScript (vangt fouten op voordat je ze ziet) en Tailwind (styling). Daarna pak je samen met je coding agent Fase 0 op — AGENTS.md zorgt dat die agent precies weet wat de bedoeling is.
