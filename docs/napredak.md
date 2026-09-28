# Odmoria redizajn — što je gotovo, a što nije

Stanje 28. 9. 2026. Otvorene odluke su zasebno u [`odluke.md`](odluke.md); ovdje
je samo pregled posla. Ništa od ovoga nije u produkciji — sve je na grani
`claude/funny-archimedes-c0qosu` i čeka pregled na Vercel Previewu.

## Gotovo (prošli smo)

### Figma — `BVdEgki8jV7z6Oa3K6Te2h`

| Faza | Što | Stanje |
| --- | --- | --- |
| A | Temelji (boje, tipografija, razmaci, 47 ikona), komponente, naslovnica, javna stranica, galerija, dostupnost i upit, prototip | **prihvaćeno** |
| B | Aplikacija domaćina (13 ekrana × desktop/mobile), privatni vodič za gosta, stanja linka, prototip B1–B3 | gotovo, **nije pregledano** |
| C | Prijava i registracija, postavljanje objekta, račun i pretplata, admin, 404, prototip C1–C4 | gotovo, **nije pregledano** |

### Kod

| Stranica | Commit | Što je napravljeno | Provjereno |
| --- | --- | --- | --- |
| `odmoria.css` | `059026a` | Zajednički dizajn sustav iz Figme (tokeni, gumbi, oznake, harmonika, fokus) | — |
| Naslovnica `index.html` | `059026a` | Nova naslovnica prema fazi A; planovi i dalje iz tablice `plans` | 6 širina, kontrast AA, izbornik, tabovi, planovi iz baze i rezerva |
| Javna stranica `p.html` | `f74eb84` | Novi izgled prema fazi A; sva logika ista (kalendar, razmaci, poruke, karta, galerija, statistika) | 6 širina, puni i prazan objekt, nepostojeći link, cijeli tijek upita, galerija 1–6 fotografija |
| Dashboard `dashboard.html` | (commit „Dashboard prema Figmi”) | Novi izgled prema fazi B i navigacija po grupama (Pregled · Objekt · Boravci · Linkovi i QR + Pretplata), donja traka na mobitelu. Logika panela netaknuta | svih 17 panela na 4 širine, pamćenje podtaba, traka za spremanje, donja traka |

Popratno:

- `docs/odluke.md` — sve odluke koje čekaju vlasnika.
- `CLAUDE.md` — opis redizajna v2 i zamki koje su se pojavile.
- Pregled rada (Claude Docs):
  https://claude.ai/code/artifact/d6e495bc-88c2-4647-9e16-5fd130bff06a

## Nije gotovo (nismo prošli)

### Čeka tvoj pregled

- [ ] Naslovnica na Previewu — desktop i mobitel, s pravim fontovima.
- [ ] Javna stranica na Previewu — otvoriti pravi objekt (`/p/<slug>`) i proći:
  galerija, kalendar (odabir, poništi), poruka WhatsAppom/e-mailom, karta.
- [ ] Dashboard na Previewu — prijaviti se i proći sve dijelove: Objekt
  (spremanje, fotografije), Boravci (nova rezervacija, kalendar, iCal),
  Linkovi i QR, Pretplata; na mobitelu donju traku.
- [ ] Figma faza B — prototipi B1 Host Desktop, B2 Host Mobile, B3 Guest Mobile.
- [ ] Figma faza C — prototipi C1 Auth Mobile, C3 Račun, C4 Admin.
- [ ] `odluke.md` — proći i upisati odluke (najvažnije: planovi i cijene, teme).

### Prijenos u kod — sljedeći koraci

1. [x] Aplikacija domaćina (`dashboard.html`) — izgled i navigacija prenesen;
   otvoreno: spajanje podtabova Objekta u 5, Analitika, „Nadolazeći dolasci”
   i „Brze radnje” u Pregledu (vidi `odluke.md`, točka 4).
2. [ ] Privatni vodič (`h.html`) — vremensko zaključavanje Wi-Fi/koda mora ostati
   točno kakvo jest.
3. [ ] Prijava, registracija, postavljanje, račun (`login`, `register`,
   `reset-password`, `email-confirm`, `onboarding`, `add-property`, `account`).
4. [ ] Admin (`admin.html`) i 404.
5. [ ] Pomoć, Uvjeti, Privatnost — nema dizajna (zajednički predložak tekstualne
   stranice nije rađen).
6. [ ] Kad zadnja stranica prijeđe: obrisati `atmosphere.css`, `teme.*`,
   `motion.js`, `ui.css` i mapu `preview/` (ako se tako odluči).

### Odgođeno

- [ ] Fotografije u Figmi (4 datoteke na `seed:*` pravokutnike) — ti ih povlačiš
  ručno, jer ovo okruženje ne može slati slike u Figmu.
- [ ] Licenca za `living.jpg`, `bedroom.jpg`, `kitchen.jpg`.
- [ ] Spajanje u `main` — tek na tvoju izričitu potvrdu. Grana nosi i pet
  starijih commitova (admin v3, tabovi u dashboardu, stara naslovnica s
  konfiguratorom); vidi točku 7 u `odluke.md`.
