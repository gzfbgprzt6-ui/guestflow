# Odmoria redizajn — što je gotovo, a što nije

Stanje 29. 9. 2026. Otvorene odluke su zasebno u [`odluke.md`](odluke.md); ovdje
je samo pregled posla. **Sve niže je spojeno u `main` i u produkciji**
(28. 9. 2026., commit `7bca527`, na izričitu potvrdu vlasnika). Drugo spajanje 29. 9. 2026. (na izričitu potvrdu): Stripe (točka 16), paket značajki (točka 17), jezici, e-mail o upitu i panel Prijevodi (točka 18) — SQL i ključeve iz tih točaka treba postaviti da prorade. SQL datoteke
iz tablice treba pokrenuti u Supabaseu — dok se ne pokrenu, stranice rade na
starom putu (vidi „Čeka tvoj pregled”).

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
| Prijedlog mjesta (OpenStreetMap) i automatski e-mail gostu (`mjesta-osm.js`, `sql/add-guest-emails.sql`, dashboard — vidi `odluke.md`, točka 27) | — | Domaćin jednim klikom dobije plaže, restorane, trgovine i ljekarnu u blizini; gost s upisanim e-mailom sam dobije link 3 dana prije dolaska i zahvalu s molbom za ocjenu | OSM logika (13 provjera) i dijalog u pregledniku s lažnim OSM-om; SQL na lokalnom Postgresu (zaštita KORAK 2, jednom po poruci, jezik, escape, isključivanje, brisanje nakon 30 dana); dashboard s i bez stupaca, 390/1280; engleski |
| Izvoz kalendara, suradnici, preuzimanje sadržaja, engleski za domaćina (`api/kalendar.js`, `sql/add-ical-export.sql`, `sql/add-team-access.sql`, `domacin-jezik.js`, `domacin-en.js`, dashboard, prijava — vidi `odluke.md`, točke 21–26) | `0196163` `f88367f` `e1de160` | Booking/Airbnb dobivaju naše zauzete dane (link po portalu); suvlasnik/agencija uređuje objekt svojim računom (pozivnica); sadržaj se preuzima iz drugog objekta bez šifri; dashboard, prijava, postavljanje i račun na engleskom (prekidač HR · EN) | SQL na lokalnom Postgresu (RLS: tuđi objekt, preuzimanje, brisanje, pozivanje, anonimni); ruta s lažnom bazom (15 provjera); preglednik 390/1280 za sve tri značajke; engleski: svi paneli i stranice, ostao samo sadržaj domaćina; stari testovi na hrvatskom |
| `odmoria.css` | `059026a` | Zajednički dizajn sustav iz Figme (tokeni, gumbi, oznake, harmonika, fokus) | — |
| Naslovnica `index.html` | `059026a` | Nova naslovnica prema fazi A; planovi i dalje iz tablice `plans` | 6 širina, kontrast AA, izbornik, tabovi, planovi iz baze i rezerva |
| Javna stranica `p.html` | `f74eb84` | Novi izgled prema fazi A; sva logika ista (kalendar, razmaci, poruke, karta, galerija, statistika) | 6 širina, puni i prazan objekt, nepostojeći link, cijeli tijek upita, galerija 1–6 fotografija |
| Dashboard `dashboard.html` | `62f3305` | Novi izgled prema fazi B i navigacija po grupama (Pregled · Objekt · Boravci · Linkovi i QR + Pretplata), donja traka na mobitelu. Logika panela netaknuta | svih 17 panela na 4 širine, pamćenje podtaba, traka za spremanje, donja traka |
| Vodič za gosta `h.html` | `a93d16b` | Početna s pristupom i pločicama, podstranice Dolazak · Wi-Fi i kuća · Preporuke · Domaćin, četiri stanja linka. Logika provjere linka i zaključavanja netaknuta | zaključano / otključano / samo se otključa (ubrzani sat), šifre ne ulaze u HTML ni `__VALS` prije otključavanja, 5 stanja linka, 3 širine |
| Dorada objava i animacije (`objave.js`, `pokret.js`, `odmoria.css`, `p.html`, `h.html`, `sw.js`, dashboard) | `1bbe738` | Tri izgleda slike (Fotografija, Razglednica, Luk), naljepnica-sunce s cijenom, pismo Fraunces; pokretna objava iz videa (MP4/GIF) — napravljena pa maknuta na zahtjev vlasnika; male animacije: iskrice (upit, ocjena, prijava, otključavanje), kvačica pri kopiranju, opruga za poruke, odabrani dan, kartice, zaglavlje naslovnice, paneli dashboarda — sve isključeno uz „smanji pokrete” | 24 slike s pravim pismima (3 izgleda × 2 formata × 2 vrste × 2 jezika); preglednik: video učitan, pregled se vrti, GIF (zaglavlje GIF89a) i MP4 napravljeni, uklanjanje; kvačica i povratak natpisa; iskrice s pokretom i bez njega; stari testovi vodiča, upita, recenzija, naslovnice, dashboarda, čistačice |
| Objave za promociju (`objave.js`, `dashboard.html` → Linkovi i QR → Objave, Pregled — vidi `odluke.md`, točka 19) | `5bc55ac` | Gotova slika (objava 4:5 / story 9:16) iz fotografije s QR kodom i adresom, slobodni termini iz kalendara, četiri teksta (Instagram, Facebook grupe, WhatsApp, oglasnik) na 6 jezika, preuzimanje i dijeljenje, letak A4 s četiri kartice; „Napravi objavu” u Pregledu. Jezici po planu | tekstovi u Nodeu (6 jezika, datumi, množina, sadržaji); preglednik 1280/390 (Pregled → Objave, termini, jezik, format, fotografija, vlastiti datumi, opća objava, kopiranje, preuzimanje, letak i ispis, Free, bez kalendara i fotografija, bez prelijevanja); stari testovi dashboarda |
| Panel Prijevodi (`dashboard.html` → Objekt → Prijevodi, `api/prevedi.js` način za domaćina, `prijevodi_rucni`) | `9714656` | Domaćin po jeziku vidi sve svoje tekstove s prijevodom, pokrene prijevod onoga što fali, ispravi i spremi; ispravak ima prednost i vrijedi samo za njegov objekt; „Vrati automatski”; jezici izvan plana zaključani | ruta jedinično (17 novih provjera: tuđi objekt i token odbijeni, tekstovi samo tog objekta, ispravak ne prelazi na tuđi objekt, plan, bez tablica); preglednik 1280/390 (spremanje, traka, pitanje pri promjeni jezika, Free, 503) |
| Jezici za goste i e-mail o upitu (`jezici.js`, `api/prevedi.js`, `sql/add-translations.sql`, `sql/add-inquiry-email.sql`, `h.html`, `p.html`, `sw.js` — vidi `odluke.md`, točka 18) | `a26f18c` | Vodič i javna stranica na 6 jezika (HR, EN, DE, IT, PL, CS): sučelje iz rječnika, jezik po pregledniku ili biraču, tekstovi domaćina automatski prevedeni (Claude) i spremljeni u bazu, broj jezika po planu (Free: HR + EN). Poruka domaćinu na jeziku koji razumije. E-mail domaćinu za svaki novi upit (baza → Resend), s gumbom „Otvori upit” i odgovorom ravno gostu | preglednik: vodič (primjer) i javna stranica na DE/PL/IT/EN/HR, 1440/390/360, bez prelijevanja, plan HR+EN, prijevod koji kasni, ruta nedostupna, birač i pamćenje izbora, poruke; ruta jedinično (22 provjere: šifre nikad ne idu na prijevod, predmemorija, plan, istekli link, kriv odgovor AI-ja); e-mail okidač na Postgresu (bez ključa, isključene obavijesti, escape, pad slanja); svi stari testovi s hrvatskim preglednikom |
| Paket za domaćina i gosta (vodič, javna stranica, dashboard, iCal, račun, admin — vidi `odluke.md`, točka 17) | `7c02498` `14d8bdb` `f53f302` `6356983` `e343b14` `ab36804` | Primjer vodiča, hitni brojevi, odlazak s ocjenom, prijava za eVisitor, rad bez interneta; SEO i pregled linka, recenzije, oznaka po planu; 5 podtabova Objekta, kalendar s izvorom, čistačica, recenzije, pristojba, analitika po planu; automatska iCal sinkronizacija; zaboravljena lozinka, brisanje računa; admin zapisnik i stvaranje pretplate | SQL na Postgresu (sve nove funkcije: tko smije, rubni slučajevi, idempotentnost); vodič (primjer bez baze, šifre ne ulaze u predmemoriju prije otključavanja, pravi service worker bez mreže); javna stranica i sitemap jedinično; dashboard (spajanje panela i traka, kalendar, čistačica, gosti, recenzije, analitika Free/Pro, 390 px); sinkronizacija jedinično; prijava, postavljanje, račun, admin; svi stari testovi |
| Plaćanje karticom — Stripe u testnom načinu (`api/create-checkout-session.js`, `api/create-portal-session.js`, `api/stripe-webhook.js`, `api/billing-status.js`, `api/_stripe.js`, `billing.js`, `sql/add-stripe-to-subscriptions.sql`, dashboard, Račun) | `84d17e9` | Odabir plana mjesečno/godišnje → Stripe Checkout (iznos i popust iz baze, popust kao kupon), portal za karticu i otkaz, webhook jedini upisuje plan (stanje uvijek dohvaća od Stripea), povratak s plaćanja čeka novi plan. Bez Stripe ključa sve ostaje kao prije (e-mail). Usput popravljeno: „Plaćeni plan je istekao” se prikazivao svakom domaćinu u Računu | 27 jediničnih provjera ruta (lažni Stripe i Supabase: iznos, kupon, 409, tuđi kupac, izmišljen i zakašnjeli događaj, otkaz, neuspjelo plaćanje); preglednik: dashboard i Račun (bez Stripea, testni, s pretplatom, greška, 409, povratak, 390 px); SQL na Postgresu; svi stari testovi |
| Popusti na pretplate (`sql/add-plan-promotions.sql`, `plans.js`, `admin.html`, stranice s cijenama) | `88a80ab` | Admin → Popusti: postotak ili nova cijena, plan, razdoblje, od–do (sama istekne), trajanje nakon kupnje, za sve ili jednog domaćina (i iz detalja domaćina). Cijena s popustom prikazana na naslovnici, Pomoći, Računu, dodavanju objekta i Pretplati. Iznos za buduću naplatu zaključan u funkciji `cijena_plana` u bazi | SQL na Postgresu (tko što vidi, osobni popust samo svoj, tuđa funkcija i upis odbijeni, provjere oblika, idempotentnost); spremanje, zaustavljanje, brisanje, osobni popust, prikaz na 5 stranica, bez tablice; svi stari testovi |
| Upiti gostiju, rezervacije, spremanje, animacije (`sql/add-inquiries.sql`, `p.html`, `dashboard.html`, `h.html`, `odmoria.css`, `analitika.*`) | `b90f37e` | Obrazac upita na javnoj stranici; Boravci → Upiti s „Prihvati i napravi link” (rezervacija + zauzeti dani + slanje gostu WhatsAppom/e-mailom); obavezno ime i prezime, kontakt gosta za slanje, istek linka; popravljen WhatsApp na domaćinov broj; pitanje pri odlasku s nespremljenim promjenama; suptilne animacije | SQL na Postgresu (prava, provjere, limit 20/sat); cijeli tijek upit → prihvaćanje → slanje; traka za spremanje (Ostani / Ne spremaj / Spremi, vlastiti gumb); otkrivanje pri listanju i reduced-motion; svi stari testovi |
| Sigurnost šifri i države (`sql/sections-security.sql`, `h.html`, `api/track.js`, `sql/add-country-to-page-views.sql`, analitika) | `9a3c464` | Vodič dobiva šifre samo od funkcije u bazi, i to samo u prozoru; SQL koraci zatvaraju `sections` i `bookings` za anonimne. Države posjetitelja kroz `/api/track` (bez IP-a) i kartica „Države posjetitelja” u dashboardu i adminu | SQL na lokalnom Postgresu 16 (prije/poslije, vlasnik, tuđi korisnik, admin, rubni slučajevi, idempotentnost); vodič: prije prozora nema šifri, otključavanje ubrzanim satom, stari put; `/api/track` jedinično; države sa stupcem i bez njega |
| Analitika domaćina i admin (`analitika.js`, `analitika.css`, `dashboard`, `admin`, mjerenje u `p.html`/`h.html`) | `9edbd14` | Pregled s upozorenjima i sljedećih 14 dana; panel Analitika (posjećenost, upiti, vodič, popunjenost, izvori noćenja, praznine, čišćenje, usporedba, CSV). Admin: Pregled, Domaćini sa zdravljem i detaljima, Objekti, Korištenje, Prihod s kandidatima i rizikom, Poruke e-mailom, Sustav. Novo mjerenje upita i dijelova vodiča; domaćinovi pregledi se ne broje | dashboard 4 širine × 3 raspona, pun i prazan račun; admin 4 širine × 7 tabova, promjena plana i produljenje upisani, segmenti, stranice, CSV, tuđi račun odbijen; mjerenje upita i vodiča, `?domacin=1`; stari testovi javne stranice, vodiča i dashboarda |
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
- [ ] **Sigurnost šifri** — kod je gotov; **vi pokrećete SQL korake** redom (`odluke.md`, točka 0): KORAK 0 → KORAK 1 → (spajanje u `main` ✔ gotovo) → KORAK 2 → KORAK 4.
- [ ] **Upiti gostiju** — pokrenuti `sql/add-inquiries.sql` (`odluke.md`, točka 13).
- [ ] **Popusti** — pokrenuti `sql/add-plan-promotions.sql` pa u adminu proći tab Popusti (`odluke.md`, točka 14). Naplate još nema dok se ne spoji Stripe.
- [ ] **Paket značajki (točka 17)** — pokrenuti 6 SQL datoteka redom, dodati `reset-password.html` u Supabase Redirect URLs, `CRON_SECRET` u Vercel; proći na Previewu.
- [ ] **Ključ za automatski prijevod** — odgođeno (vlasnik: da se ne plaća prije početka); kad krene, samo `ANTHROPIC_API_KEY` u Vercel + Redeploy (`odluke.md`, točka 18).
- [ ] **E-mail o upitu** — odgođeno (vlasnik); kad krene: Resend ključ + `sql/add-inquiry-email.sql` (`odluke.md`, točka 18). Ostali SQL, ključ baze, CRON_SECRET i automatska sinkronizacija postavljeni 29. 9. 2026.
- [ ] **Jezici i e-mail o upitu (točka 18)** — pokrenuti `sql/add-translations.sql`, u Vercel dodati `ANTHROPIC_API_KEY`; za e-mail račun na Resendu, potvrđena domena, pa `sql/add-inquiry-email.sql` s upisanim ključem. Proći vodič i javnu stranicu na njemačkom na Previewu.
- [ ] **Podsjetnik (točka 17):** pravni tekst i Pomoć · pozadina i platforma · plaćanje.
- [ ] **Stripe (testni način)** — postaviti ključeve i webhook prema `odluke.md`, točka 16, i isprobati karticom 4242…
- [ ] **Preporuke** — proći popis u `odluke.md`, točka 15, i reći što želite.
- [ ] **Države** — pokrenuti `sql/add-country-to-page-views.sql` (`odluke.md`, točka 11a).
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
- [x] Spajanje u `main` — 28. 9. 2026. (`7bca527`). Na `main` je bio stariji
  squash iste grane bez ičega novog, pa je zadržan sadržaj grane.
