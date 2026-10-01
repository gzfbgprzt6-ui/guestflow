# Odmoria redizajn — odluke koje čekaju vlasnika

Stanje 28. 9. 2026. (čišćenje gotovo — točke 7, 9, 10; sve stranice prenesene na v2: iz Figme naslovnica, javna stranica, dashboard, vodič, prijava i registracija, postavljanje, račun, admin i 404; bez Figme, na zajedničkom predlošku, Pomoć, Uvjeti i Privatnost — vidi točku 8). Ovdje su skupljena sva otvorena pitanja iz Figme (faze A, B i C)
i ona koja su se otvorila pri prijenosu naslovnice u kod. Dok odluka ne padne, kod
radi kako je opisano u stupcu **Sada u kodu**, uvijek na sigurnu stranu: ništa se
ne obećava što ne postoji, a ništa se ne upisuje u bazu.

- Figma: `BVdEgki8jV7z6Oa3K6Te2h` (stranica **00 Cover** ima iste popise)
- Pregled rada: https://claude.ai/code/artifact/d6e495bc-88c2-4647-9e16-5fd130bff06a

Oznaka `[ ]` znači da odluka još nije donesena. Kad padne, upiše se ispod stavke
i kvačica se zatvori.

---

## 0. Sigurnost — šifre vrata i Wi-Fi (rujan 2026.: kod gotov, čeka vaše SQL korake)

**Problem.** Vodič je red iz `sections` (šifra vrata, Wi-Fi lozinka) čitao
izravno iz preglednika, javnim ključem, **prije** provjere vremena. Ako RLS
dopušta anonimno čitanje `sections`, šifre svih objekata mogu se dohvatiti
API-jem bez linka i bez vremena. Isto za `bookings`: pravilo „aktivne
rezervacije su javne” daje popis svih tokena, a token otvara vodič.
Iz ovog okruženja baza se ne može doseći (mrežna pravila), pa stvarno stanje
pravila nije izmjereno — **KORAK 0 to mjeri za vas.**

**Rješenje** (`sql/sections-security.sql` + novi `h.html`):
- funkcija u bazi `vodic_gosta(token, slug)` provjerava link i vrijeme (sat
  prije prijave do 23:59 dana odlaska, **po zagrebačkom vremenu**) i tek tada
  vraća šifre. Prije prozora vraća samo „šifra postoji” — vrijednost ne izlazi
  iz baze, pa je nema ni u pregledniku;
- vodič koristi samo tu funkciju; u trenutku otključavanja sam je pita ponovno;
- `sections` i `bookings` smije čitati samo vlasnik (i admin za `bookings`);
  anonimna uloga u njima nema nikakva prava.

Provjereno na lokalnom PostgreSQL-u 16 s ulogama i `auth.uid()` kao u
Supabaseu, s najgorim pravilima („svi čitaju sections”, „aktivne rezervacije su
javne”): prije — anonimno se čitaju obje šifre i svi tokeni; poslije —
„permission denied”, funkcija radi, vlasnik vidi i mijenja samo svoje, tuđi
korisnik vidi 0, admin i dalje vidi sve rezervacije. U pregledniku: prije
prozora šifre nema ni u HTML-u ni u `__VALS`, vodič ne čita ni `sections` ni
`bookings`; ubrzanim satom se u 14:00 (prijava 15:00) sama pojavi.

**Što trebate napraviti — redom:**
- [ ] **KORAK 0** u Supabase SQL editoru (samo čita) — pogledati koliko šifri
  je danas dostupno anonimno. Ako prvi broj nije 0, ranjivost je stvarna.
- [ ] **KORAK 1** (funkcija) — može odmah, ništa ne zatvara.
- [ ] Spojiti ovu granu (novi `h.html`) u `main` i provjeriti pravi link gosta.
- [ ] **KORAK 2** (zatvaranje) — tek nakon objave. Prije toga stari vodič bez
  funkcije ne bi mogao prikazati šifre.
- [ ] **KORAK 4** — provjera (dva „permission denied”, funkcija vraća „invalid”).

**Otvoreno:**
- [ ] **Stari opći link** (`slug` + `properties.guest_token`) i dalje otključava
  odmah, bez datuma, a dashboard ga nudi kao „Privatni vodič — pošaljite gostu”.
  Ako je `properties` javno čitljiv (vjerojatno — javna stranica ga čita), onda
  je i `guest_token` čitljiv svima, a s njim i šifre. Prijedlog: u dashboardu
  umjesto starog linka nuditi „Napravi link za gosta” (po rezervaciji), pa u
  KORAKU 1 postaviti `stari_link_otkljucava := false` (KORAK 3). Treba vašu
  odluku jer mijenja što domaćini šalju gostima.
- [ ] **Tajni stupci u `properties`** (`guest_token`, iCal adrese) — potpuno
  skrivanje traži da javna stranica čita popis stupaca umjesto `*` i
  `grant select (…)` samo na javne stupce. Veća izmjena, nakon odluke o starom linku.
- [ ] **Pogađanje tokena** — token ima 16 znakova, pogađanje je nerealno, ali
  funkcija nema ograničenje broja poziva. Ako zatreba: Supabase rate limiting.
- [ ] **Vrijeme po Zagrebu** umjesto po satu gostova uređaja — gost iz druge
  vremenske zone sada vidi otključavanje u stvarno lokalno vrijeme objekta
  (ispravnije nego prije). U redu?

**Sada u kodu:** vodič i dalje piše „Šifra i lozinka prikazuju se tek kad se
pristup otključa.” Kad se pokrenu KORACI 1 i 2, smije se vratiti i rečenica iz
Figme „Šifre se ne šalju u preglednik prije otključavanja” — tada je istina.

## 1. Najvažnije — planovi i cijene

- [ ] **Nazivi, cijene, limiti i funkcije planova.**
  Baza (`plans`) danas ima free/pro/business, 0/15/49 € mjesečno i 0/150/490 €
  godišnje, limite 1·5 / 5·30 / 15·50. Figma koristi radne nazive
  Besplatno/Domaćin/Pro i piše „TBD”. Obrisani `preview/` predlagao je četiri
  plana (7,90/14,90/29,90 €) — ostao je u povijesti gita.
  **Sada u kodu:** naslovnica čita naziv, cijenu i limite iz `plans` (kao i
  prije). Promjena cijene = `UPDATE public.plans`, bez izmjene koda.
- [ ] **Smiju li se cijene uopće javno prikazati** dok Stripe nije spojen?
  **Sada u kodu:** prikazuju se, jer ih je prikazivala i stara naslovnica.
- [ ] **Po čemu se planovi razlikuju osim limita?** Kartice sad nose samo
  provjerene činjenice: limit objekata i fotografija, javna stranica i privatni
  vodič, bez provizije, „Sve iz besplatnog plana”. Maknute su tvrdnje kojih u
  kodu nema: „5 jezika”, „kalendar se sam osvježava”, „vlastita domena”.
- [ ] **iCal: funkcija Pro plana ili za sve?**
- [ ] **Tijek nadogradnje dok Stripe nije spojen.** Pretplata u dashboardu i
  Račun sada nude „Javite nam se” (`mailto:podrska@odmoria.com`) — prije je
  dashboard pisao „Preusmjeravanje na Stripe...”, a Stripea nema.
  Svi CTA-ovi na naslovnici vode na `/register.html` („Započni besplatno”);
  pod Pro karticom piše „Nadogradite kad vam zatreba.”
- [x] **Cijene zakucane u `add-property.html`** (15 € / 49 €) — sada se čitaju iz
  `plans` (naziv, cijena, limiti); maknute su i tvrdnje „vlastita domena”,
  „white-label”, „API pristup”, kojih u kodu nema.

## 2. Naslovnica (`index.html`) — nastalo pri prijenosu u kod

- [ ] **Konfigurator izgleda (teme) na naslovnici — maknut.** Odobreni dizajn
  pokazuje jedan izgled, a teme su po uputi odgođene. Stara naslovnica s
  konfiguratorom sačuvana je u povijesti gita (commit `407f300`). Vraća se
  zajedno s temama (točka 9).
- [ ] **„Pogledaj primjer za gosta”** danas vodi na sidro `#izlog` na istoj
  stranici. Pravi primjer traži demo objekt u bazi (novi red u `properties` —
  treba odobrenje) ili statičnu demo stranicu.
- [ ] **Fotografije.** Naslovnica koristi samo `villa.jpg` iz handoffa (AI
  generirana, izmišljena vila) — sličice u izlogu su izrezi iste fotografije.
  Za `living.jpg`, `bedroom.jpg` i `kitchen.jpg` nema dokaza o licenci, pa nisu
  korištene. Treba: potvrda licence ili druge fotografije.
- [ ] **„Prijava” u navigaciji** — dodana (Figma je nema u gornjoj traci, a
  postojeći domaćini trebaju ulaz). Zadržati?
- [ ] **Pravni podaci u podnožju** — naziv obrta, OIB, adresa, kontakt. Danas ih
  nema.
- [ ] **Demo podaci u panelu „Za domaćine”** (Ana K., Marko i Iva, Obitelj W.)
  izmišljeni su i označeni „Demo · sintetički podaci”. U redu tako?

## 3. Javna stranica (`p.html`) — faza A, sada u kodu

- [x] **Teme javne stranice.** Nova javna stranica ima jedan izgled i
  **ne primjenjuje temu** koju je domaćin odabrao.
  **Odluka (28. 9. 2026.):** teme se čuvaju i vraćaju kasnije, kao veći izbor
  za one koji plaćaju — nije hitno. Plan je u točki 9. Do tada panel „Izgled”
  u dashboardu ostaje i nosi napomenu „Uskoro … javna stranica teme zasad ne
  prikazuje”.
- [ ] **„Stranicu pokreće Odmoria”** u podnožju: uvijek ili samo na besplatnom
  planu? **Sada u kodu:** uvijek, kao i prije.
- [ ] **Usporedba „Preko platforme (~15 %)” i brojač noći.** Figma ih je spojila
  u jedan tijek s kalendarom. **Sada u kodu:** uklonjeno. Vraća se samo uz izvor
  za 15 %.
- [ ] **Serif pismo:** Gelasio, ili Georgia s Gelasio rezervom? **Sada u kodu:**
  Georgia → Gelasio (Gelasio se učitava, pa ga dobiju uređaji bez Georgije).
