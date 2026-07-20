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

> **Let op — de ZimaOS-import herschrijft je compose.** De App-Store-wizard
> (CasaOS) normaliseert het compose-bestand bij het importeren en wijkt daarbij
> op drie punten af van `deploy/docker-compose.zimaos.yml`. Loopt de installatie
> vast, controleer dan het gegenereerde bestand op de server onder
> `/var/lib/casaos/apps/<app-id>/docker-compose.yml`:
>
> 1. **De poort-mapping wordt op álle services geplakt**, dus ook op `db`. Twee
>    containers proberen dan host-poort `3000` te binden; `db` start als eerste
>    (de app wacht op `depends_on`) en de app blijft steken op status `Created`
>    met `Bind for 0.0.0.0:3000 failed: port is already allocated`. Verwijder het
>    `ports`-blok bij `db` — PostgreSQL hoeft niets te publiceren, de app bereikt
>    de database intern.
> 2. **`network_mode: bridge` wordt toegevoegd.** Dat is de legacy
>    default-bridge, die géén DNS op containernaam biedt. De app kan
>    `POSTGRES_HOST: db` daardoor niet resolven. Haal `network_mode` bij beide
>    services weg, zodat ze op het compose-netwerk terechtkomen waar
>    naam-resolutie wél werkt.
> 3. **Named volumes worden omgezet naar host-bind-mounts** (bijv. `/DATA/Media`).
>    Zulke mappen zijn van `root` met mode `755`, terwijl de app als uid `1001`
>    draait — uploads mislukken dan met "permission denied". Wijs de media-mount
>    naar een eigen map en zet de eigenaar goed:
>    ```bash
>    mkdir -p /DATA/AppData/gigglobe/media
>    chown -R 1001:1001 /DATA/AppData/gigglobe/media
>    ```
>
> Na het aanpassen herstart je de stack met
> `docker compose -f /var/lib/casaos/apps/<app-id>/docker-compose.yml up -d`.
> Wil je deze herschrijving helemaal omzeilen, deploy dan vanaf de terminal met
> `docker compose -f deploy/docker-compose.zimaos.yml up -d` in plaats van via de
> GUI-import.

## Instellingen

Genereer de geheimen op een willekeurige machine:

```bash
openssl rand -base64 32   # AUTH_SECRET
openssl rand -base64 24   # database-wachtwoord
```

| Waarde | Wat | Voorbeeld |
| --- | --- | --- |
| `x-pgpass` (anchor) | Database-wachtwoord. Sta op één plek; beide services gebruiken het. | `k3split...` |
| `AUTH_SECRET` | Ondertekent de sessie-cookie. Vul de **uitkomst** van het commando hierboven in, niet het commando zelf. | `9Qk2vB7pLxN4tR1sJcW0aYzE6hMuG3dF8oI5nT+bKqA=` |
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
- **App blijft op status `Created` staan, `port is already allocated`** → de
  GUI-import heeft de poort-mapping ook op `db` gezet, waardoor die host-poort
  `3000` inpikt. Verwijder het `ports`-blok bij `db`. Zie
  [de waarschuwing bij Installeren via de GUI](#installeren-via-de-gui).
- **App kan de database niet vinden (`db` resolvet niet)** → de GUI-import heeft
  `network_mode: bridge` toegevoegd; op die legacy bridge werkt DNS op
  containernaam niet. Haal `network_mode` bij beide services weg.
- **Uploads mislukken direct met een foutmelding** → de gemounte `MEDIA_DIR` is
  niet schrijfbaar voor uid `1001`. Controleer het met
  `docker exec <app-container> touch /media/.test` en corrigeer de eigenaar met
  `chown -R 1001:1001 <host-map>`. Let op: deze fout verschijnt niet in de
  app-logs.
- **Kan niet inloggen vanaf een ander apparaat / redirect-loop** → `AUTH_URL` moet
  exact het adres zijn dat je in de browser typt. Aanpassen en de app herstarten.
- **Login-account werkt niet** → controleer of `ADMIN_EMAIL`/`ADMIN_PASSWORD`
  gezet waren bij de allereerste start (de bootstrap draait alleen bij een lege
  database). Is de database al aangemaakt zonder account? Verwijder het
  `db_data`-volume en start opnieuw, of maak het account via `npm run seed` op een
  machine met de broncode.
