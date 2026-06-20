# GigGlobe

Houd bij welke artiesten je live hebt gezien — met een wereldkaart die volloopt met pins en foto's/video's per optreden. Volledig **selfhosted** in een Docker-container op je eigen server.

Zie [PLAN.md](./PLAN.md) voor het bouwplan en [AGENTS.md](./AGENTS.md) voor de technische afspraken.

## Stack

Next.js 15 · PostgreSQL (self-hosted) + Drizzle ORM · Auth.js (e-mail + wachtwoord) · media op een lokaal volume · MapLibre · Docker / docker-compose op ZimaOS achter een reverse proxy met HTTPS.

## Status

- ✅ Fase 0 — Fundament (Next.js 15, login, datamodel)
- ✅ Fase R — Migratie naar selfhost (Supabase/Vercel eruit, PostgreSQL + Drizzle + Auth.js + Docker erin)
- 🔄 Fase 1 — Optredens toevoegen en bekijken (CRUD werkt al; verfijning volgt)
- ⬜ Fase 2 — De kaart en globe
- ⬜ Fase 3 — Foto's en video's
- ⬜ Fase 4 — PWA & afwerking

## Lokaal draaien

```bash
cp .env.example .env         # eenmalig: vul de waarden in (zie hieronder)
npm install                  # eenmalig: installeert alle dependencies
docker compose up -d db      # lokale PostgreSQL opstarten
npm run db:migrate           # eenmalig: maakt de tabellen aan
npm run seed -- jij@voorbeeld.nl jouw-wachtwoord   # maakt je login-account
npm run dev                  # start de app op http://localhost:3000
```

Je hebt een `.env` nodig (zie `.env.example`) met `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL` en `MEDIA_DIR`. Deze wordt bewust niet meegecommit (`.env.local` werkt ook en wint van `.env`). Genereer een `AUTH_SECRET` met `openssl rand -base64 32`. Hetzelfde `.env`-bestand wordt ook door `docker compose` gebruikt.

Inloggen gaat met **e-mailadres + wachtwoord**. Er is (nog) geen registratiepagina: accounts maak je aan met `npm run seed`. Dat commando opnieuw draaien met hetzelfde e-mailadres reset het wachtwoord.

## Selfhosten op ZimaOS

De hele app draait als containers via `docker-compose` (de Next.js-app + een PostgreSQL-database):

```bash
docker compose up -d db      # start eerst alleen de database
npm run db:migrate           # eenmalig: maakt de tabellen aan
npm run seed -- jij@voorbeeld.nl jouw-wachtwoord   # eenmalig: login-account
docker compose up -d --build # bouw en start de hele stack
```

Aandachtspunten:

- **Media** staan op een lokaal volume (`MEDIA_DIR`); mount die map zodat foto's en video's updates overleven. De app draait in de container als gebruiker met uid `1001`, dus de gemounte map moet voor die gebruiker schrijfbaar zijn — eenmalig `chown -R 1001:1001 ./media` (of een andere `MEDIA_DIR`) op de host. Optioneel beperk je de uploadgrootte per bestand met `MEDIA_MAX_UPLOAD_MB` (default 500).
- **Database** staat op een eigen volume zodat je data behouden blijft.
- Zet de app achter een **reverse proxy** (ZimaOS-proxy, Traefik of Caddy) met HTTPS en een eigen (sub)domein. Geef `X-Forwarded-Host` en `X-Forwarded-Proto` door en zet `AUTH_URL` op dat publieke domein. De app draait met `AUTH_TRUST_HOST=true` zodat Auth.js de proxy-host vertrouwt.
- **Grote video-uploads:** sta in de reverse proxy een ruime body-grootte toe, anders blokkeert de proxy de upload vóór de app (bij nginx bijv. `client_max_body_size 600m;` en liefst `proxy_request_buffering off;` zodat ook de proxy streamt in plaats van eerst volledig te bufferen).