- [ ] **Ikone sadržaja i preporuka.** Domaćin u dashboardu bira emoji; nova
  stranica ih ne prikazuje, nego bira Lucide ikonu po nazivu („bazen” → valovi,
  „Wi-Fi” → wifi…), a nepoznato dobije kvačicu. Treba li domaćinu u dashboardu
  ponuditi izbor iz istog skupa ikona?
- [ ] **Bez fotografija:** prije su se vrtjela tri nacrtana prizora i prazna
  mjesta u galeriji. **Sada u kodu:** petrol gradijent u zaglavlju, galerija se
  ne prikazuje. U redu, ili treba ilustracija?
- [ ] **Maknuto jer nije u dizajnu:** izmjena 3 fotografije u zaglavlju,
  pokretna traka s podacima, puna foto traka „Marija vas očekuje”. Nedostaje li
  išta od toga?
- [ ] **Rod domaćina.** Figma piše „domaćica Marija”; baza ne zna rod pa kod piše
  samo ime (`Villa Maslina · Marija`). Dodati izbor (domaćin/domaćica) ili
  ostaviti?
- [ ] **Prošli datumi u kalendaru** mogu se odabrati — tako je bilo i prije.
  Onemogućiti ih? (Mala izmjena, nije rađena jer mijenja ponašanje.)
- [ ] **Rečenica „Točnu adresu i upute za dolazak gost dobiva u privatnom
  vodiču”** vrijedi samo ako je domaćin upisao adresu u „Dolazak”. Zadržati?

## 4. Aplikacija domaćina i vodič — faza B (oboje preneseno u kod)

- [ ] Proći prototipe B1 Host Desktop, B2 Host Mobile i B3 Guest Mobile.
- [ ] **Navigacija:** 5 glavnih dijelova u bočnoj traci + podtabovi, umjesto 17
  panela. **Sada u kodu:** bočna traka ima Pregled · Objekt · Boravci ·
  Linkovi i QR, a dolje Pretplata, Postavke računa i Odjava. Na mobitelu je
  donja traka (Pregled, Objekt, Boravci, Linkovi, Više).
- [ ] **Podtabovi Objekta: 11 umjesto 5.** Figma ih ima pet (Osnovno ·
  Fotografije · Cijene i sadržaji · Dolazak i upute · Vodič za goste). Kod
  zasad drži postojeće panele jedan po jedan (Osnovno, Fotografije, Cijene,
  Sadržaji, Dolazak, Wi-Fi, Lokalni vodič, Prijevoz, Atrakcije, Pravila i FAQ,
  Izgled), jer spajanje više panela u jedan traži izmjenu trake „Imate
  nespremljene promjene” (ona zna za samo jedan gumb „Spremi” po panelu).
  Spojiti prema Figmi?
- [x] **Analitika** — dodana (Pregled → Analitika), vidi točku 11.
- [x] **Pregled:** sada ima „Sljedećih 14 dana” (dolasci i odlasci) i „Na što
  obratiti pažnju” s radnjama (vidi točku 11). „Brze radnje” iz Figme nisu
  dodane zasebno — radnje su uz svako upozorenje.
- [ ] **Pregled gosta (telefon desno)** — Figma ga nema; u kodu ostaje, ali samo
  na zaslonima širim od 1280 px. Zadržati?
- [ ] **Traka „Imate nespremljene promjene”** — Figma ima i gumb „Odbaci”. Kod
  ima samo „Spremi” (odbacivanje bi tražilo ponovno učitavanje panela).
- [ ] **Kalendar dostupnosti:** Figma ima veće ćelije s oznakom izvora
  („Ručno”, „iCal”, ime gosta). U kodu su ćelije veće i u novim bojama, ali bez
  oznake u ćeliji. Dodati oznake?
- [ ] **Stari zajednički privatni link** (`slug` + `guest_token`, otključava
  odmah): ukloniti iz sučelja?
- [ ] **„Deaktiviran” zasebno od „Istekao”**, sa zasebnom porukom u vodiču?
  **Sada u kodu:** ista poruka („Ovaj link je istekao”), kao i prije.
- [ ] **Vodič: podstranice.** Figma ima zasebne zaslone (Dolazak, Wi-Fi i kuća,
  Preporuke, Domaćin). U kodu su to dijelovi iste stranice koji se otvaraju
  preko adrese (`#dolazak`, `#kuca`, `#preporuke`, `#domacin`) s gumbom natrag;
  pločice „Kućna pravila” i „Odlazak” vode na isti zaslon „Wi-Fi i kuća”, na
  svoj odjeljak. U redu?
- [ ] **Vodič: pločica „Kako što radi”** iz Figme u kodu se zove „Wi-Fi i kuća”,
  jer taj zaslon nosi i Wi-Fi mrežu i lozinku (kao Figma okvir „Wi-Fi i kuća”).
- [ ] **Vodič: preporuke u jednom popisu.** Mjesta, prijevoz i atrakcije su jedan
  popis s filtrima (kategorije domaćina + „Prijevoz” + „Izleti”), kao u Figmi.
- [ ] **Vodič: tamna tema** iz obrisanog `preview/` nije prenesena (Figma je
  nema; izvedba je u povijesti gita). Treba li?
- [ ] **Vodič: tekstovi stanja linka** preuzeti su iz Figme („Link nije
  ispravan”, „Ovaj link je istekao”, „Objekt nije pronađen”) — nijedno stanje
  ne otkriva naziv ni adresu objekta.
- [x] **Analitika po danu** iz `page_views` — napravljena, za sve planove (točka 11 — treba li je ograničiti po planu).
- [x] **Države posjetitelja** — napravljeno (točka 11): `api/track.js` +
  stupac `page_views.country` (`sql/add-country-to-page-views.sql`). Jezik
  preglednika (`lang`) nije dodan — vidi točku 11.
- [ ] **Gumb „Popuni testnim kalendarom”:** ostaje nakon lansiranja?
- [ ] **Izgled (teme) i istaknuta brojka:** vidi točku 9.
- [ ] *(Za kod, ne odluka)* „Kreiraj link” mora biti onemogućen dok su datumi
  neispravni — u prototipu vodi dalje.

## 5. Račun, postavljanje, admin — faza C (sve preneseno u kod)

- [ ] Proći prototipe C1 Auth Mobile, C3 Račun i C4 Admin.
- [ ] **Ton obraćanja:** dizajn i nova naslovnica koriste „vi”, produkcijska
  prijava „ti”. Jedno za cijelu aplikaciju. **Sada u kodu:** naslovnica, javna
  stranica, vodič, prijava, registracija, nova lozinka, potvrda e-maila,
  postavljanje, dodavanje objekta i račun su na „vi”; dijelovi dashboarda
  (poruke u panelima) još su na „ti”.
- [ ] **Zaboravljena lozinka ne postoji kao tijek.** Nigdje se ne šalje e-mail za
  novu lozinku (`resetPasswordForEmail`) — „Zaboravili ste lozinku?” šalje link
  za prijavu (kao i prije, i kao u Figmi). Stranica `reset-password.html` radi,
  ali do nje se iz aplikacije ne može doći. Dodati „Pošalji link za novu
  lozinku” (i u Postavkama računa), ili ostaviti samo link za prijavu?
- [ ] **„Otvori aplikaciju za e-mail”** (Figma, zaslon „Provjerite e-mail”) nije
  dodan — nema pouzdanog načina da web stranica otvori pretinac (samo `mailto:`,
  koji otvara novu poruku). Umjesto njega stoje „Pošalji ponovno” i „Natrag na
  prijavu”.
- [ ] **Poruke grešaka** iz Supabasea stižu na engleskom; najčešće su prevedene
  („E-mail ili lozinka nisu točni.”, „Račun s tim e-mailom već postoji.”),
  ostale se prikazuju uz hrvatski uvod. Treba li prevesti još koju?
- [ ] **Registracija nakon uspjeha** prikazuje „Provjerite e-mail” s adresom
  umjesto zelene poruke iznad obrasca. Pretpostavlja da je potvrda e-maila u
  Supabaseu uključena — ako nije, korisnik je već prijavljen i tekst ne stoji.
- [ ] **Korak 5 postavljanja:** link po boravku umjesto starog zajedničkog.
  **Sada u kodu:** i dalje stari zajednički link (`slug` + `guest_token`), koji
  otključava šifre **odmah**, bez vremenskog zaključavanja. Isto vrijedi za
  „Privatni link” nakon dodavanja objekta.
- [ ] **Greška u postavljanju (postojala i prije):** ako se s koraka 2 vratite
  na korak 1 i opet kliknete „Dalje”, objekt se **ponovno upiše** u bazu
  (duplikat, a na besplatnom planu okidač limita odbije drugi upis). Popravak je
  mali: na koraku 1 ažurirati postojeći objekt ako je već napravljen. Nije rađen
  jer mijenja ponašanje — odobriti?
- [ ] **Greška u postavljanju (postojala i prije):** „Natrag” na koraku 5 vodi
  na korak 3, ne na 4 (`prevStep(4)` umjesto `prevStep(5)`). Popraviti?
- [ ] **Nadogradnja „preko kontakta”** — zid limita i Račun pišu „Online
  plaćanje još nije spojeno — za nadogradnju nam se javite”, ali nigdje nema
  kontakta. Koja adresa ili obrazac?
- [ ] **Brisanje računa ne briše ništa** — kao i prije, poruka upućuje na
  `podrska@odmoria.com`, a domena `odmoria.com` još nije spojena, pa taj e-mail
  vjerojatno ne radi. Treba prava adresa ili pravo brisanje (serverska funkcija).
- [ ] **E-mail obavijesti** — prekidač se nigdje ne sprema (ni prije nije).
  Sada uz njega piše „Postavka se još ne sprema.” Figma ima dva prekidača
  (važne poruke / novosti). Spremati u bazu (nova kolona — treba odobrenje) ili
  maknuti?
- [ ] **Pretplata i limiti:** Figma prikazuje potrošnju fotografija po objektu
  (traka „4 od 5”); u kodu je samo limit („do 5 po objektu”), jer bi traka
  tražila dohvat fotografija svih objekata. Dodati?
- [ ] **Tab „Poruke” u adminu:** odobriti tablicu `announcements` ili ukloniti
  tab. **Sada u kodu:** tab postoji, obrazac se ne sprema i to piše na njemu
  (kao i prije).
- [ ] **Admin — „Uskoro istječe”:** Figma uz svaki red ima gumb „Javi se”
  (e-mail domaćinu). U kodu je tablica bez gumba, jer nema dogovorene poruke ni
  adrese pošiljatelja. Dodati kao `mailto:` na e-mail iz objekta?
