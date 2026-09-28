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

## 0. Sigurnost — provjeriti prije lansiranja

- [ ] **Tko smije čitati tablicu `sections`?** U njoj su `door_code` i
  `wifi_pass`. `CLAUDE.md` kaže da je anonimni korisnik smije čitati po
  `property_id`, a u `sql/` nema datoteke koja postavlja njezina pravila (RLS),
  pa se iz repozitorija ne može provjeriti. `property_id` nije tajan — javna
  stranica ga dobije uz ostale podatke objekta.
  **Ako je tako, šifra vrata i Wi-Fi lozinka mogu se dohvatiti izravno preko
  API-ja, bez linka gosta i bez vremenskog zaključavanja** — zaključavanje u
  `h.html` radi samo u pregledniku (vrijednosti ne ulaze u HTML, ali stignu u
  preglednik u odgovoru baze).
  Popravak je na strani baze (npr. funkcija koja vraća šifre samo za važeći
  token i samo u prozoru prijava − 1 h … odjava 23:59) i traži tvoje izričito
  odobrenje jer mijenja RLS. Ništa nije dirano.
  **Sada u kodu:** Figma je pod karticom „Vaš pristup” imala rečenicu „Šifre se
  ne šalju u preglednik prije otključavanja” — to trenutačno **nije istina**, pa
  vodič piše „Šifra i lozinka prikazuju se tek kad se pristup otključa.”

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
- [ ] **Države posjetitelja:** odobriti izmjenu sheme (`country`, `lang` u
  `page_views`) i `api/track.js`, ili odustati.
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
  spremamo”), ili navesti rok zapisnika.
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
- [ ] **Koji plan otključava teme.** Npr. besplatni plan ima samo zadanu temu,
  plaćeni sve. Za to treba zastavica u tablici `plans` (npr. `can_choose_theme`
  ili `max_themes`) — **nova kolona, treba odobrenje**; do tada se ne dira.
  Provjera mora biti i u bazi (okidač, kao ostali limiti), ne samo u pregledniku.
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
