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
| Postavljanje, dodavanje objekta, račun (`onboarding`, `add-property`, `account`) + `forms.css` | `7725bdd` | Koraci s brojevima i trakom napretka, zid limita s planovima iz baze, račun u dva taba (profil i sigurnost · pretplata i limiti, istekli plan), brisanje prema Figmi. Isti Supabase pozivi | 3 širine; svih 5 koraka s provjerom upisa u bazu; dodavanje (ima mjesta / zid limita); račun (profil, lozinka, brisanje, prekidač, #pretplata) |
| Admin `admin.html` i `404.html` | `4619ca8` | Tamna bočna traka s oznakom ADMIN i vlasničkim pristupom, brojke, grafikon rasta i raspodjela u petrol rampi, tablice u v2; admin više ne učitava `atmosphere.css` ni `ui.css`. 404 prema Figmi | 4 širine × 4 taba, pretraga, istek, korisnik koji nije vlasnik, 404 na 2 širine |

### Kod

| Stranica | Commit | Što je napravljeno | Provjereno |
| --- | --- | --- | --- |
| `odmoria.css` | `059026a` | Zajednički dizajn sustav iz Figme (tokeni, gumbi, oznake, harmonika, fokus) | — |
| Naslovnica `index.html` | `059026a` | Nova naslovnica prema fazi A; planovi i dalje iz tablice `plans` | 6 širina, kontrast AA, izbornik, tabovi, planovi iz baze i rezerva |
| Javna stranica `p.html` | `f74eb84` | Novi izgled prema fazi A; sva logika ista (kalendar, razmaci, poruke, karta, galerija, statistika) | 6 širina, puni i prazan objekt, nepostojeći link, cijeli tijek upita, galerija 1–6 fotografija |
| Dashboard `dashboard.html` | `62f3305` | Novi izgled prema fazi B i navigacija po grupama (Pregled · Objekt · Boravci · Linkovi i QR + Pretplata), donja traka na mobitelu. Logika panela netaknuta | svih 17 panela na 4 širine, pamćenje podtaba, traka za spremanje, donja traka |
| Vodič za gosta `h.html` | `a93d16b` | Početna s pristupom i pločicama, podstranice Dolazak · Wi-Fi i kuća · Preporuke · Domaćin, četiri stanja linka. Logika provjere linka i zaključavanja netaknuta | zaključano / otključano / samo se otključa (ubrzani sat), šifre ne ulaze u HTML ni `__VALS` prije otključavanja, 5 stanja linka, 3 širine |
| Analitika domaćina i admin (`analitika.js`, `analitika.css`, `dashboard`, `admin`, mjerenje u `p.html`/`h.html`) | *(ovaj commit)* | Pregled s upozorenjima i sljedećih 14 dana; panel Analitika (posjećenost, upiti, vodič, popunjenost, izvori noćenja, praznine, čišćenje, usporedba, CSV). Admin: Pregled, Domaćini sa zdravljem i detaljima, Objekti, Korištenje, Prihod s kandidatima i rizikom, Poruke e-mailom, Sustav. Novo mjerenje upita i dijelova vodiča; domaćinovi pregledi se ne broje | dashboard 4 širine × 3 raspona, pun i prazan račun; admin 4 širine × 7 tabova, promjena plana i produljenje upisani, segmenti, stranice, CSV, tuđi račun odbijen; mjerenje upita i vodiča, `?domacin=1`; stari testovi javne stranice, vodiča i dashboarda |
| Čišćenje | `f4a50c0` | Obrisan stari v3 sustav i `preview/`; teme ostaju s napomenom „Uskoro” u panelu Izgled. Pretplata u dashboardu više nema zakucane cijene ni lažne mogućnosti (White-label, API, timski pristup, „Preusmjeravanje na Stripe”) — kartice iz `plans`, nadogradnja e-mailom | svih 17 panela dashboarda na 4 širine, Pretplata (baza i rezerva), Izgled, nijedna stranica ne traži obrisanu datoteku |
| Pomoć, Uvjeti, Privatnost (`help`, `terms`, `privacy`) + `tekst.css` | `e8efa90` | Zajednički predložak bez Figme. Pomoć: pretraga bez dijakritike, kategorije, harmonika, planovi iz baze bez zakucanih dodataka, netočne tvrdnje maknute. Pravni tekst doslovno, neslaganja popisana | 3 širine × 3 stranice, pretraga (pogodak, bez dijakritike, bez rezultata), planovi iz baze i rezerva |
| Prijava i registracija (`login`, `register`, `reset-password`, `email-confirm`) + `auth.css` | `936d294` | Podijeljen ekran s fotografijom, prikaz lozinke, prevedene greške, zasloni „Provjerite e-mail”, „E-mail je potvrđen”, „Link nije valjan”. Isti Supabase pozivi | 3 širine × 4 stranice, kriva i dobra lozinka, link za prijavu, registracija (postoji / uspjeh), nova lozinka (razlikuju se / spremljeno / bez sesije), potvrda e-maila (uspjeh / istek) |

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
- [ ] Admin na Previewu — prijaviti se vlasničkim računom i proći sva četiri taba (Domaćini, Prihod, Poruke, Postavke); drugim računom provjeriti „Nemate pristup”.
- [ ] Postavljanje na Previewu — novi račun prolazi svih 5 koraka; dodavanje objekta; Račun → Pretplata i limiti.
- [ ] Prijava na Previewu — prava prijava, Google, link za prijavu i registracija novog računa (potvrda e-maila).
- [ ] Vodič na Previewu — otvoriti pravi gostinski link (`/h/<token>`) prije i
  poslije otključavanja; proći sve pločice i gumb natrag.
- [ ] Pomoć, Uvjeti, Privatnost na Previewu — i **pravni tekst** prema
  `odluke.md`, točka 8 (Stripe, cijene, treće strane, kontakt).
- [ ] **Analitika i admin na Previewu** — Pregled i Analitika u dashboardu s pravim podacima; admin svih 7 tabova, detalji domaćina (pažljivo: „Spremi pretplatu” stvarno mijenja bazu).
- [ ] **Sigurnost tablice `sections`** — `odluke.md`, točka 0. Najvažnije prije
  lansiranja.
- [ ] Figma faza B — prototipi B1 Host Desktop, B2 Host Mobile, B3 Guest Mobile.
- [ ] Figma faza C — prototipi C1 Auth Mobile, C3 Račun, C4 Admin.
- [ ] `odluke.md` — proći i upisati odluke (najvažnije: planovi i cijene, teme).

### Prijenos u kod — sljedeći koraci

1. [x] Aplikacija domaćina (`dashboard.html`) — izgled i navigacija prenesen;
   otvoreno: spajanje podtabova Objekta u 5, Analitika, „Nadolazeći dolasci”
   i „Brze radnje” u Pregledu (vidi `odluke.md`, točka 4).
2. [x] Privatni vodič (`h.html`) — izgled prema fazi B, podstranice preko
   adrese; vremensko zaključavanje nepromijenjeno i provjereno. Otvoreno:
   sigurnost tablice `sections` (vidi `odluke.md`, točka 0).
3. [x] Prijava, registracija, nova lozinka, potvrda e-maila — novi izgled,
   isti Supabase pozivi. Otvoreno: tijek „zaboravljena lozinka” (`odluke.md`, točka 5).
4. [x] Postavljanje i račun (`onboarding`, `add-property`, `account`) — novi izgled,
   ista logika. Otvoreno: dvije postojeće greške u postavljanju i kontakt za
   nadogradnju/brisanje (`odluke.md`, točka 5).
5. [x] Admin (`admin.html`) i 404 — novi izgled; logika admina (stvarni podaci,
   RLS, CSV, promjena plana) netaknuta. Otvoreno: Poruke, „Javi se”, stupci (`odluke.md`, točka 5).
6. [x] Pomoć, Uvjeti, Privatnost — bez Figme, na zajedničkom predlošku
   `tekst.css`. Pravni tekst doslovno prenesen; Pomoć očišćena od netočnih
   tvrdnji. Otvoreno: pravni tekst ne odgovara aplikaciji na više mjesta
   (`odluke.md`, točka 8).
7. [x] Čišćenje — obrisani `atmosphere.css`, `motion.js`, `ui.css`, mapa
   `preview/`, neiskorištena slika i `/preview` rute; README napisan ispočetka.
   Zadnje stanje **s** tim datotekama je commit `70d0552` (za vraćanje:
   `git show 70d0552:preview/public.html`). Teme ostaju — `odluke.md`, točka 9.
9. [x] Analitika domaćina i prošireni admin — `odluke.md`, točka 11 (odluke: analitika po planu, pragovi, zdravlje računa, e-mail računa).
8. [ ] **Teme za plaćene planove** — podsjetnik, nije hitno (`odluke.md`, točka 9).

### Odgođeno

- [ ] Fotografije u Figmi (4 datoteke na `seed:*` pravokutnike) — ti ih povlačiš
  ručno, jer ovo okruženje ne može slati slike u Figmu.
- [ ] Licenca za `living.jpg`, `bedroom.jpg`, `kitchen.jpg`.
- [ ] Spajanje u `main` — tek na tvoju izričitu potvrdu. Grana nosi i pet
  starijih commitova (admin v3, tabovi u dashboardu, stara naslovnica s
  konfiguratorom); vidi točku 7 u `odluke.md`.