- [ ] **Admin — filtar planova:** Figma ima čipove (Svi planovi · free · pro ·
  business); u kodu je ostao padajući izbornik (ista logika). Zamijeniti?
- [ ] **Admin — stupci tablice:** Figma ima „Vrijedi do” i „Registriran”; kod
  prikazuje objekte (nazive) i status pretplate, kao i prije. Koje stupce želite?
- [ ] **Admin na mobitelu:** bočna traka postaje vodoravna traka na vrhu (Figma
  mobile ima popis domaćina u karticama umjesto tablice — tablica se na
  mobitelu vodoravno pomiče).
- [x] **Pomoć, Uvjeti, Privatnost:** zajednički predložak tekstualne stranice
  napravljen bez Figme (`tekst.css`). Sadržaj i neslaganja — točka 8.

## 6. Odgođeno (nije odluka, nego posao koji čeka)

- [ ] Fotografije u Figmu: povući `villa.jpg`, `living.jpg`, `bedroom.jpg`,
  `kitchen.jpg` na pravokutnike `seed:*` na stranici 01 Foundations, pa
  rasporediti na sve `img:*` i komponente PhotoItem.
- [ ] Nakon izmjena stranica 03/04 ponovno generirati kopije prototipa na 08.
- [ ] Povlačenje prstom u galeriji — samo u kodu (Figma ga ne podržava).
- [ ] Tablet 834 kao zaseban frame, ako bude potreban (kod ga već pokriva).
- [ ] Redoslijed prijenosa u kod: naslovnica ✔ → javna stranica ✔ → aplikacija
  domaćina ✔ → vodič ✔ → račun/admin. Svaki korak na Preview, pa potvrda.

## 7. Grana i produkcija

- [ ] Grana `claude/funny-archimedes-c0qosu` osim naslovnice nosi i pet starijih
  commitova koji **nisu u `main`**: `1ac3eeb`, `d0ccb18` (živi admin v3),
  `407f300` (konfigurator na naslovnici — sada zamijenjen), `91eaf02`
  (CLAUDE.md), `265e2cc` (tabovi u dashboardu). PR #1 je zatvoren bez spajanja.
  Treba odlučiti: spojiti sve zajedno, ili razdvojiti.
- [x] **Čišćenje (28. 9. 2026.).** Obrisani su `atmosphere.css`, `motion.js`,
  `ui.css`, cijela mapa `preview/`, `assets/odmoria-dashboard.png` i `/preview`
  rute u `vercel.json`. `README.md` je napisan ispočetka (spominjao je Stripe
  funkcije i SQL datoteke koje ne postoje). **Ostaju `teme.css` i `teme.js`**
  (točka 9). Što je iz prijedloga ostalo nepreneseno — točka 10.

## 8. Pomoć, Uvjeti korištenja, Pravila privatnosti

Za ove tri stranice u Figmi nema dizajna. Dobile su zajednički predložak
(`tekst.css`: traka kao na naslovnici, zaglavlje na plavkastoj podlozi, tekst do
760 px, podnožje s poveznicama).

**Pravni tekst (Uvjeti, Privatnost) prenesen je doslovno** — pravni tekst mijenja
vlasnik, ne kod. Ali na više mjesta ne odgovara onome što aplikacija radi, pa
ga prije lansiranja treba pregledati (po mogućnosti s pravnikom). Pomoć nije
pravni tekst, pa je u njoj netočno **uklonjeno ili ispravljeno** (popis dolje).

### 8a. Uvjeti korištenja (`terms.html`) — piše, a nije tako

- [ ] **Cijene su zakucane** (Pro 15 €/mj ili 150 €/god, Business 49 €/mj ili
  490 €/god, Free do 1 objekta). Pravi izvor je tablica `plans`, a planovi i
  cijene još nisu konačni (točka 1). Kad se cijene promijene, uvjeti će
  proturječiti aplikaciji. Prijedlog: u uvjetima napisati „prema cjeniku na
  stranici”, bez iznosa.
- [ ] **„Plaćanja obrađuje Stripe. Pretplata se automatski obnavlja.”** —
  Stripe nije spojen; nadogradnja ide „preko kontakta” (točka 5).
- [ ] **Povrat u 14 dana** za Pro i Business — nema plaćanja, pa nema ni povrata.
  Ostaviti za kad Stripe proradi?
- [ ] **„Business plan s timskim pristupom”** — timski pristup ne postoji
  (`maxTeamMembers` postoji u `plans`, ali ga ništa u kodu ne koristi).
- [ ] **„Obavijestit ćemo vas emailom … 14 dana unaprijed”** — nema slanja
  e-mailova iz aplikacije.
- [ ] **Sud u Zagrebu** i **ograničenje odgovornosti na 12 mjeseci plaćanja** —
  pravna odluka, potvrditi.
- [ ] **Tko je pružatelj usluge?** Nema imena tvrtke/obrta, OIB-a ni adrese —
  za uvjete i GDPR to je obavezno.

### 8b. Pravila privatnosti (`privacy.html`) — piše, a nije tako

- [ ] **Stripe** („obrađuje plaćanje… skladište podataka kartice”) — nije spojen.
- [x] **„Klikovi na WhatsApp gumb i Google Maps”** — od rujna 2026. se
  bilježe (točka 11): upit WhatsAppom / e-mailom / kopiranjem i otvaranje
  karte, kao nova vrijednost `view_type` u `page_views` (bez novih stupaca,
  bez podataka o posjetitelju). Tvrdnja je sada točna.
- [ ] **Popis trećih strana je nepotpun.** Nedostaju: **Cloudinary**
  (fotografije), **Google Maps** (karta na javnoj stranici, učitava se na klik),
  **esm.sh** (učitava Supabase biblioteku i QR generator), **Google** (prijava
  Google računom). Google Fonts je naveden, ali uz fontove Google vidi IP
  posjetitelja — to je poznata GDPR tema (njemačke presude); rješenje je fontove
  držati na vlastitoj domeni.
- [ ] **„Supabase (Irska/SAD)”** — regija projekta nije provjerena u ovom
  radu; provjeriti u Supabase postavkama.
- [ ] **„Svi pružatelji imaju potpisane DPA”** — to je tvrdnja o ugovorima koju
  kod ne može potvrditi. Provjeriti za svakog (Supabase, Vercel, Cloudinary).
- [ ] **„Ne prikupljamo … IP adresu gostiju”** — aplikacija IP ne sprema, ali ga
  Vercel i Supabase bilježe u svojim zapisnicima. Preformulirati („ne
  spremamo”), ili navesti rok zapisnika. **Novo (rujan 2026.):** iz IP-a se
  izvodi **država** posjetitelja (Vercel, `x-vercel-ip-country`) i sprema uz
  pregled; sam IP se ne sprema. Pravila privatnosti to trebaju navesti
  (npr. „bilježimo državu iz koje je stranica otvorena, bez IP adrese”).
- [ ] **Upiti gostiju (novo, točka 13)** — gost sada može ostaviti **ime,
  e-mail i/ili telefon** u upitu, a to se sprema u bazu dok ga domaćin ne
  obriše. Tvrdnje „ne prikupljamo ime, email, telefon gostiju” i „gosti ne
  ostavljaju email” u Pravilima privatnosti i u Pomoći **više nisu točne**.
  Treba: navesti upite, svrhu (odgovor na upit), tko ih vidi (samo domaćin),
  rok čuvanja i da je domaćin voditelj obrade za te podatke.
- [ ] **Kolačići** — Supabase sesiju prijave drži u `localStorage`, ne u
  kolačiću. Tekst „samo kolačići neophodni za sesiju” je
  duhom točan, ali tehnički nije.
- [ ] **Brisanje: „u roku 30 dana”** — Račun kaže „brišemo u roku 24 h”. Jedno
  od dvoje uskladiti.
- [ ] **`podrska@odmoria.com`** — na obje stranice je jedini kontakt, a domena
  `odmoria.com` još nije spojena (vidi točku 5). Ako adresa ne prima poštu,
  zahtjevi za brisanje (GDPR) nikamo ne stižu.
- [ ] **Ime gosta u rezervaciji** — domaćin upisuje ime gosta (`bookings.guest_name`)
  i napomenu; tekst tvrdi da „ne prikupljamo ime… gostiju”. Treba dodati da
  domaćin to može upisati i da je on voditelj te obrade.
- [ ] **„Zadnje ažuriranje: kolovoz 2026.”** — ostavljen datum starog teksta;
  promijeniti kad se tekst ispravi.

### 8c. Pomoć (`help.html`) — što je promijenjeno i zašto

Sve rečenice su na „vi”, kao ostatak aplikacije. Pretraga radi i bez dijakritike
(„sifra” nađe „šifra”), pogoci se sami otvore; kategorije su poveznice.
Planovi i broj fotografija pune se iz tablice `plans` (kao prije), ali **bez
dodatnih tvrdnji** koje su bile zakucane uz svaki plan.

**Uklonjeno, jer ne postoji:**

- vlastita domena (Pro/Business) — sad piše „Zasad ne”,
- „bez naše oznake” / „Odmoria oznaka u podnožju” — javna stranica nema oznaku
  ni na jednom planu,
- analitika 90 dana / 12 mj, white-label, timski pristup (do 5),
- „Upravljaj pretplatom” (Stripe portal), povrat u 14 dana, „za više od 15
  objekata javite se za ponudu” — sad piše da online plaćanja još nema i da se
  plan mijenja e-mailom,
- gumb **WhatsApp** s lažnim brojem `385000000000`,
- „odgovaramo u roku 24 sata radnim danima”.

**Ispravljeno, jer je bilo netočno:**

- **QR kod vodi na javnu stranicu**, ne na privatni vodič (`renderQr()` koristi
  `publicUrl`). Stari tekst savjetovao je QR sa šiframa lijepiti na hladnjak.
  Ako želite QR za vodič, to je nova značajka — ali takav QR u apartmanu
  otvara šifre svakome tko ga fotografira.
- Postavljanje ima **5 koraka** (bilo je 4).
- „Šifre su zaštićene na razini baze” — maknuto dok se ne provjeri točka 0.
- „Podaci su u EU (Irska)”, „Stripe ne vidi…”, „usklađeni s GDPR-om: Da” — maknuto;
  umjesto toga piše što se stvarno čuva i gdje (Supabase, Cloudinary, Vercel).
