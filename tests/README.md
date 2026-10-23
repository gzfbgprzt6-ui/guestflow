# Testovi

Playwright (bez preuzimanja preglednika) s **lažnim Supabase klijentom** (`lib/sbfake.js`):
stranice se otvaraju s pravim HTML/JS-om, a baza je podmetnuta u pregledniku.
Ništa se ne šalje u pravu bazu.

```
cd tests
npm install          # samo prvi put (playwright-core, leaflet)
node run.mjs         # svi testovi
node run.mjs vodic   # samo datoteke čije ime sadrži „vodic”
```

- Poslužitelj (`lib/server.mjs`) pokreće se sam na slobodnom portu, iz korijena repozitorija.
- Preglednik: `CHROME=/put/do/chrome`, inače `/opt/pw-browsers/...`.
- Svaki test je `*.test.mjs` s `export default async function`; provjere idu kroz `ok(uvjet, opis)`.
- Mapa se ne objavljuje (`.vercelignore`).
