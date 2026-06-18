# GigGlobe

Houd bij welke artiesten je live hebt gezien — met een wereldkaart die volloopt met pins en foto's/video's per optreden. Volledig **selfhosted** in een Docker-container op je eigen server.

Zie [PLAN.md](./PLAN.md) voor het bouwplan en [AGENTS.md](./AGENTS.md) voor de technische afspraken.

## Stack

Next.js 15 · PostgreSQL (self-hosted) + Drizzle ORM · Auth.js (e-mail + wachtwoord) · media op een lokaal volume · MapLibre · Docker / docker-compose op ZimaOS achter een reverse proxy met HTTPS.

## Status

- ✅ Fase 0 — Fundament (Next.js 15, login, datamodel)
- 🔄 Fase R — Migratie naar selfhost (Supabase/Vercel eruit, PostgreSQL + Drizzle + Auth.js + Docker erin) — **huidige focus**
- ⬜ Fase 1 — Optredens toevoegen en bekijken
- ⬜ Fase 2 — De kaart en globe
- ⬜ Fase 3 — Foto's en video's
- ⬜ Fase 4 — PWA & afwerking

## Lokaal draaien

```bash
docker compose up -d db   # lokale PostgreSQL opstarten
npm install               # eenmalig: installeert alle dependencies
npm run dev               # start de app op http://localhost:3000
```

Je hebt een `.env.local` nodig (zie `.env.example`) met o.a. `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL` en `MEDIA_DIR`. Deze wordt bewust niet meegecommit.

## Selfhosten op ZimaOS

De hele app draait als containers via `docker-compose` (de Next.js-app + een PostgreSQL-database):

```bash
docker compose build
docker compose up -d
```

Aandachtspunten:

- **Media** staan op een lokaal volume (`MEDIA_DIR`); mount die map zodat foto's en video's updates overleven.
- **Database** staat op een eigen volume zodat je data behouden blijft.
- Zet de app achter een **reverse proxy** (ZimaOS-proxy, Traefik of Caddy) met HTTPS en een eigen (sub)domein. Geef `X-Forwarded-Host` en `X-Forwarded-Proto` door en zet `AUTH_URL` op dat publieke domein.