- „Brisanje: dashboard → ⚙️ → Opasna zona, 30 dana” → **Račun → Profil i
  sigurnost → Brisanje računa**, zahtjev e-mailom, bez roka.
- „Link se sam zaključava” — `token_expires_at` se pri stvaranju rezervacije ne
  upisuje iz dashboarda (možda ga postavlja baza — nije provjereno). Pomoć zato
  kaže samo ono što je sigurno: nakon dana odlaska vodič ne pokazuje šifre, a
  „Deaktiviraj” zatvara link odmah.
- Savjet „stavite javni link u opis na Bookingu” — maknut; Booking.com u pravilu
  ne dopušta vanjske poveznice i kontakt u opisu.
- Domena u tekstu (`odmoria.com/p/…`, `odmoria.com/register`) → samo putanja
  (`/p/naziv-objekta`), prema pravilu „nikad ne zakucavati domenu”.

**Otvoreno za Pomoć:**

- [ ] Kontakt: samo e-mail. Želite li i WhatsApp ili telefon (pravi broj)?
- [ ] Rok odgovora podrške — ako ga želite obećati, upisati.
- [ ] Opći gostinski link (stari put `slug` + `guest_token`) Pomoć spominje uz
  upozorenje da šifre pokazuje odmah; vidi točku 0/5 hoće li se ukinuti.

## 9. Teme za one koji plaćaju — podsjetnik za kasnije

Tvoja ideja: **osam tema ostaje**, da domaćin koji plaća ima veći izbor u
personalizaciji svoje javne (oglasne) stranice. Nije hitno — ovo je popis što
treba kad se krene.

**Što postoji danas**

- `teme.css` + `teme.js`: osam tema (Jadran, Laguna, Zlatni sat, Terakota,
  Beton, Riviera ’70, Ponoćni bazen, Borova šuma). Svaka ne mijenja samo boju,
  nego i ono čime stranica vodi (ime, cijena, temperatura bazena, popis
  prostorija, tablica, pismo domaćice…). Opis je u `CLAUDE.md`.
- Panel **Objekt → Izgled** u dashboardu: birač s minijaturama, istaknuta
  brojka, spremanje u `properties.theme` i `properties.highlight`
  (`sql/add-theme-to-properties.sql` — provjeriti je li pokrenut).
- Panel nosi napomenu „Uskoro”, jer nova javna stranica temu ne prikazuje.

**Što treba napraviti**

- [ ] **Teme prenijeti na v2.** Pisane su za stari v3 izgled (krema/terakota,
  Fraunces) i stari raspored zaglavlja `p.html`. Nova `p.html` ima drugačije
  zaglavlje i tokene iz `odmoria.css`, pa svaku temu treba ponovno složiti —
  najbolje prvo u Figmi, kao i ostatak v2. „Jadran” = današnji v2 izgled.
- [ ] **Koliko tema i koje.** Svih osam ili manji izbor (npr. 3–4 najjače)?
- [ ] **Kako se teme otključavaju — vaš prijedlog (28. 9. 2026.): jednokratna
  kupnja, npr. 2 €, za svaki plan** (ne samo najviši). Što to traži i o čemu
  odlučiti:
  - **Stripe** mora biti spojen (danas nije) — jednokratno plaćanje
    (Checkout u načinu `payment`) + webhook koji upiše kupnju. To je ista
    serverska funkcija koja fali i za pretplate, pa bi se radile zajedno.
  - **Gdje se pamti kupnja:** nova tablica, npr. `theme_purchases`
    (`user_id` ili `property_id`, `theme` ili „sve”, iznos, Stripe ID, vrijeme)
    — **nova tablica, treba odobrenje**. Provjera u bazi (okidač na
    `properties.theme`), ne samo u pregledniku.
  - **Po objektu ili po računu?** Domaćin s 3 objekta — plaća li 2 € jednom
    ili po objektu? Prijedlog: jednom po računu, vrijedi za sve objekte.
  - **Jedna tema ili sve?** 2 € za jednu temu ili paket svih osam?
  - **Naknade:** Stripe za europske kartice uzima ~1,5 % + 0,25 €, dakle
    ~0,28 € od 2 € (~14 %); s karticama izvan EU i više. Uz PDV (25 % ako se
    prodaje privatnim osobama u HR) od 2 € ostaje oko 1,30 €. Možda 3–5 € ili
    „besplatno uz Pro, 2–3 € uz Free”?
  - **Što ako se tema promijeni** — plaća li se svaka nova tema? Prijedlog:
    jednom plaćeno = sve teme zauvijek.
  **Sada u kodu:** panel „Izgled” piše „Uskoro”; ništa se ne naplaćuje.
- [ ] **Što kad plan istekne.** Prijedlog: stranica se vraća na zadanu temu, a
  odabir ostaje spremljen i vraća se nakon obnove.
- [ ] **Istaknuta brojka** (`highlight`, npr. „32°” za bazen) — ostaje dio tema.
- [ ] **Konfigurator na naslovnici** (commit `407f300`) — vratiti kao prodajni
  argument kad teme prorade.
- [ ] **Kontrast** mjeriti za svaku temu na v2 podlozi (stare mjere vrijede samo
  za v3).
- [ ] Dok se ovo ne napravi: panel „Izgled” ostaje s napomenom, ili ga sakriti?
  **Sada u kodu:** ostaje s napomenom.

## 10. Iz starog prijedloga (`preview/`) — nije preneseno

Mapa je obrisana, ali ove ideje nisu odbačene, samo nisu dio v2. Sve je u
povijesti gita (zadnje stanje s mapom: commit `70d0552`).

- [ ] **Četiri plana** Besplatno / Domaćin 7,90 € / Pro 14,90 € / Partner
  29,90 € (točka 1).
- [ ] **Tamna tema vodiča** (prati postavku uređaja, pamti ručni odabir).
- [ ] **Zaslon „Prvi dan”** — prazan račun s napretkom „vodič je 40 % gotov” i
  pet koraka.
- [ ] **Zaslon „Kad nešto ne radi”** — baza ne odgovara / istekao link, s
  telefonom domaćina umjesto bijele stranice.
- [ ] **Podsjetnik gostu** s porukom na jeziku gosta (npr. njemački za
  rezervaciju s Bookinga).
- [ ] **Grafikoni analitike** (pregledi kroz vrijeme, izvori prometa,
  popunjenost, kada gost otvori vodič) i **države posjetitelja** (točka 4).
- [ ] **Prebacivanje plana uživo** koje pokazuje što je zaključano iza kojeg plana.

**Ostalo što je ostavljeno namjerno:**

- `billing.js` — Stripe pomoćnik, nigdje uključen. Ostaje dok se ne spoji
  Stripe; ako se odustane od Stripea, briše se.
- `api/test-calendar.js` i gumb „Popuni testnim kalendarom” — točka 4.
- `sql/fix-missing-columns-and-storage.sql` sadrži staru politiku Supabase
  Storagea (fotografije su danas na Cloudinaryju). Bezopasno; ne dira se bez
  dogovora (RLS/konfiguracija).
- Dashboard učitava Fraunces i fontove tema (`teme.css` → Google Fonts, osam
  obitelji) samo zbog minijatura u panelu „Izgled”. Ako se panel sakrije, to se
  može maknuti i dashboard se brže učitava.

## 11. Analitika domaćina i admin panel (rujan 2026.)

Sve je na **postojećim tablicama** (`page_views`, `availability`, `bookings`,
`properties`, `subscriptions`, `plans`) — nijedan novi stupac ni tablica.
Izračuni su u jednom modulu (`analitika.js` + `analitika.css`) koji dijele
dashboard i admin.

**Što se novo bilježi** (`page_views.view_type`, samo vrsta i vrijeme):
`inquiry_whatsapp`, `inquiry_email`, `inquiry_copy` (upit s javne stranice),
`map` (otvorena karta), `guide:dolazak` / `guide:kuca` / `guide:preporuke` /
`guide:domacin` (dio vodiča). Svaka vrsta jednom po otvaranju stranice.
Kad domaćin sam otvori svoju stranicu ili vodič iz aplikacije (dodaje se
`?domacin=1`), ništa se ne bilježi — prije su se njegovi pregledi brojali.

**Dashboard → Pregled** (za svakog domaćina):
- četiri brojke: popunjenost sljedećih 30 dana, sljedeći dolazak, pregledi i
  upiti u 30 dana s usporedbom;
- **Na što obratiti pažnju** — automatske provjere s gumbom za radnju: iCal
  nije sinkroniziran 3+ dana, boravak s Bookinga/Airbnba bez linka za vodič
  („Napravi link” otvori rezervaciju s već upisanim datumima), gost dolazi za
  ≤ 7 dana a u vodiču nema šifre/Wi-Fija/adrese, praznine kraće od
  minimalnog boravka, linkovi aktivni nakon odlaska, prazan kalendar;
- **Sljedećih 14 dana** — dolasci, odlasci i izmjene istog dana.

**Dashboard → Analitika:** raspon 30 / 90 dana / 12 mjeseci; pregledi i
otvaranja vodiča (ista skala), upiti po kanalu, što gosti otvaraju u vodiču,
dan u tjednu i sat, popunjenost po mjesecima (12 mj.), odakle dolaze noćenja
(Booking/Airbnb/Odmoria/ručno + udio izravnih), boravci ove godine s grubom
procjenom prihoda (noći × cijena), praznine u 90 dana s „Kopiraj ponudu”,
raspored čišćenja s „Kopiraj raspored”, usporedba objekata, izvoz boravaka u CSV.
Svaki grafikon ima i prikaz tablicom.

**Admin:** novi tabovi Pregled, Objekti i Korištenje; Domaćini, Prihod,
Poruke i Sustav prošireni:
- Pregled: računi, novi domaćini (mjesec prema mjesecu), plaćeni, MRR, aktivni
  domaćini, promet, upiti; „Na što obratiti pažnju” s prečacima; rast,
  **aktivacijski lijevak** (račun → objekt → fotografije → link → gost otvorio
  vodič) i usvajanje mogućnosti;
- Domaćini: segmenti (aktivni, neaktivni, istječe, isteklo, bez pretplate,
  kandidati za nadogradnju, rizik odljeva, slabo zdravlje), pretraga, poredak,
  stranice po 25, **zdravlje računa 0–100**, CSV, „Kopiraj e-mailove”;
  **Detalji** domaćina: promjena plana, **produljenje pretplate** (+1 mj,
  +1 god, bez isteka), e-mail, objekti s brojkama;
