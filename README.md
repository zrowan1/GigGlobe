# GigGlobe

Houd bij welke artiesten je live hebt gezien — met een wereldkaart die volloopt met pins en foto's/video's per optreden. Volledig **selfhosted** in een Docker-container op je eigen server.

Zie [PLAN.md](./PLAN.md) voor het bouwplan en [AGENTS.md](./AGENTS.md) voor de technische afspraken.

## Stack

Next.js 15 · PostgreSQL (self-hosted) + Drizzle ORM · Auth.js (e-mail + wachtwoord) · media op een lokaal volume · MapLibre · Docker / docker-compose op ZimaOS achter een reverse proxy met HTTPS.

## Status

- ✅ Fase 0 — Fundament (Next.js 15, login, datamodel)
- ✅ Fase R — Migratie naar selfhost (Supabase/Vercel eruit, PostgreSQL + Drizzle + Auth.js + Docker erin)
- ✅ Fase 1 — Optredens toevoegen en bekijken (CRUD, Nominatim-zoek, hergebruik artiesten/venues)
- ✅ Fase 2 — De kaart en globe (MapLibre, neon-globe, clustering, statistieken)
- ✅ Fase 3 — Foto's en video's (streaming upload, thumbnails, galerij + lightbox)
- ✅ Fase 4 — PWA & afwerking (installeerbaar, donkere modus, gecombineerde kaart + lijst)
- ✅ Fase 5a — Artiest- en venue-detailpagina's (doorklikken vanaf een optreden of een pin op de kaart)

De inhoudelijke kern is compleet. Wat resteert is **Fase 5 (leuke extra's, backlog)** — zie [PLAN.md](./PLAN.md) voor de kandidaat-features. Grootste openstaande item: zoeken & filteren in de lijst.

## Lokaal draaien

```bash
cp .env.example .env         # eenmalig: vul de waarden in (zie hieronder)
npm install                  # eenmalig: installeert alle dependencies
docker compose up -d db      # lokale PostgreSQL opstarten
npm run db:migrate           # eenmalig: maakt de tabellen aan
npm run seed -- jij@voorbeeld.nl jouw-wachtwoord   # maakt je login-account
npm run dev                  # start de app op http://localhost:3000
```

Je hebt een `.env` nodig (zie `.env.example`) met `POSTGRES_PASSWORD`, `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL` en `MEDIA_DIR`. Deze wordt bewust niet meegecommit (`.env.local` werkt ook en wint van `.env`). Genereer een `AUTH_SECRET` met `openssl rand -base64 32` en een `POSTGRES_PASSWORD` met `openssl rand -base64 24`. Let op: het wachtwoord in `DATABASE_URL` moet gelijk zijn aan `POSTGRES_PASSWORD` (die twee handmatig gelijk houden). Hetzelfde `.env`-bestand wordt ook door `docker compose` gebruikt; zonder `POSTGRES_PASSWORD` weigert `docker compose` te starten.

Inloggen gaat met **e-mailadres + wachtwoord**. Er is (nog) geen registratiepagina: accounts maak je aan met `npm run seed`. Dat commando opnieuw draaien met hetzelfde e-mailadres reset het wachtwoord.

## Selfhosten op ZimaOS

**De makkelijkste weg — kant-en-klaar image via de GUI:** installeer GigGlobe met het vooraf gebouwde image (`ghcr.io/zrowan1/gigglobe`) zonder zelf te bouwen of migraties te draaien. Plak [`deploy/docker-compose.zimaos.yml`](./deploy/docker-compose.zimaos.yml) in de ZimaOS-app-import, vul de waarden in, klaar. De volledige stap-voor-stap staat in [docs/INSTALL-ZIMAOS.md](./docs/INSTALL-ZIMAOS.md). Bij de eerste start maakt het image zelf de tabellen aan en je login-account (uit `ADMIN_EMAIL`/`ADMIN_PASSWORD`).

**Vanuit de broncode bouwen** (onderstaande instructies) blijft mogelijk voor lokale dev of een handmatige deploy. De hele app draait als containers via `docker-compose` (de Next.js-app + een PostgreSQL-database):

```bash
docker compose up -d db      # start eerst alleen de database
npm run db:migrate           # eenmalig: maakt de tabellen aan
npm run seed -- jij@voorbeeld.nl jouw-wachtwoord   # eenmalig: login-account
docker compose up -d --build # bouw en start de hele stack
```

Aandachtspunten:

- **DB-wachtwoord:** zet een sterk `POSTGRES_PASSWORD` in `.env` (`openssl rand -base64 24`) en houd het gelijk aan het wachtwoord in `DATABASE_URL`. Zonder `POSTGRES_PASSWORD` start `docker compose` niet — dat is expres, zodat de triviale default nooit op de server terechtkomt.
- **`AUTH_URL`:** zet dit op het adres waarop je de app opent (bijv. `http://<zimaos-host>:3000`, je VPN/Tailscale-hostname, of je domein achter de reverse proxy). Staat het op `localhost`, dan breekt de login-redirect zodra je vanaf een ander apparaat inlogt.
- **DB-poort:** de database luistert alleen op `127.0.0.1:5432` (niet LAN-breed bereikbaar). Migraties draai je vanaf de host, of via `docker compose exec db psql ...`.
- **Media** staan op een lokaal volume (`MEDIA_DIR`); mount die map zodat foto's en video's updates overleven. De app draait in de container als gebruiker met uid `1001`, dus de gemounte map moet voor die gebruiker schrijfbaar zijn — eenmalig `chown -R 1001:1001 ./media` (of een andere `MEDIA_DIR`) op de host. Optioneel beperk je de uploadgrootte per bestand met `MEDIA_MAX_UPLOAD_MB` (default 500).
- **Database** staat op een eigen volume zodat je data behouden blijft.
- Zet de app achter een **reverse proxy** (ZimaOS-proxy, Traefik of Caddy) met HTTPS en een eigen (sub)domein. Geef `X-Forwarded-Host` en `X-Forwarded-Proto` door en zet `AUTH_URL` op dat publieke domein. De app draait met `AUTH_TRUST_HOST=true` zodat Auth.js de proxy-host vertrouwt.
- **Grote video-uploads:** sta in de reverse proxy een ruime body-grootte toe, anders blokkeert de proxy de upload vóór de app (bij nginx bijv. `client_max_body_size 600m;` en liefst `proxy_request_buffering off;` zodat ook de proxy streamt in plaats van eerst volledig te bufferen).
