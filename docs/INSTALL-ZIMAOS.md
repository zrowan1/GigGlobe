# GigGlobe op ZimaOS installeren (kant-en-klaar image)

Deze route gebruikt het vooraf gebouwde image van GHCR — je hoeft niets te bouwen
en geen terminal-commando's voor migraties of het eerste account te draaien. Het
image doet dat zelf bij de eerste start.

Wil je liever vanuit de broncode bouwen (of op een gewone Linux-host via de
terminal), zie dan de "Lokaal draaien" / "Selfhosten"-secties in de
[README](../README.md); daarvoor gebruik je `docker-compose.yml` in de repo-root.

## Vereisten

- ZimaOS met Docker (standaard aanwezig).
- Het image moet publiek zijn op GHCR (`ghcr.io/zrowan1/gigglobe`). Zie
  [Het image publiceren](#het-image-publiceren) als dat nog niet gebeurd is.
- Het adres waarop je de app gaat openen (LAN-IP van je server, of je
  VPN/Tailscale-hostname).

## Installeren via de GUI

1. Open in ZimaOS de **App Store** en klik op **"Install a Custom App"**.
2. Klik rechtsboven op **Import** en ga naar het tabblad **Docker Compose**.
3. Plak de inhoud van [`deploy/docker-compose.zimaos.yml`](../deploy/docker-compose.zimaos.yml).
4. Verander elke `CHANGE_ME`-waarde (zie [Instellingen](#instellingen) hieronder).
5. Klik **Submit**. ZimaOS trekt het image binnen en start de app.
6. Open `http://<server-ip>:3000` en log in met het `ADMIN_EMAIL` /
   `ADMIN_PASSWORD` dat je hebt ingevuld. De databasetabellen en je account zijn
   bij de eerste start automatisch aangemaakt.

## Instellingen

Genereer de geheimen op een willekeurige machine:

```bash
openssl rand -base64 32   # AUTH_SECRET
openssl rand -base64 24   # database-wachtwoord
```

| Waarde | Wat | Voorbeeld |
| --- | --- | --- |
| `x-pgpass` (anchor) | Database-wachtwoord. Sta op één plek; beide services gebruiken het. | `k3split...` |
| `AUTH_SECRET` | Ondertekent de sessie-cookie. | `openssl rand -base64 32` |
| `AUTH_URL` | Exact het adres waarop je de app opent. Fout = login-redirect breekt. | `http://192.168.1.50:3000` |
| `ADMIN_EMAIL` | E-mailadres van je eerste login-account. | `jij@voorbeeld.nl` |
| `ADMIN_PASSWORD` | Wachtwoord van dat account (alleen bij eerste start gebruikt). | een sterk wachtwoord |
| `SETLISTFM_API_KEY` | Optioneel; gratis sleutel van api.setlist.fm voor setlists. | leeg laten mag |

Na de eerste succesvolle start mag je `ADMIN_PASSWORD` weghalen — het account
blijft bestaan en de bootstrap draait alleen bij een lege database.

## Updaten naar een nieuwe versie

Het image volgt de tag `:latest`. Om te updaten:

- **In de ZimaOS-GUI:** open de app en kies "Update"/"Pull", of herinstalleer met
  dezelfde compose (je data blijft op de volumes staan).
- **Via de terminal:**
  ```bash
  docker compose -f docker-compose.zimaos.yml pull
  docker compose -f docker-compose.zimaos.yml up -d
  ```

Migraties bij een nieuwe versie draaien automatisch bij de start — je hoeft niets
handmatig te doen.

## Back-ups

De data staat op twee named volumes (`gigglobe_db_data`, `gigglobe_media_data`).
Maak periodiek een kopie:

```bash
# Database
docker exec -t $(docker ps -qf name=gigglobe-db) \
  pg_dump -U gigglobe gigglobe > gigglobe-db-$(date +%F).sql

# Media (foto's/video's)
docker run --rm -v gigglobe_media_data:/media -v "$PWD":/backup alpine \
  tar czf /backup/gigglobe-media-$(date +%F).tar.gz -C /media .
```

Bewaar die bestanden op een andere schijf of NAS-share.

## Het image publiceren

Het image wordt automatisch gebouwd en naar GHCR gepusht door
[`.github/workflows/publish-image.yml`](../.github/workflows/publish-image.yml)
bij elke push naar `main` en bij `v*`-tags (multi-arch: amd64 + arm64).

Eenmalig, na de eerste geslaagde build: zet het package op **public** zodat het
zonder inloggen te pullen is — GitHub → je profiel → **Packages** → `gigglobe` →
**Package settings** → **Change visibility → Public**.

## Problemen oplossen

- **App start niet / blijft herstarten** → bekijk de logs (`docker logs <app-container>`
  of de logs in de ZimaOS-GUI). Meestal was de database nog niet klaar; de app
  probeert de migraties automatisch opnieuw.
- **Kan niet inloggen vanaf een ander apparaat / redirect-loop** → `AUTH_URL` moet
  exact het adres zijn dat je in de browser typt. Aanpassen en de app herstarten.
- **Login-account werkt niet** → controleer of `ADMIN_EMAIL`/`ADMIN_PASSWORD`
  gezet waren bij de allereerste start (de bootstrap draait alleen bij een lege
  database). Is de database al aangemaakt zonder account? Verwijder het
  `db_data`-volume en start opnieuw, of maak het account via `npm run seed` op een
  machine met de broncode.
