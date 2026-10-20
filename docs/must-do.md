# Odmoria — MUST DO i stanje (19. 10. 2026.)

Kratko: što je u produkciji, što je postavljeno, što još ostaje vama.
Stripe i obrt su namjerno izostavljeni (kasnije).

---

## 1. Postavljeno — ništa ne treba raditi

Sve iz zadnjeg spajanja u `main` (16. 10. 2026.) je u produkciji, a baza i
Vercel su postavljeni i provjereni.

### Supabase — pokrenuto i provjereno (16. 10.)
- [x] `sql/sections-security.sql` (KORAK 1 i 2) — šifre i rezervacije zatvorene za anonimne
- [x] `sql/add-styles.sql` — 8 stilova (stare teme na objektima ostale)
- [x] `sql/delete-property.sql` — „Obriši objekt” (samo vlasnik)
- [x] `sql/add-arrival-steps.sql` — „Kako ući, korak po korak”
- [x] `sql/add-parking.sql` — fotografija i pribadača parkinga
- [x] `sql/add-ical-export.sql` — izvoz kalendara prema Bookingu/Airbnbu
- [x] `sql/add-team-access.sql` — suradnici
- [x] `sql/add-cleaner-status.sql` — čistačica javlja + otkazano/novo s platformi
- [x] `sql/add-referrals.sql` — „Preporuči domaćina”
- [x] `sql/add-translations.sql`, `sql/auto-ical-sync.sql` (od ranije)
- [x] zatvoren stari pogled `plan_violations` (bio je čitljiv javnim ključem i
      otkrivao e-mail domaćina): `revoke select … from anon, authenticated`

### Vercel
- [x] `SUPABASE_SERVICE_ROLE_KEY` i `CRON_SECRET` postavljeni — provjereno:
      sinkronizacija svakih 30 min dobiva `200 OK`

### Supabase budan (besplatno)
- [x] GitHub Actions „Supabase budan” pokrenut, zeleno (05:17 i 17:43 UTC)
- [x] Vercel cron `/api/keepalive` jednom dnevno

---

## 2. Ostaje vama (ništa hitno)

- [x] `sql/add-push.sql` (obavijesti na mobitel) i KORAK 1 iz
      `sql/sections-security.sql` (stari link ne otključava šifre) — pokrenuto 19. 10.,
      obavijest provjerena na iPhoneu
- [ ] **Uz puštanje novog vodiča u main** (Claude pokreće uz vašu potvrdu, jednim paketom):
      `sql/add-guest-arrived.sql` („Ušli smo” → obavijest domaćinu) i
      `sql/add-plan-features.sql` (što koji plan otključava; jezika 6, suradnika 3) i
      `sql/add-per-object-plans.sql` (Domaćin 12 € / Agencija 9 € po objektu, broj objekata iz Stripea) i
      `sql/add-direct-bookings.sql` (sezonske cijene, iznos upita, kod povratnika, pristanak na ponude)
- [ ] Privatnost: dodati rečenicu da vodič na gostov klik „Ušli smo” javlja
      domaćinu vrijeme ulaska (vidi `docs/odluke.md`, točka 33)

- [ ] **Isprobati na produkciji**: Osnovno (vrsta, kapacitet, stil), Dolazak
      (koraci, parking), Sadržaji, Prijevodi → „Prevedi besplatno”, kalendar 2
      mjeseca, link čistačice → „Potvrđujem” (vidi se u 🔔), vodič rezervacije
- [ ] **E-mailovi** — Resend račun + potvrda domene, pa `sql/add-inquiry-email.sql`
      (ključ u Vaultu) i tek onda `sql/add-guest-emails.sql`
- [ ] Supabase → Authentication → uključiti „Leaked password protection”
      (ako je dostupno na Free planu)
- [ ] `ANTHROPIC_API_KEY` u Vercelu — **neobavezno** (automatski prijevod);
      bez njega domaćin klikne „Prevedi besplatno”
- [ ] **Prije pravih korisnika**: pravni tekst (Uvjeti, Privatnost) — popis u
      `docs/odluke.md`, točka 8 (Resend, OpenStreetMap/Photon, MyMemory,
      Anthropic, Cloudinary; e-mail gosta 30 dana)
- [ ] Supabase Pro kad krenu pravi gosti (dva besplatna budilnika drže Free
      budnim, ali bez jamstva)

### Supabase upozorenja koja su namjerna (ne dirati)
Supabase „Advisors” javlja da anon smije zvati SECURITY DEFINER funkcije
(`vodic_gosta`, `raspored_ciscenja`, `javi_ciscenje`, `ostavi_ocjenu`…). To je
namjerno — gost i čistačica rade samo kroz te funkcije s tokenom.

---

## 3. Što je u produkciji (`main`, zadnje spajanje 16. 10. 2026.)

- Naslovnica, prijava/registracija, postavljanje, račun
- Javna stranica `/p/…`: galerija, kalendar, upit, karta, recenzije, 8 stilova,
  6 jezika, „soft touch” (fotografija „diše”, „Slobodno od …”)
- Privatni vodič `/h/…`: šifre zaključane do dolaska (izdaje ih baza), Wi-Fi,
  koraci ulaska sa slikama, parking sa slikom i kartom, preporuke, rad bez
  interneta, primjer `/h/demo`
- Dashboard „Aurex”: gornja traka (traži, obavijesti po prioritetu, postavke),
  Pregled s tablicom objekata i kartom, kapljica za nespremljeno, Osnovno
  zbijeno, 75 sadržaja s ikonama, predlošci pitanja/pravila, kalendar 2
  mjeseca, rezervacije, upiti, iCal uvoz i izvoz, čistačica s javljanjima,
  Objave + „Objavi” i FB grupe, suradnici, prijevodi (i besplatni),
  Preporuči domaćina, kopija i brisanje objekta, HR/EN
- Logo B2, admin panel

## 4. Poznato

- **Mjesta u blizini (OpenStreetMap)** — iz razvojnog okruženja se ne može
  provjeriti; provjerite na produkciji.
- Naslovnica, Pomoć, pravni tekst, admin i raspored za čistačicu su samo na hrvatskom.
- Vercel Hobby: 12/12 funkcija — nova poslužiteljska ruta traži spajanje ili Pro.

## 5. Prijedlozi za dalje

- Doraditi ostale panele po vašim komentarima nakon isprobavanja
- Vodič: isti „soft touch” kao javna stranica
- Upute za ulazak: i PDF kao privitak
- Obavijesti na mobitel (odluke, točka 26)
- Stripe i obrt — kad odlučite
