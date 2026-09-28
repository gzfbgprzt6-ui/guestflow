# Odmoria redizajn — odluke koje čekaju vlasnika

Stanje 28. 9. 2026. Ovdje su skupljena sva otvorena pitanja iz Figme (faze A, B i C)
i ona koja su se otvorila pri prijenosu naslovnice u kod. Dok odluka ne padne, kod
radi kako je opisano u stupcu **Sada u kodu**, uvijek na sigurnu stranu: ništa se
ne obećava što ne postoji, a ništa se ne upisuje u bazu.

- Figma: `BVdEgki8jV7z6Oa3K6Te2h` (stranica **00 Cover** ima iste popise)
- Pregled rada: https://claude.ai/code/artifact/d6e495bc-88c2-4647-9e16-5fd130bff06a

Oznaka `[ ]` znači da odluka još nije donesena. Kad padne, upiše se ispod stavke
i kvačica se zatvori.

---

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
- [ ] **Cijene zakucane u `add-property.html`** (15 € / 49 €) — čitati iz `plans`
  ili pričekati odluku o planovima.

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

## 3. Javna stranica (`p.html`) — faza A

- [ ] **„Stranicu pokreće Odmoria”** u podnožju: uvijek ili samo na besplatnom
  planu?
- [ ] **Usporedba „Preko platforme (~15 %)”** u sadašnjem `p.html`: zadržati uz
  izvor ili ukloniti?
- [ ] **Serif pismo:** Gelasio, ili Georgia s Gelasio rezervom (naslovnica sada
  koristi Georgia → Gelasio)?

## 4. Aplikacija domaćina i vodič — faza B (čeka pregled)

- [ ] Proći prototipe B1 Host Desktop, B2 Host Mobile i B3 Guest Mobile.
- [ ] **Navigacija:** 5 glavnih dijelova u bočnoj traci + podtabovi, umjesto 17
  panela.
- [ ] **Stari zajednički privatni link** (`slug` + `guest_token`, otključava
  odmah): ukloniti iz sučelja?
- [ ] **„Deaktiviran” zasebno od „Istekao”**, sa zasebnom porukom u vodiču?
- [ ] **Analitika po danu** iz `page_views`: želimo li taj prikaz i na kojem planu?
- [ ] **Države posjetitelja:** odobriti izmjenu sheme (`country`, `lang` u
  `page_views`) i `api/track.js`, ili odustati.
- [ ] **Gumb „Popuni testnim kalendarom”:** ostaje nakon lansiranja?
- [ ] **Izgled (teme) i istaknuta brojka:** dizajn u sljedećem krugu.
- [ ] *(Za kod, ne odluka)* „Kreiraj link” mora biti onemogućen dok su datumi
  neispravni — u prototipu vodi dalje.

## 5. Račun, postavljanje, admin — faza C (čeka pregled)

- [ ] Proći prototipe C1 Auth Mobile, C3 Račun i C4 Admin.
- [ ] **Ton obraćanja:** dizajn i nova naslovnica koriste „vi”, produkcijska
  prijava „ti”. Jedno za cijelu aplikaciju.
- [ ] **Korak 5 postavljanja:** link po boravku umjesto starog zajedničkog.
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
- [ ] Redoslijed prijenosa u kod: naslovnica ✔ → javna stranica → aplikacija
  domaćina → vodič → račun/admin. Svaki korak na Preview, pa potvrda.

## 7. Grana i produkcija

- [ ] Grana `claude/funny-archimedes-c0qosu` osim naslovnice nosi i pet starijih
  commitova koji **nisu u `main`**: `1ac3eeb`, `d0ccb18` (živi admin v3),
  `407f300` (konfigurator na naslovnici — sada zamijenjen), `91eaf02`
  (CLAUDE.md), `265e2cc` (tabovi u dashboardu). PR #1 je zatvoren bez spajanja.
  Treba odlučiti: spojiti sve zajedno, ili razdvojiti.
- [ ] `atmosphere.css`, `teme.css`, `teme.js` i `motion.js` naslovnica više ne
  učitava, ali ih i dalje koriste `p.html`, `h.html`, `dashboard.html` i
  `preview/`. Brišu se tek kad zadnja stranica prijeđe na `odmoria.css`.
