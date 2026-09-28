# Odmoria

Digitalni vodiči za goste kratkoročnih najma. Javna stranica za marketing,
privatni link za potvrđene goste. Bez provizije po rezervaciji.

- **Produkcija:** https://guestflow-gamma.vercel.app (domena `odmoria.com` još nije spojena)
- **Detaljan opis projekta i pravila rada:** [`CLAUDE.md`](CLAUDE.md)
- **Što je gotovo, a što nije:** [`docs/napredak.md`](docs/napredak.md)
- **Odluke koje čekaju vlasnika:** [`docs/odluke.md`](docs/odluke.md)

## Struktura

```
*.html            stranice (vanilla HTML/CSS/JS, bez build koraka)
odmoria.css       dizajnerski sustav v2 (Figma „Odmoria / Product Design / v2”)
auth.css          prijava, registracija, nova lozinka, potvrda e-maila
forms.css         postavljanje, dodavanje objekta, račun
tekst.css         pomoć, uvjeti, privatnost
teme.css/teme.js  teme javne stranice (panel „Izgled”; javna stranica ih zasad ne prikazuje)
plans.js          planovi i limiti — izvor istine je tablica `plans` u bazi
links.js          gradnja linkova iz location.origin (nikad zakucana domena)
billing.js        Stripe pomoćnik — još nigdje nije uključen
api/              keepalive (dnevni cron), sync-ical, test-calendar
sql/              migracije i RLS pravila
assets/landing/   fotografija vile za naslovnicu i prijavu
```

## Tehnologija

- **Frontend:** HTML/CSS/JavaScript bez frameworka i bez build koraka
- **Baza i prijava:** [Supabase](https://supabase.com) (PostgreSQL, RLS, Auth)
- **Fotografije:** Cloudinary (unsigned upload)
- **Hosting:** [Vercel](https://vercel.com) (Hobby), deploy iz grane `main`
- **Plaćanje:** Stripe još nije spojen

## Razvoj

Svaka promjena ide na zasebnu granu i provjerava se na Vercel Previewu prije
spajanja u `main`. Lokalno je dovoljan bilo koji statički poslužitelj:

```
python3 -m http.server 8099
```