- Objekti: dovršenost, iCal ažurnost, promet po objektu, filtri, CSV;
- Korištenje: promet platforme 30/90/365 dana, kanali upita, dijelovi vodiča,
  dan u tjednu, rezervacije po mjesecu, top 10 objekata;
- Prihod: MRR u riziku, uskoro istječe, **kandidati za nadogradnju**, **rizik
  odljeva** — s gumbom „Javi se”;
- Poruke: e-mail segmentu **radi odmah** (otvara vaš e-mail program sa
  skrivenom kopijom, ili kopira adrese); obavijesti u aplikaciji i dalje traže
  tablicu `announcements`;
- Sustav: zdravlje podataka (računi bez objekta, domaćini bez pretplate,
  objekti bez adrese/kontakta, neispravne rezervacije).

**Odluke koje čekaju:**

- [ ] **Analitika po planu?** `plans.analytics_days` postoji (Free 0 / Pro 90
  / Business 365), ali ga ništa ne koristi. **Sada u kodu:** svi planovi vide
  sve (i 12 mjeseci). Ograničiti (npr. Free 30 dana), ili ostaviti kao razlog
  za registraciju?
- [ ] **Procjena prihoda** (noći × cijena po noći) — korisna ili zbunjujuća?
  Označena je kao gruba procjena; cijena je jedna za cijelu godinu.
- [ ] **Pragovi upozorenja:** iCal „star” nakon 3 dana (dashboard) / 7 dana
  (admin); praznina = do 7 noći; „gost dolazi” = 7 dana unaprijed;
  kandidat za nadogradnju = na limitu ili 100+ pregleda u 30 dana. Promijeniti?
- [ ] **Zdravlje računa** — bodovi: fotografije 20, cijena 10, iCal 15, link za
  gosta 20, promet u 30 dana 20, gost otvorio vodič u 90 dana 15. U redu?
- [ ] **E-mail u adminu je kontakt iz objekta** (`properties.email`), ne adresa
  računa — adresa računa je u `auth.users`, koju admin s javnim ključem ne
  može čitati. Računi bez objekta zato nemaju vidljiv e-mail. Za pravu adresu
  treba serverska funkcija sa service ključem (odobrenje).
- [ ] **Admin ne može stvoriti red u `subscriptions`** (RLS dopušta samo
  izmjenu). Domaćinu bez reda plan se ne može postaviti iz admina — treba
  insert politika za vlasnika (promjena RLS-a, odobrenje) ili okidač koji red
  stvara pri registraciji.
- [ ] **Veliki promet:** admin povlači preglede zadnjih 90 dana (do 100.000
  redova). Kad platforma naraste, zbrajanje treba prebaciti u bazu (pogled ili
  RPC funkcija) — nova SQL funkcija, odobrenje.
- [ ] **Admin na mobitelu:** tablice se vodoravno pomiču (Figma mobile ima
  kartice). U redu za alat koji se koristi uglavnom na računalu?
- [ ] **Stari podaci:** pregledi prije ove verzije nemaju upite ni dijelove
  vodiča, a domaćinovi vlastiti pregledi su se brojali — usporedba s
  razdobljem prije rujna 2026. je zato gruba.

### 11a. Države posjetitelja (rujan 2026.)

- Kako radi: `p.html` i `h.html` šalju pregled na `/api/track` (Vercel
  funkcija), koja iz zaglavlja `x-vercel-ip-country` doda državu i upiše red.
  IP se ne sprema. Ako ruta ne odgovori (lokalno), red ide izravno, bez države.
- **Treba pokrenuti** `sql/add-country-to-page-views.sql` (novi stupac
  `country` s provjerom oblika i indeks). Dok se ne pokrene, sve radi, a
  kartica „Države posjetitelja” u dashboardu i adminu pokazuje uputu.
- Stariji pregledi ostaju bez države („Bez poznate države”).
- [ ] **Vercel Hobby** ograničava broj poziva funkcija mjesečno — svaki pregled
  sada je jedan poziv `/api/track`. Pratiti potrošnju u Vercelu kad promet
  naraste.
- [ ] **Jezik preglednika** (`navigator.language`) bi pokazao i jezik gostiju
  (npr. Nijemci iz Austrije) — još jedan stupac. Želite li?
- [ ] **Pravila privatnosti** — dodati rečenicu o državi (točka 8b).

## 13. Upiti gostiju, rezervacije i spremanje (rujan 2026.)

**Upit spremljen u Odmoriji** — gost na javnoj stranici odabere termin, upiše
ime i prezime te e-mail ili telefon i pošalje upit. Domaćin ga vidi u
dashboardu (**Boravci → Upiti**, značka s brojem novih, upozorenje u Pregledu,
naslov kartice preglednika, provjera svaku minutu) i jednim klikom:
**„Prihvati i napravi link”** → nastane rezervacija, dani se označe kao
zauzeti (vezani uz rezervaciju), upit postane „prihvaćen”, a na kartici su
gumbi **WhatsAppom / E-mailom** s gotovom porukom i privatnim linkom na gostov
broj ili adresu. Ako se termin preklapa sa zauzetim danima, to piše na
kartici i traži se potvrda. „Odbij” nudi gotovu poruku „termin nije
slobodan”. WhatsApp i e-mail izravno domaćinu ostali su kao druga mogućnost.

- **Treba pokrenuti** `sql/add-inquiries.sql` (nova tablica `inquiries`;
  provjerena na lokalnom Postgresu: gost smije samo poslati, ne i čitati;
  vlasnik vidi samo svoje; provjere oblika; najviše 20 upita na sat po
  objektu; status i vezu gost ne može podmetnuti). Dok se ne pokrene, obrazac
  kaže da upit nije moguće poslati i nudi WhatsApp/e-mail, a panel Upiti
  objašnjava što treba.
- [ ] **Obavijest domaćinu e-mailom** kad stigne upit — traži slanje e-mailova
  (npr. Supabase Database Webhook + servis kao Resend/Postmark). Danas domaćin
  upit vidi tek kad otvori dashboard. Želite li?
- [ ] **Potvrda gostu** da je upit stigao (e-mail) — isto.
- [ ] **Rok čuvanja upita** — prijedlog: odbijeni i neodgovoreni brišu se
  nakon 12 mjeseci (zakazani zadatak u bazi). Pravila privatnosti (8b).
- [ ] **Upiti bez datuma** (s dna javne stranice) i dalje idu samo
  WhatsAppom/e-mailom. Dodati obrazac i ondje?
- [ ] Admin ne vidi upite (RLS: samo vlasnik). Treba li admin broj upita?

**Obrazac rezervacije** (Boravci → Rezervacije): „Ime i prezime gosta” je
obavezno (vidi se u pozdravu vodiča). Novo: **telefon i e-mail gosta** samo za
slanje linka — ne spremaju se. Link sada stvarno **vrijedi do dan nakon
odlaska** (`token_expires_at`), kako je i pisalo uz obrazac. Ako se termin
preklapa sa zauzetim danima, traži se potvrda.
- Ispravljena greška: gumb „WhatsApp” nakon izrade linka otvarao je razgovor s
  **domaćinovim vlastitim brojem**; sada ide na gostov broj (ili na izbor
  kontakta ako broj nije upisan), s gotovom porukom.
- [ ] Lokalni broj s 0 (npr. 091…) tretira se kao hrvatski (+385). Strani
  gosti trebaju upisati broj s pozivnim brojem države.

**Nespremljene promjene** (dashboard): traka „Imate nespremljene promjene”
sada ima i **Odbaci**; pri prelasku na drugi dio ili drugi objekt pita
**„Spremi i nastavi / Ne spremaj / Ostani”** (prije je traka tiho nestala, a
promjene ostale nespremljene), a pri zatvaranju kartice preglednik upozori.

**Animacije** — suptilne, samo ako korisnik nije isključio animacije u
sustavu: otkrivanje pri listanju (javna stranica, naslovnica), fotografija u
zaglavlju polako „sjedne”, pločice vodiča ulaze redom, šifre pri
otključavanju kratko zasvijetle, u dashboardu i adminu brojke izbroje,
stupci rastu, trake se pune, kartice se lagano podignu. Otkrivanje je vezano
uz položaj na stranici (ne uz IntersectionObserver), pa preglednik bez
podrške jednostavno pokaže sve.
- [ ] Više ili manje pokreta? Lako se pojača ili utiša na jednom mjestu
  (`odmoria.css`, `analitika.css`).

**Sitno:**
- [ ] `favicon.ico` ne postoji (preglednik ga traži na svakoj stranici → 404
  u zapisniku). Treba ikona.

## 14. Popusti na pretplate (rujan 2026.)

**Admin → Popusti.** Vlasnik platforme postavi ponudu i ona se odmah
prikazuje svugdje gdje piše cijena (naslovnica, Pomoć, Račun, dodavanje
objekta, Pretplata u dashboardu): stara cijena precrtana, nova istaknuta,
oznaka s nazivom, postotkom, trajanjem i rokom („Ljetna akcija · −25 % prva
3 mj. · do 8. 10.”). Kad rok istekne, ponuda sama prestane vrijediti, nitko je
ne gasi.

Ponuda ima:
- **postotak** (1–100 %) ili **novu cijenu** u € (nova cijena vrijedi za
  jedno razdoblje, mjesečno *ili* godišnje, jer 9,99 € mjesečno ≠ 9,99 € godišnje;
  baza to i provodi);
- **plan** (jedan ili svi plaćeni) i **razdoblje** (mjesečno, godišnje, oba);
- **od–do** (može početi u budućnosti = „zakazana”; bez roka = dok je ne
  zaustavite);
- **trajanje nakon kupnje** (npr. „prva 3 mjeseca”, ili cijelo vrijeme);
- **za koga**: svi domaćini ili **samo jedan** (osobni popust; brže iz
  Domaćini → detalji → „Osobni popust”).

Stanja u popisu: Aktivna · Zakazana · Zaustavljena · Istekla, uz gumbe
Zaustavi / Pokreni / Obriši. Pregled uživo pokazuje novu cijenu prije spremanja.

**Naplata — iskreno:** danas se **ništa ne naplaćuje**, jer Stripe nije
spojen (nadogradnja ide e-mailom). Zato je iznos već sada zaključan na
jednom mjestu: funkcija u bazi **`cijena_plana(plan, razdoblje, korisnik)`**.
Kad se spoji Stripe, poslužiteljska funkcija za plaćanje **mora** uzeti
iznos od nje (ne iz preglednika) — tako prikazana i naplaćena cijena ne mogu
se razići, a nitko ne može sam sebi „izračunati” popust. Prijavljeni i
anonimni smiju samo `cijena_plana_za_mene` (uvijek za sebe); tuđi osobni
popust nije vidljiv ni izračunljiv. Provjereno na lokalnom Postgresu.

