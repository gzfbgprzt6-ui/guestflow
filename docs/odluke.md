# Odmoria redizajn — odluke koje čekaju vlasnika

Stanje 28. 9. 2026. (naslovnica, javna stranica, dashboard, vodič za gosta, prijava i registracija te postavljanje, dodavanje objekta i račun preneseni u kod). Ovdje su skupljena sva otvorena pitanja iz Figme (faze A, B i C)
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
  Besplatno/Domaćin/Pro i piše „TBD”. `preview/` predlaže četiri plana
  (7,90/14,90/29,90 €).
  **Sada u kodu:** naslovnica čita naziv, cijenu i limite iz `plans` (kao i
  prije). Promjena cijene = `UPDATE public.plans`, bez izmjene koda.
- [ ] **Smiju li se cijene uopće javno prikazati** dok Stripe nije spojen?
  **Sada u kodu:** prikazuju se, jer ih je prikazivala i stara naslovnica.
- [ ] **Po čemu se planovi razlikuju osim limita?** Kartice sad nose samo
  provjerene činjenice: limit objekata i fotografija, javna stranica i privatni
  vodič, bez provizije, „Sve iz besplatnog plana”. Maknute su tvrdnje kojih u
  kodu nema: „5 jezika”, „kalendar se sam osvježava”, „vlastita domena”.
- [ ] **iCal: funkcija Pro plana ili za sve?**
- [ ] **Tijek nadogradnje dok Stripe nije spojen.** Gumbi su danas `toast(...)`.
  Svi CTA-ovi na naslovnici vode na `/register.html` („Započni besplatno”);
  pod Pro karticom piše „Nadogradite kad vam zatreba.”
- [x] **Cijene zakucane u `add-property.html`** (15 € / 49 €) — sada se čitaju iz
  `plans` (naziv, cijena, limiti); maknute su i tvrdnje „vlastita domena”,
  „white-label”, „API pristup”, kojih u kodu nema.

## 2. Naslovnica (`index.html`) — nastalo pri prijenosu u kod

- [ ] **Konfigurator izgleda (teme) na naslovnici — maknut.** Odobreni dizajn
  pokazuje jedan izgled, a teme su po uputi odgođene. Stara naslovnica s
  konfiguratorom sačuvana je u povijesti gita (commit `407f300`). Vraća se ako
  teme ostaju prodajni argument.
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

- [ ] **Teme javne stranice — VAŽNO.** Nova javna stranica ima jedan izgled i
  **ne primjenjuje temu** koju je domaćin odabrao. Panel „Izgled stranice” u
  dashboardu i dalje radi i sprema temu, ali gost je ne vidi.
  Mogućnosti: (a) sakriti panel dok se teme ne dizajniraju u v2,
  (b) teme dizajnirati u v2 pa vratiti, (c) ostaviti kako je.
  **Sada u kodu:** (c). Ako se ide na (a), to je mala izmjena u `dashboard.html`.
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
- [ ] **Analitika** (peta stavka u Figmi) nije dodana — u kodu ne postoji, a
  traži nove upite nad `page_views` (vidi „Analitika po danu”).
- [ ] **Pregled:** Figma ima „Nadolazeće dolaske” s gumbom „Pošalji vodič” i
  „Brze radnje”. U kodu je Pregled ostao kakav je bio (linkovi, četiri brojke,
  sljedeći koraci) — samo novi izgled. Dodati?
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
- [ ] **Vodič: tamna tema** iz `preview/` nije prenesena (Figma je nema). Treba li?
- [ ] **Vodič: tekstovi stanja linka** preuzeti su iz Figme („Link nije
  ispravan”, „Ovaj link je istekao”, „Objekt nije pronađen”) — nijedno stanje
  ne otkriva naziv ni adresu objekta.
- [ ] **Analitika po danu** iz `page_views`: želimo li taj prikaz i na kojem planu?
- [ ] **Države posjetitelja:** odobriti izmjenu sheme (`country`, `lang` u
  `page_views`) i `api/track.js`, ili odustati.
- [ ] **Gumb „Popuni testnim kalendarom”:** ostaje nakon lansiranja?
- [ ] **Izgled (teme) i istaknuta brojka:** dizajn u sljedećem krugu.
- [ ] *(Za kod, ne odluka)* „Kreiraj link” mora biti onemogućen dok su datumi
  neispravni — u prototipu vodi dalje.

## 5. Račun, postavljanje, admin — faza C (sve osim admina preneseno u kod)

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
  tab.
- [ ] **Pomoć, Uvjeti, Privatnost:** zajednički predložak tekstualne stranice
  (nije dizajniran).

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
- [ ] `atmosphere.css` i `motion.js` više ne učitava nijedna živa stranica —
  koristi ih samo `preview/`. `teme.css`/`teme.js` koristi još `dashboard.html`
  (panel „Izgled”). Obrisati s mapom `preview/` kad se odluči. Brišu se tek kad zadnja stranica prijeđe na `odmoria.css`.
