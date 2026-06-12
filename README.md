# GigGlobe

Houd bij welke artiesten je live hebt gezien — met een wereldkaart die volloopt met pins en foto's/video's per optreden.

Zie [PLAN.md](./PLAN.md) voor het bouwplan en [AGENTS.md](./AGENTS.md) voor de technische afspraken.

## Status

- ✅ Fase 0 — Fundament (Next.js 15, Supabase database + RLS, magic link login)
- ⬜ Fase 1 — Optredens toevoegen en bekijken
- ⬜ Fase 2 — De kaart en globe
- ⬜ Fase 3 — Foto's en video's
- ⬜ Fase 4 — PWA & afwerking

## Lokaal draaien

```bash
npm install   # eenmalig: installeert alle dependencies
npm run dev   # start de app op http://localhost:3000
```

Je hebt een `.env.local` nodig met de Supabase-gegevens (zie `.env.example`). Deze staat al klaar en wordt bewust niet meegecommit.

## Deployen

Het project deployt naar Vercel. Push naar `main` (na eenmalige import van deze repo op vercel.com/new) en Vercel bouwt automatisch.