- **Treba pokrenuti** `sql/add-plan-promotions.sql` (nova tablica
  `plan_promotions` + dvije funkcije). Dok se ne pokrene, tab Popusti to kaže
  i ne dopušta spremanje, a sve stranice pokazuju redovne cijene.
- MRR i prihod u adminu računaju **samo osobne** popuste (općenita akcija
  vrijedi za nove kupnje; tko je već platio, plaća svoju cijenu).

Otvorene odluke:
- [ ] **Vrijedi li akcija i za produljenje** postojećih pretplata ili samo za
  nove kupnje? Prijedlog: samo nove (tako je i u MRR-u).
- [ ] **Kako se preslikava u Stripe:** postotak/iznos → Stripe *coupon*
  (`duration: once / repeating / forever` prema „trajanju nakon kupnje”), ili
  jednostavno checkout s iznosom iz `cijena_plana`. Prijedlog: coupon, jer
  Stripe tada sam vraća punu cijenu nakon N mjeseci.
- [ ] **Kodovi za popust** („LJETO25”) koje domaćin upiše sam — lako se doda
  kao stupac `kod` na istu tablicu. Želite li?
- [ ] Umjesto trajnih popusta razmisliti o **probnom Pro** (npr. 14 dana) —
  obično bolje pretvara nego popust (vidi 15).

## 15. Preporuke — što bi još trebalo (rujan 2026.)

Poredano po važnosti. Ništa od ovoga nije započeto; svaka stavka čeka vaše „da”.

### Za vas (platforma) — prije pravog lansiranja
1. [ ] **Stripe naplata** — checkout + portal + webhook (`billing.js` je već
   pripremljen). Bez toga nema prihoda, a popusti su samo prikaz.
2. [ ] **Supabase Pro** (ili drugi plan bez pauziranja) i **sigurnosne
   kopije** baze. Keepalive je samo zakrpa.
3. [ ] **Slanje e-mailova** (npr. Resend): ~~obavijest domaćinu o upitu~~ (gotovo, točka 18), potvrda
   gostu, podsjetnici za istek plana, dobrodošlica i 3–4 e-maila „kako
   postaviti vodič” za nove račune.
4. [ ] **Pravni tekst i podaci tvrtke** (točka 8) — obavezno prije naplate.
5. [ ] **Praćenje grešaka** (npr. Sentry, besplatni plan) — da znate kad
   nekome pukne stranica prije nego vam se javi.
6. [ ] **Domena odmoria.com** i poslovna e-mail adresa.
7. [ ] **Probni Pro 14 dana** za nove račune, **preporuke** („dovedi
   domaćina, oboje dobivate mjesec besplatno”) i **sezonski plan** (stupac
   `season_price_eur` već postoji — domaćini na Jadranu rade 4–5 mjeseci).
8. [ ] **Zapisnik admin radnji** (tko je kome promijenio plan ili dao popust).
9. [ ] **Automatska iCal sinkronizacija** preko `pg_cron` u bazi (Vercel
   Hobby dopušta samo jedan cron, a taj je keepalive).

### Za domaćina
1. [ ] **Automatska sinkronizacija s Bookingom/Airbnbom** (isto kao 9 gore) —
   najveći rizik danas je dvostruka rezervacija.
2. [ ] **Automatske poruke gostu**: dan prije dolaska (link + upute), jutro
   odlaska (checklist), dan nakon (zahvala + molba za recenziju).
3. [x] **Vodič na jeziku gosta** (EN/DE/IT) — gotovo, 6 jezika (točka 18) — većina gostiju na Jadranu je
   iz Njemačke, Austrije, Italije; `maxLanguages` u planu već postoji.
4. [ ] **Pomoć za eVisitor i boravišnu pristojbu** — obrazac za podatke
   gosta u vodiču, izvoz za eVisitor. Jedinstvena prednost u Hrvatskoj.
5. [ ] **Recenzije** na javnoj stranici (gost ostavi nakon boravka).
6. [ ] **Dodatne usluge u vodiču** (kasni odlazak, transfer, izleti) — gost
   pošalje zahtjev domaćinu; bez plaćanja u aplikaciji.
7. [ ] **Link za čistačicu** — samo raspored dolazaka/odlazaka, bez šifri.
8. [ ] **QR plakat za ispis** (A4 za objekt) i **SEO** javne stranice
   (schema.org `LodgingBusiness`, dijeljenje s fotografijom).

### Za gosta
1. [x] **Vodič automatski na jeziku preglednika** (uz 3 gore) — točka 18.
2. [ ] **Radi bez interneta** (PWA) — gost po dolasku često nema signal.
3. [ ] **Wi-Fi QR** — skenira i spoji se bez tipkanja lozinke.
4. [ ] **Fotografije ulaza i pin na karti** za dolazak; „Dodaj u kalendar” (.ics).
5. [ ] **Hitni brojevi** (112, hitna, najbliža ljekarna/bolnica).
6. [ ] **Kratka ocjena na kraju boravka** — domaćin sazna problem prije
   recenzije na Bookingu.

## 16. Plaćanje karticom — Stripe u testnom načinu (rujan 2026.)

**Što je napravljeno.** Pretplata u dashboardu i Račun imaju gumbe
„Odaberi Pro/Business” (mjesečno ili godišnje) koji otvaraju Stripeovu
stranicu za plaćanje, i „Upravljaj pretplatom” (Stripeov portal: kartica,
računi, otkaz). Nakon plaćanja domaćin se vrati u Odmoriju, a plan se
promijeni sam, obično za sekundu-dvije.
- **Iznos računa baza**, ne preglednik: `cijena_plana_za_mene` (točka 14).
  Popust ide kao Stripe kupon, pa Stripe sam vrati punu cijenu nakon
  „trajanja nakon kupnje”.
- **Plan upisuje samo webhook** (`api/stripe-webhook.js`), a stanje uvijek
  provjeri izravno kod Stripea. Lažni ili ponovljeni događaj ništa ne mijenja.
- Otkazana pretplata vrijedi do kraja plaćenog razdoblja, zatim → Free.
  Neuspjelo plaćanje (kartica odbijena) plan ne ruši odmah — Stripe
  pokušava ponovno. Nakon kraja razdoblja plan vrijedi još 2 dana, da kasni
  webhook ne spusti domaćina na Free.
- Dok Stripe nije postavljen, sve ostaje kao prije (nadogradnja e-mailom).

**Kako uključiti (testni način — ne treba obrt, ništa se ne naplaćuje):**
1. Otvorite račun na stripe.com i uključite **Test mode** (gore desno).
2. Stripe → Developers → API keys → **Secret key** (`sk_test_…`).
3. Vercel → projekt → Settings → Environment Variables, **samo za Preview**
   (da produkcija ne pokaže „testni način” pravim domaćinima):
   - `STRIPE_SECRET_KEY` = `sk_test_…`
   - `SUPABASE_SERVICE_ROLE_KEY` = Supabase → Project Settings → API keys →
     **secret** (`sb_secret_…` ili `service_role`). Ovaj ključ zaobilazi RLS,
     zato ga koristi samo webhook i živi samo u Vercelu — nikad u kodu ni
     u pregledniku. **Ovo je prvi takav ključ u projektu — upisujete ga vi.**
4. Supabase SQL editor: `sql/add-stripe-to-subscriptions.sql` — **KORAK 0
   pošaljite meni** (stupci, provjere, RLS na `subscriptions`), zatim KORAK 1.
   Za popuste i `sql/add-plan-promotions.sql` (bez njega vrijedi redovna cijena).
5. Stripe → Developers → Webhooks → Add endpoint:
   `https://guestflow-git-claude-funny-archimedes-c0qosu-guestflow4.vercel.app/api/stripe-webhook`
   s događajima `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`,
   `invoice.paid`, `invoice.payment_failed`. (Tajna „signing secret” ne
   treba — webhook svaki događaj provjeri dohvatom od Stripea.)
   - Ako je na Vercelu uključena zaštita Previewa (Deployment Protection),
     Stripe dobije 401: Vercel → Settings → Deployment Protection →
     **Protection Bypass for Automation** → dodajte na kraj adrese
     `?x-vercel-protection-bypass=<ta tajna>`.
6. Stripe → Settings → Billing → **Customer portal** → Save (jednom, da
   „Upravljaj pretplatom” radi).
7. Vercel → Deployments → zadnji Preview → **Redeploy** (nove varijable
   vrijede tek od sljedeće objave).
8. Proba: Pretplata → Odaberi Pro → kartica `4242 4242 4242 4242`, bilo koji
   budući datum i CVC. Za provjeru s dodatnom potvrdom banke:
   `4000 0025 0000 3155`; za odbijenu karticu: `4000 0000 0000 0002`.

**Za pravu naplatu (nakon obrta / knjigovođe):** isti koraci s `sk_live_…`
ključem u **Production**, webhook na produkcijsku adresu, i odluke niže.

Otvorene odluke:
- [ ] **Računi i fiskalizacija** — Stripe šalje potvrdu plaćanja, ali to nije
  fiskalizirani račun. Knjigovođa: program za račune ili prodavač umjesto
  vas (Paddle / Lemon Squeezy).
- [ ] **PDV** — dok ste paušalist, bez PDV-a; kasnije Stripe Tax ili ručno.
- [ ] **OIB/PDV broj kupca** na računu (domaćini s obrtom ga žele) — u
  Checkoutu se može uključiti polje za porezni broj.
- [ ] **Promjena plana (Pro → Business)** ide kroz portal tek kad se u
  postavkama portala dopusti promjena i dodaju proizvodi „Odmoria Pro” i
  „Odmoria Business” (nastanu sami pri prvom plaćanju). Do tada: otkaz pa
  nova kupnja.
- [ ] **Probno razdoblje** (npr. 14 dana Pro) — jedan parametar u checkoutu.
- [ ] **RLS na `subscriptions`** — ako KORAK 0 pokaže da domaćin smije sam
  mijenjati svoj red, to treba zatvoriti (inače si može upisati Business).

## 17. Paket značajki za domaćina i gosta (29. 9. 2026.)

Napravljeno po vašem popisu (sve na grani, ništa u produkciji):

