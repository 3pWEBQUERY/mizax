# Mizax

Escort-Verzeichnis im Look einer modernen KI-Chat-App: dunkler Navy-Verlauf, Chat-Bubbles,
Pill-Navigation – mit einem **5er-Grid aus Profilkarten**, die per animiertem Shared-Element-Übergang
nahtlos in das jeweilige Profil übergehen.

## Stack

- **Frontend:** React 18, Vite, React Router, framer-motion (Seitenübergänge & Shared Layout)
- **Backend:** Node/Express (liefert API, Medien und das gebaute Frontend aus – ein einziger Service)
- **Datenbank:** Railway Postgres (`DATABASE_URL`) – Tabellen werden beim Start automatisch angelegt
- **Medien:** Railway Bucket (S3-kompatibel). Uploads werden mit `sharp` zu WebP (groß + Vorschau)
  konvertiert und über `/media/...` mit Langzeit-Cache ausgeliefert (der Bucket bleibt privat).

## Funktionen

- Altersabfrage (18+) beim ersten Besuch
- 5-spaltiges Kartengrid (responsive: 4/3/2 Spalten), Stadtfilter, Live-Suche, Spracheingabe
- **Konten:** Registrierung (`/register`) mit Wahl zwischen **Mitglied** und **Escort**, Login (`/login`),
  Sitzung per signiertem HttpOnly-Cookie, Passwörter mit scrypt gehasht
- Gäste sehen nur die Karten; Beschreibung, Honorar und Kontaktdaten sind Mitgliedern vorbehalten
- **Escort-Konten** pflegen ihr eigenes Profil unter `/me` (Texte, Honorar, Kontakt, Fotos)
- Favoriten pro Konto (serverseitig, auf allen Geräten)
- **Standort (nur Schweiz, ohne Google):** Escorts wählen ihren Ort per PLZ/Name aus einem lokalen
  Verzeichnis aller Schweizer Orte (`server/data/ch-places.json`, Quelle: GeoNames, CC BY 4.0) oder per
  Button „Aktuellen Standort verwenden“. Gespeichert wird nur das Ortszentrum mit Kanton, nie der genaue
  Standort. Besucher filtern nach allen 26 Kantonen oder per „In meiner Nähe“ (Browser-Standort nur nach
  Klick, wird nicht an den Server gesendet) mit Umkreis 10–100 km und Sortierung nach Entfernung.
- **Dark/Light Mode** (folgt anfangs der Systemeinstellung, umschaltbar)
- **7 Sprachen:** Deutsch, Englisch, Französisch, Spanisch, Ungarisch, Polnisch, Rumänisch
  (`src/locales/*.js`, automatische Erkennung, Auswahl wird im Konto gespeichert)
- Verwaltung unter **`/admin`** für Konten mit Admin-Rechten (normaler Login über `/login`):
  alle Profile bearbeiten, verifizieren, hervorheben, Fotos verwalten, Mitglieder ansehen und
  weitere Konten zu Admins machen. Das erste Admin-Konto wird beim Start aus `ADMIN_EMAIL` und
  `ADMIN_PASSWORD` angelegt (existiert die E-Mail schon, bekommt dieses Konto Admin-Rechte).
- Beim ersten Start werden 15 Demo-Profile angelegt (abschaltbar mit `SEED_DEMO=false`)

## Umgebungsvariablen

| Variable | Beschreibung |
| --- | --- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `BUCKET`, `ACCESS_KEY_ID`, `SECRET_ACCESS_KEY`, `REGION`, `ENDPOINT` | Referenzen auf den Railway Bucket |
| `ADMIN_EMAIL` | E-Mail des ersten Admin-Kontos |
| `ADMIN_PASSWORD` | Passwort, mit dem dieses Konto beim ersten Start angelegt wird |
| `SESSION_SECRET` | Schlüssel für Login-Sitzungen und Admin-Tokens (unbedingt setzen) |
| `SEED_DEMO` | `false` = keine Demo-Profile |

## Lokal starten

```bash
npm install
cp .env.example .env   # Werte eintragen
npm run build && node --env-file=.env server/index.js
# oder Entwicklung mit Hot Reload:
npm run dev
```

## Deployment (Railway)

`railway.json` enthält Build (`npm run build`), Start (`npm start`) und Healthcheck (`/api/health`).
Im Projekt: Postgres-Service + Bucket anlegen, Variablen wie oben referenzieren, Domain generieren.
