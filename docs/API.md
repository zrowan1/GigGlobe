# GigGlobe API (voor de iPhone-app)

De iPhone-app ([GigGlobe-iOS](https://github.com/zrowan1/GigGlobe-iOS)) praat met deze server via een JSON-API. De website gebruikt hem niet, maar kan het wel (de API accepteert ook de website-cookie).

## Inloggen: token in plaats van cookie

De app bereikt dezelfde server via twee adressen: het **interne** adres thuis (bijv. `http://192.168.1.50:3000`) en het **externe** domein onderweg (bijv. `https://gigglobe.jouwdomein.nl`). Een cookie hoort maar bij één adres. Daarom logt de app één keer in en krijgt hij een **token** terug. Dat token werkt op beide adressen, want het is dezelfde server met dezelfde `AUTH_SECRET`.

- Het token is 90 dagen geldig. Daarna geeft de API `401` en toont de app het inlogscherm opnieuw.
- Verander je `AUTH_SECRET`, dan zijn alle tokens (en websitesessies) direct ongeldig. Zo log je overal uit.
- Na 10 foute wachtwoorden voor hetzelfde e-mailadres volgt 15 minuten lang `429`.

Elke aanvraag (behalve `/api/health` en de login zelf) stuurt:

```
Authorization: Bearer <token>
```

Alle gegevens zijn per gebruiker afgeschermd. Een id van iemand anders geeft gewoon `404`.

## Endpoints

| Methode | Pad | Wat |
|---|---|---|
| GET | `/api/health` | `{ ok: true, app: "gigglobe" }`, zonder login. De app gebruikt dit om "thuis of buiten?" te bepalen |
| POST | `/api/mobile/login` | Body `{ email, password }` → `{ token, expiresAt, user: { id, email } }` |
| GET | `/api/v1/me` | `{ id }`, om te controleren of het token nog geldig is |
| GET | `/api/v1/gigs` | Alle optredens (nieuwste eerst), met `artist` en `venue` |
| POST | `/api/v1/gigs` | Nieuw optreden (body hieronder) → `201 { id }` |
| GET | `/api/v1/gigs/:id` | `{ gig, media, setlist }` |
| PUT | `/api/v1/gigs/:id` | Optreden bijwerken (zelfde body als POST) |
| DELETE | `/api/v1/gigs/:id` | Verwijdert het optreden, inclusief media-bestanden en setlist → `204` |
| GET | `/api/v1/setlists/search?artist=&date=JJJJ-MM-DD&city=` | Kandidaat-setlists van setlist.fm |
| PUT | `/api/v1/gigs/:id/setlist` | Body: één zoekresultaat → opgeslagen setlist |
| DELETE | `/api/v1/gigs/:id/setlist` | Setlist verwijderen → `204` |
| GET | `/api/v1/artists` | Alle artiesten (A–Z) |
| GET | `/api/v1/artists/:id` | `{ artist, gigs }` |
| GET | `/api/v1/venues` | Alle venues met `gig_count`, voor de kaartpins |
| GET | `/api/v1/venues/:id` | `{ venue, gigs }` |
| GET | `/api/v1/stats` | `{ summary, detailed }` |
| GET | `/api/v1/geocode?q=` | Plaatssuggesties (Nominatim). **Max 1 aanvraag per seconde**: wacht in de app tot er even niet getypt wordt |
| POST | `/api/media/upload?gigId=` | Body = ruwe bytes van één bestand, `Content-Type` = MIME-type (bijv. `image/jpeg`) → `201` media-rij |
| GET | `/api/media/:id` | Het originele bestand (ondersteunt `Range`, voor video) |
| GET | `/api/media/:id/thumb` | Thumbnail van een foto |
| DELETE | `/api/v1/media/:id` | Eén foto/video verwijderen → `204` |

### Body voor een optreden (POST/PUT)

Dit zijn dezelfde velden als het websiteformulier:

```json
{
  "artistName": "Kendrick Lamar",
  "gigDate": "2024-06-15",
  "venueName": "Ziggo Dome",
  "venueType": "venue",
  "latitude": 52.3124,
  "longitude": 4.9440,
  "city": "Amsterdam",
  "country": "Nederland",
  "notes": "Wat een show",
  "rating": 5
}
```

- Bestaande artiest of venue hergebruiken: stuur `artistId` en/of `venueId` mee. De coördinaten zijn dan niet nodig, `venueName` wel (dat is de naam van de locatie).
- Een artiestnaam die al bestaat (hoofdletters maken niet uit) wordt automatisch hergebruikt.
- `venueType` is `"venue"` of `"festival"`. `rating` is 1 t/m 5 of leeg.

### Foutmeldingen

Fouten komen terug als `{ "error": "<Nederlandse melding>" }` met een passende statuscode. De app kan die melding direct aan de gebruiker tonen.

## Zelf testen met curl

```bash
# 1. Leeft de server?
curl http://localhost:3000/api/health

# 2. Inloggen en het token bewaren
TOKEN=$(curl -s -X POST http://localhost:3000/api/mobile/login \
  -H 'content-type: application/json' \
  -d '{"email":"jij@voorbeeld.nl","password":"jouw-wachtwoord"}' \
  | sed -E 's/.*"token":"([^"]+)".*/\1/')

# 3. Je optredens opvragen
curl http://localhost:3000/api/v1/gigs -H "Authorization: Bearer $TOKEN"
```

## Reverse proxy

Er is niets extra's nodig. De API loopt over dezelfde poort en hetzelfde domein als de website. Zorg alleen dat je proxy de `Authorization`-header doorgeeft (dat doen Caddy, Traefik en de ZimaOS-proxy standaard).