| Stranica | Što |
| --- | --- |
| Naslovnica | „Pogledaj primjer za gosta” → `/h/demo` (izmišljeni vodič, bez baze) |
| Javna stranica | SEO i pregled linka (naslov, opis, fotografija za WhatsApp/Facebook, schema.org) kroz `api/stranica.js`; `/sitemap.xml`, `/robots.txt`; recenzije gostiju; „Stranicu pokreće Odmoria” samo na Free i Pro |
| Vodič | Hitno i pomoć (112, 194, 192, 193, 195, HAK 1987, adresa, ljekarne/bolnica); Odlazak = popis za kvačice + ocjena 1–5; Prijava boravka (podaci za eVisitor); rad bez interneta (`sw.js`) |
| Dashboard | Objekt u 5 podtabova; veći kalendar s oznakom (ime gosta, Booking, Airbnb, Ručno); link za čistačicu (WhatsApp/e-mail, `c.html`); Boravci → Recenzije; podaci gostiju + boravišna pristojba uz rezervaciju; analitika po planu; „Kreiraj link” tek kad je sve ispravno; bez testnog gumba |
| Boravci | automatska iCal sinkronizacija (dnevno + svakih 30 min) |
| Prijava i račun | zaboravljena lozinka; prijevod grešaka; postavljanje bez duplikata i s linkom po boravku; fotografije po objektu; obavijesti se spremaju; pravo brisanje računa |
| Admin | čipovi planova, „Vrijedi do”, „Registriran”, e-mail računa, stvaranje pretplate, kartice na mobitelu, zapisnik promjena |

**SQL koje treba pokrenuti (Supabase SQL editor, ovim redom):**
1. `sql/add-reviews.sql` — recenzije + oznaka po planu (KORAK 2 mijenja Pro).
2. `sql/add-guest-registration.sql` — prvo KORAK 0, zatim KORAK 1.
3. `sql/add-cleaner-links.sql` — link za čistačicu.
4. `sql/delete-account.sql` — brisanje računa.
5. `sql/admin-upgrades.sql` — admin stvara pretplate, popis računa, zapisnik.
6. `sql/auto-ical-sync.sql` — tek kad su u Vercelu `CRON_SECRET` i
   `SUPABASE_SERVICE_ROLE_KEY`; u datoteci zamijeniti `<ADRESA>` i `<CRON_SECRET>`.
Dok se ne pokrenu, stranice rade kao prije, a svaki novi dio sam kaže što nedostaje.

**Postavke izvan koda:**
- [ ] Supabase → Auth → URL Configuration: u „Redirect URLs” mora biti
  `…/reset-password.html` (za produkciju i Preview), inače link za novu lozinku ne radi.
- [ ] Vercel: `CRON_SECRET` (automatska sinkronizacija). Poslužiteljski ključ je
  već na popisu za Stripe (točka 16).

**Odluke donesene u kodu (promijenite ako ne odgovara):**
- [ ] **Recenzije:** domaćin može javnu recenziju sakriti (ne i izmijeniti). Gost
  sam bira smije li se objaviti. Samo gost s linkom rezervacije, od dana dolaska,
  jednom po boravku.
- [ ] **Analitika po planu** (iz `plans.analytics_days`): Free — 30 dana i
  osnovne kartice (posjećenost, popunjenost, čišćenje); Pro (90) — sve kartice
  i 90 dana; Business (365) — 12 mjeseci i usporedba objekata. Zaključane
  kartice su zamućene s ponudom plana. Ograničenje je u sučelju, ne u bazi.
- [ ] **eVisitor:** Odmoria ne šalje podatke u eVisitor (nema javnog API-ja za
  ovakve aplikacije) — domaćin ih prepisuje ili preuzme CSV. Podaci se brišu 30
  dana nakon odlaska. Pristojba: djeca do 12 ne plaćaju, 12–18 pola; iznos
  upisuje domaćin (ovisi o općini). Admin podatke gostiju ne vidi.
- [ ] **Popis za odlazak:** redovi iz „Upute za odjavu” postaju kvačice; bez njih
  ide uobičajeni popis (prozori, klima, ormari, ključevi).
- [ ] **Link za čistačicu:** jedan po objektu, vidi 60 dana unaprijed, bez imena
  gostiju; „Novi link” poništi stari.
- [ ] **Rad bez interneta:** šifre se na uređaju gosta spremaju samo ako su u
  tom trenutku već bile otključane; kopija se briše dan nakon odlaska.
- [ ] **Stari zajednički link** se više ne nudi u postavljanju ni pri dodavanju
  objekta (dashboard ga još ima pod „Privatni vodič” — ukidanje, točka 0).
- [ ] **Pomoć** sada kaže da se kalendari osvježavaju sami — vrijedi tek kad je
  uključena automatska sinkronizacija (gore).

### Podsjetnik — što ste odgodili i moramo proći

0. **Ključ za automatski prijevod (`ANTHROPIC_API_KEY`)** — odgođeno dok
   aplikacija ne krene; upute u točki 18.
0. **E-mail domaćinu o upitu (Resend)** — odgođeno dok aplikacija ne krene;
   upute u točki 18.

1. **Pomoć, Uvjeti, Privatnost** — pravni tekst (točka 8) + nove stvari koje
   ga mijenjaju: recenzije, podaci gostiju za eVisitor (broj isprave!), link za
   čistačicu, spremanje na uređaju gosta, Stripe. Pomoć: pitanja o
   recenzijama, čistačici, eVisitoru, radu bez interneta.
2. **Pozadina i platforma** — slanje e-mailova (obavijest o upitu ✔ točka 18; istek plana,
   poruke gostu; izbor obavijesti se već sprema), Supabase Pro i sigurnosne
   kopije, praćenje grešaka, domena i poslovni e-mail, probni Pro, preporuke
   (referral), sezonski plan, kodovi za popust.
3. **Plaćanje** — Stripe ključevi i webhook (točka 16), knjigovođa (obrt,
   fiskalizacija, PDV), prava naplata, promjena plana kroz portal, OIB kupca.

## 18. Jezici za goste i e-mail o upitu (29. 9. 2026.)

### Jezici — što je napravljeno

Vodič (`h.html`) i javna stranica (`p.html`) rade na **6 jezika: hrvatski,
engleski, njemački, talijanski, poljski i češki.**

- **Jezik se bira sam** po jeziku preglednika gosta (slovenski, bosanski i
  srpski → hrvatski; nepoznat → engleski). Gore desno je birač jezika; izbor se
  pamti na uređaju. Link može nositi jezik: `…/h/<token>?lang=de`.
- **Sučelje** (gumbi, naslovi, poruke, datumi, množina: „1 noć / 3 noći”) je u
  rječniku `jezici.js` — radi odmah, bez mreže i bez troška.
- **Tekstove domaćina** (riječ dobrodošlice, upute za dolazak, pravila,
  pitanja, preporuke, sadržaji) **prevodi Claude (Anthropic)** preko rute
  `/api/prevedi`, i prijevod se **sprema u bazu** — isti tekst se prevodi
  jednom, pa ga svi sljedeći gosti dobiju odmah i besplatno. Promijeni li
  domaćin tekst, novi se prevede kod prvog sljedećeg gosta.
- Ispod stranice piše „Tekst domaćina preveden je automatski.” (ili „Dio
  teksta domaćina prikazan je na hrvatskom.” kad prijevoda nema).
- **Šifra vrata, Wi-Fi, adresa, ime i kontakt gosta NIKAD ne idu na prijevod** —
  ruta te stupce uopće ne čita (provjereno testom).
- Česti tekstovi (popis sadržaja iz dashboarda: Bazen, Klima uređaj, Parking…,
  vrste objekta, kategorije Plaže/Restorani…, „5 min pješice”) prevedeni su i
  bez AI-ja, u rječniku.
- Primjer `/h/demo` je preveden cijeli (vrijedi pokazati gostima iz inozemstva).

### Jezici — što trebate napraviti

> **ODGOĐENO (29. 9. 2026., odluka vlasnika):** `ANTHROPIC_API_KEY` još nije
> postavljen — da se ništa ne plaća dok aplikacija ne krene s pravim
> domaćinima. Do tada: sučelje vodiča i javne stranice je na jeziku gosta,
> tekst domaćina na hrvatskom, a u panelu Prijevodi domaćin može prevesti sam.
> **Kad krene:** console.anthropic.com → Billing (kredit, npr. 5 $, i
> ograničenje potrošnje) → API Keys → Create Key → u Vercel kao
> `ANTHROPIC_API_KEY` (Production i Preview) → Redeploy. Ništa drugo ne treba.
> Ostali koraci iz ove točke (SQL, `SUPABASE_SERVICE_ROLE_KEY`) su napravljeni.

1. [ ] Pokrenuti `sql/add-translations.sql` (tablice `prijevodi` i `prijevodi_rucni`, čita ih samo poslužitelj).
2. [ ] **Ključ za prijevod:** console.anthropic.com → API Keys → Create key.
   U Vercelu (Settings → Environment Variables) dodati `ANTHROPIC_API_KEY`
   (Preview i Production). Treba i `SUPABASE_SERVICE_ROLE_KEY` (već na popisu, točka 16).
   → Redeploy.
   **Trošak:** prijevod jednog vodiča na jedan jezik je oko 1–3 centa, i to
   jednom (poslije iz baze). 50 objekata × 5 jezika ≈ 2–5 € ukupno.
   Model se može promijeniti varijablom `PRIJEVOD_MODEL`.
3. Bez ključa sve radi: sučelje je na jeziku gosta, a tekst domaćina na hrvatskom.

### Jezici — odluke (promijenite ako ne odgovara)

- [ ] **Koji jezici:** EN, DE, IT, PL, CS. Slovenski nisam dodao jer ga
  preglednik šalje na hrvatski (većina Slovenaca ga razumije). Zamjena ili
  dodavanje (npr. SL, FR, NL, HU) = novi stupac u rječniku `jezici.js` +
  jezik u `api/prevedi.js` i u CHECK-u tablice `prijevodi`.
- [ ] **Po planu:** Free = hrvatski + engleski (`plans.max_languages = 2`),
  Pro i Business = svih 6 (8). Gost na Free objektu s njemačkim preglednikom
  dobije engleski. Mijenja se u bazi, bez koda:
  `update plans set max_languages = 6 where id = 'free';`
- [ ] **Poruka domaćinu** (WhatsApp/e-mail/upit s javne stranice) piše se na
  jeziku koji domaćin na Jadranu razumije: gost na HR/EN/DE/IT piše na svom
  jeziku, gost na poljskom ili češkom — na engleskom. Gost vidi poruku prije slanja.