- [x] Prijedlozi adrese dok se tipka + „Koristi moju trenutnu lokaciju”
  (Lokacija, Točna adresa, Gdje tražiti; besplatno, Photon/OSM) — 3. 10. 2026.
- [x] **Stilovi javne stranice** (8 + zadani): birač u Objekt → Osnovno →
  Izgled, prava stranica u malom prozoru, stil od prvog prikaza (poslužitelj) —
  3. 10. 2026. Treba pokrenuti `sql/add-styles.sql`.
- [x] **Pregled gosta desno** prepravljen: telefon prati pravu javnu stranicu u
  odabranom stilu i pravi vodič (v2), Lucide ikone, prekidač s kliznim
  pokazivačem — 3. 10. 2026.
- [x] Lokacija s ulicom i brojem (broj prelazi u prijedlog) i karta s
  pribadačom na javnoj stranici i u vodiču — 3. 10. 2026.
- [x] Treće spajanje u `main` — 3. 10. 2026. (PR #2, `8c1b077`): stilovi,
  pregled gosta, objave, izvoz kalendara, suradnici, engleski, mjesta, e-mail
  gostu. SQL koraci: `docs/odluke.md`, točka 27.
- [x] Mobitel: plutajuća donja traka i ikone u stilu „Iconly” (i u bočnoj
  traci), podtabovi kao kapsule bez okomitog pomicanja, prijedlozi adrese
  ispod polja — 4. 10. 2026.
- [x] Pregled u stilu „nekretnine” (zaglavlje s fotografijom i trakom
  zauzetosti, brojke s malim stupcima, kartice objekata, karta); popravljen
  prazan „Kako gost vidi” (X-Frame-Options → SAMEORIGIN) — 4. 10. 2026.
- [x] Izbornik objekta u bočnoj traci: gumb s fotografijom i prozorčić s
  karticama objekata umjesto sistemskog padajućeg izbornika — 4. 10. 2026.