- [x] **Domaćin ispravlja prijevod sam:** dashboard → Objekt → **Prijevodi**.
  Bira jezik, vidi svaki svoj tekst (hrvatski lijevo, prijevod desno, po
  skupinama), može pokrenuti „Prevedi što nedostaje”, ispraviti i spremiti.
  Ispravak ima prednost pred automatskim prijevodom, vidi ga samo gosti tog
  objekta (tablica `prijevodi_rucni`), a „Vrati automatski” ga briše. Jezik
  koji plan ne uključuje ima lokot i ponudu plana. Javna stranica pokaže
  ispravak najkasnije za 2 minute (predmemorija na Vercelu).
- [ ] Recenzije se ne prevode (ostaju na jeziku kojim ih je gost napisao).
- [ ] Dashboard, naslovnica, prijava, pravni tekst i stranica za čistačicu
  ostaju na hrvatskom (koriste ih domaćini i čistačice u Hrvatskoj).
- [ ] Vrijednosti u prijavi za eVisitor (npr. „Putovnica”) ostaju hrvatske u
  bazi — prevodi se samo natpis, pa domaćin vidi isto kao prije.
- [ ] **Privatnost:** tekstovi domaćina idu Anthropicu na prijevod; to treba
  dodati u popis obrađivača u Pravilima privatnosti (točka 8b). Spremljeni
  prijevodi nisu vezani uz račun, pa ih brisanje računa ne briše (ako želite:
  `truncate public.prijevodi;` povremeno, sve se ponovno prevede samo).

### E-mail domaćinu za svaki novi upit

> **ODGOĐENO (29. 9. 2026., odluka vlasnika):** Resend i
> `sql/add-inquiry-email.sql` još nisu postavljeni. Do tada se upiti normalno
> spremaju i vide u dashboardu (Boravci → Upiti), samo ne stiže e-mail.
> **Kad krene:** račun na resend.com → API Keys → ključ `re_…` → na stranici
> „Postavljanje Odmorije” (5. dio) upisati ključ i pošiljatelja → Run u
> Supabaseu. Ništa u kodu ne treba mijenjati.

Kad gost pošalje upit s javne stranice, domaćin dobije e-mail: tko pita, za
koje datume i koliko osoba, poruka, kontakt gosta i gumb **„Otvori upit u
Odmoriji”** (vodi ravno na Boravci → Upiti tog objekta). **„Odgovori” u
e-mailu ide ravno gostu.** Šalje ga sama baza (okidač na tablici `inquiries`
→ pg_net → Resend), pa nijedan upit ne može proći bez obavijesti; ako slanje
ne uspije, upit se svejedno spremi.

- Ide na e-mail **računa** domaćina (ako ga nema, na kontakt e-mail objekta).
- **Ne ide** ako je domaćin u Računu → Obavijesti isključio „Važne obavijesti”.
- Najviše 20 na sat po objektu (isto ograničenje kao za upite).

**Što trebate napraviti:**
1. [ ] Račun na **resend.com** (besplatno do 3.000 e-mailova mjesečno, 100 dnevno).
2. [ ] Resend → Domains → dodati domenu (npr. `odmoria.com`) i u DNS kod
   registrara upisati zapise koje Resend pokaže. **Bez potvrđene domene
   Resend šalje samo na vašu vlastitu adresu** — za test je to dovoljno.
3. [ ] Resend → API Keys → Create („Sending access”) → ključ `re_…`.
4. [ ] U `sql/add-inquiry-email.sql` zamijeniti `<RESEND_KEY>`, `<OD>`
   (npr. `Odmoria <upiti@odmoria.com>`) i `<ADRESA>` (adresa aplikacije) pa
   pokrenuti u Supabase SQL editoru. Ključ se sprema u Supabase Vault.
5. [ ] Poslati upit sa svoje javne stranice i provjeriti poštu. Ako ne stigne:
   `select status_code, content from net._http_response order by created desc limit 5;`

**Odluke:**
- [ ] Gost ne dobiva potvrdu e-mailom (samo poruku na stranici). Može se dodati
  isto tako, jednim okidačem.
- [ ] E-mail je na hrvatskom (domaćin). Pošiljatelj je Odmoria, odgovor ide gostu.
- [ ] Privatnost: ime i kontakt gosta prolaze kroz Resend — dodati u popis
  obrađivača (točka 8b).

## 19. Promocija bez kataloga — gotove objave i letak (1. 10. 2026.)

### Odluka vlasnika: katalog / tražilica objekata — **ne sada**

Razmatrana je tražilica kao na Bookingu (lokacija, cijena, datumi), samo za
plaćene domaćine. **Odbijeno za sada:** prazna tražilica bez ponude izgleda kao
mrtav projekt; obećanje „besplatne reklame” mjeri se upitima koje ne možemo
jamčiti; platforma s tuđim oglasima nosi nove obveze (prijave lažnih oglasa,
moderiranje, DSA). Tehnički bi bilo 2–3 dana za osnovno (mjesto, cijena, broj
gostiju i kalendar već postoje). Ako se vrati: faza 1 = kućica „Uvrsti me u
katalog” i uredno mjesto/regija, javno tek kad u regiji bude ~30–50 plaćenih
objekata.

### Napravljeno: Linkovi i QR → **Objave** (točke 2 i 3 prijedloga)

- **Slika** (canvas, u pregledniku): objava 4:5 (1080×1350) ili story 9:16
  (1080×1920); naslovna ili odabrana fotografija, žuta oznaka „Slobodno”,
  datumi, noći, cijena, ime i mjesto; dolje bijela kartica s **QR kodom** i
  kratkom adresom javne stranice („Rezervirajte izravno · bez provizije”).
  Story ostavlja prazno gore i dolje (tamo Instagram crta svoje gumbe).
  Preuzmi (JPG) i, na mobitelu, **Podijeli** (Instagram, WhatsApp… sa slikom).
- **Slobodni termini iz kalendara** (sljedećih 90 dana, najmanje 2 noći ili
  minimalni boravak) kao gumbi; „Drugi datumi…” za ručni unos. Bez kalendara
  piše zašto nema prijedloga.
- **Četiri teksta** na jeziku po izboru (HR, EN, DE, IT, PL, CS): Instagram (s
  oznakama # i „link u opisu profila”), Facebook grupe, WhatsApp status,
  oglasnik (Njuškalo — s opisom i kontaktom). Sadržaji se na stranom jeziku
  navode samo ako ih rječnik zna (svih 28 iz kataloga zna).
- **Letak za ispis**: A4 s četiri kartice A6 (fotografija, „Hvala što ste bili
  naši gosti”, „Sljedeći put rezervirajte izravno”, QR, adresa, kontakt).
- **Pregled → Na što obratiti pažnju**: praznina ili slobodan termin u sljedeća
  3 tjedna ima gumb „Napravi objavu” koji otvori Objave s tim datumima.
- Ništa se ne sprema i nema troška: tekst iz predložaka, slika u pregledniku.

**Iskreno o Instagramu** (piše i u panelu): link u običnoj objavi nije
klikabilan — zato slika nosi QR i adresu; u storyju se dodaje naljepnica „Link”.

### Dorada (1. 10. 2026.): izgled, pokretna objava, animacije

- **Tri izgleda slike:** *Fotografija* (preko cijele slike), *Razglednica*
  (topli papir, fotografija u okviru, crtkana crta), *Luk* (fotografija u
  obliku kamenog luka na petrolu). Naslov u pismu Fraunces, žuta
  **naljepnica-sunce s cijenom**, oznaka „☀ Slobodno · 4 noći”.
- ~~Pokretna objava (video → MP4 ili GIF)~~ — napravljena, pa **maknuta na
  vaš zahtjev** (moglo bi čudno izgledati). Kod je sačuvan u povijesti gita
  (commit `a9f5dcd`) ako je poželite vratiti.
- **Male animacije** (`pokret.js` + `odmoria.css`, samo kad korisnik nije
  isključio pokret): sunčeve iskrice kad gost pošalje upit, ocjenu ili podatke
  za prijavu, i kad se vodič otključa; kvačica „✓ Kopirano” na gumbima;
  poruka na dnu iskoči s oprugom; odabrani dan u kalendaru poskoči; kartice i
  pločice se lagano podignu; tekst zaglavlja naslovnice dolazi redom; paneli u
  dashboardu se meko pojave.

### Odluke koje čekaju vas

- [ ] **Što je besplatno, a što plaćeno.** Sada je jedino ograničenje **broj
  jezika po planu** (`plans.max_languages`, kao vodič: Free = HR + EN). Ako
  želite „besplatno jedna slika i jedan tekst, plaćeno sve” (format story,
  slobodni termini, izgledi, letak), treba jedan stupac u `plans` (npr. `can_promo`) —
  mala SQL izmjena, pa vi pokrenete.
- [ ] Tekstovi su iz predložaka. Kad uključite ključ za prijevod (točka 18),
  može se dodati „Napiši drukčije” (AI) — svaki poziv se tada plaća.
- [ ] Slika nema oznaku Odmorije. Može se dodati sitna oznaka za Free plan
  (besplatna reklama nama), kao „pokreće Odmoria” na javnoj stranici.

### Sljedeće (prijedlog, nije napravljeno)

1. **Gosti se vraćaju izravno** — u vodiču „Dođite opet” (+ popust domaćina),
  „Javite mi slobodne termine za iduću godinu” s privolom, popis u dashboardu i
  poruka svima. Treba jedna nova tablica. Samo kroz vodič i uz privolu gosta
  (Booking ne dopušta „odvlačenje” gostiju kroz svoje poruke).
2. **Jezične inačice javne stranice za Google** (`hreflang`) — Nijemac koji
  traži „Ferienwohnung Vodice” nađe stranicu na njemačkom. Pola dana.
3. Google Business profil (Maps) za apartmane uglavnom **nije dopušten** — ne
  nuditi.

### Logo (stanje, odgođeno na zahtjev vlasnika)

Prijedlozi su na platnu (Artifact „Odmoria logo”): A · Luk, B · sunce na „i”
(B1 sa zrakama, B2 izlazak), C · manje žuto sunce, veliko „O”, šest fontova.
Preporuka: **Fraunces** (topao, mediteranski) ili **Unbounded** (najuočljiviji).
Odluka čeka vas; ništa nije stavljeno na stranicu.
