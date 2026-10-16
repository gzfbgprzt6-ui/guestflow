# Odmoria — MUST DO i stanje (16. 10. 2026.)

Kratko: što je u produkciji, što čeka na grani, što morate napraviti vi i što
ostaje. Stripe i obrt su namjerno izostavljeni (kasnije).

---

## 1. MUST DO — vi, ovim redom

### A. Supabase → SQL editor (svaka datoteka jednom, smiju se ponoviti)

| ✓ | Datoteka | Zašto je bitno |
|---|----------|----------------|
| [ ] | `sql/sections-security.sql` — **KORAK 0** (samo čita) pa **KORAK 1** | 🔴 sigurnost: šifre vrata i Wi-Fi izdaje baza, tek u pravo vrijeme |
| [ ] | `sql/sections-security.sql` — **KORAK 2**, pa **KORAK 4** (provjera) | 🔴 zatvara `sections` i `bookings` za anonimne. Bez ovoga se šifre mogu izvući iz baze |
| [ ] | `sql/add-styles.sql` | stilovi javne stranice se mogu spremiti |
| [ ] | `sql/delete-property.sql` | gumb „Obriši objekt” |
| [ ] | `sql/add-arrival-steps.sql` | „Kako ući, korak po korak” sa slikama |
| [ ] | `sql/add-parking.sql` | **novo** — fotografija i pribadača parkinga |
| [ ] | `sql/add-cleaner-status.sql` | **novo** — čistačica javlja (potvrda, vrijeme, gotovo, ne može) + otkazane/nove rezervacije u obavijestima (nakon `add-cleaner-links.sql`) |
| [ ] | `sql/add-referrals.sql` | **novo** — brojač „Preporuči domaćina” |
| [ ] | `sql/add-translations.sql` | prijevodi (i besplatni „Prevedi besplatno”) |
| [ ] | `sql/add-ical-export.sql` | izvoz kalendara prema Bookingu/Airbnbu |
| [ ] | `sql/add-team-access.sql` | suradnici na objektu |
| [ ] | `sql/add-inquiry-email.sql` (+ Resend ključ u Vaultu) | e-mail vama kad gost pošalje upit |
| [ ] | `sql/add-guest-emails.sql` | automatski e-mail gostu (tek nakon KORAKA 2 i reda iznad) |
| [ ] | `sql/auto-ical-sync.sql` (`<ADRESA>`, `<CRON_SECRET>`) | Booking/Airbnb se sinkroniziraju sami svakih 30 min |

Ne znam koje ste već pokrenuli — ako je datoteka pokrenuta, ponovno
pokretanje ništa ne kvari.

### B. Vercel → Settings → Environment Variables → Redeploy
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — dnevna sinkronizacija, **prijevodi (i besplatni)**
- [ ] `CRON_SECRET` — sinkronizacija svakih 30 min
- [ ] `ANTHROPIC_API_KEY` — **neobavezno**: automatski prijevod (≈ 1–3 centa po objektu, jednokratno). Bez njega domaćin klikne „Prevedi besplatno”

### C. Resend
- [ ] potvrditi domenu (DNS) — bez nje e-mail ide samo na vašu adresu

### C2. Supabase budan (besplatno)
- [ ] nakon spajanja u main: GitHub → Actions → „Supabase budan” → **Run workflow** (jednom, da vidite zeleno)
- [ ] Vercel → Settings → Cron Jobs: `/api/keepalive` je uključen (ako je `CRON_SECRET` postavljen, Vercel ga šalje sam)

### D. Pregledati Preview i reći „pusti u main”
- [ ] https://guestflow-git-claude-funny-archimedes-c0qosu-guestflow4.vercel.app/dashboard.html

### E. Prije pravih korisnika
- [ ] pravni tekst (Uvjeti, Privatnost) — popis u `docs/odluke.md`, točka 8
  (Resend, OpenStreetMap/Photon, Anthropic, Cloudinary; e-mail gosta 30 dana)
- [ ] Supabase Pro kad krenu pravi gosti (Free se pauzira nakon ~7 dana bez
  prometa; dva besplatna budilnika to sprječavaju, ali bez jamstva)

---

## 2. Što je u produkciji (`main`, zadnje spajanje 3. 10. 2026.)

- Naslovnica, prijava/registracija (s „zaboravljena lozinka”), postavljanje, račun
- Javna stranica `/p/…`: galerija, kalendar, upit, karta, recenzije, **8 stilova**, 6 jezika
- Privatni vodič `/h/…`: šifre zaključane do dolaska, Wi-Fi, upute, preporuke, rad bez interneta, primjer `/h/demo`
- Dashboard: objekt, fotografije, kalendar, rezervacije i linkovi, upiti, iCal uvoz i izvoz,
  recenzije, čistačica, eVisitor, analitika, objave i letak, suradnici, prijevodi, HR/EN
- Admin panel

## 3. Na grani — gotovo, čeka vaš „pusti u main”

| Što | Kada |
|-----|------|
| Mobitel: plutajuća donja traka, ikone „Iconly”, podtabovi bez trzanja, prijedlozi adrese ispod polja | 4. 10. |
| Pregled u stilu nekretnine + popravljen prazan „Kako gost vidi” | 4. 10. |
| Izbornik objekta s fotografijama | 4. 10. |
| Isti stil na svim zaslonima domaćina | 4. 10. |
| Kopija objekta i brisanje objekta | 4. 10. |
| Novi kalendar (trake boravaka, boje po izvoru, popunjenost) | 4. 10. |
| **Dashboard „Aurex”**: gornja traka (tabovi, traži, obavijesti 🔔, postavke ⚙, profil), bez bočne trake na računalu | 12. 10. |
| **Pregled**: brojke, „Odakle dolaze noći”, kartice objekata, tablica svih objekata s filtrima, karta | 12. 10. |
| **Nespremljene promjene** = mali balončić („kapljica”) umjesto prozora; brojači i vrsta objekta sad ga ispravno pokreću | 12. 10. |
| **Kako ući, korak po korak**: fotografija + opis po koraku, gost ih vidi u privatnom vodiču i može povećati sliku | 12. 10. |
| **Dorade 16. 10.**: logo B2, Osnovno zbijeno + „Drugo…”, kapacitet s upisom, besplatni prijevod, 75 sadržaja s ikonama, parking sa slikom i pribadačom, predlošci pitanja/pravila, kalendar 2 mjeseca, javljanja čistačice, obavijesti po prioritetu, „Objavi” + FB grupe, Preporuči domaćina | 16. 10. |
| **Supabase budan**: GitHub Actions dvaput dnevno, uz Vercel cron (radi tek s `main`) | 16. 10. |
| **Javna stranica „soft touch”**: naslovna fotografija polako „diše”, znak „Slobodno od …”, kartice i gumbi mekano reagiraju | 12. 10. |

## 4. Što radi samo djelomično / poznato

- **Mjesta u blizini (OpenStreetMap)** — iz razvojnog okruženja se ne može
  provjeriti; provjerite na Previewu.
- **Upute za ulazak** — dok `sql/add-arrival-steps.sql` nije pokrenut, gumb
  „Spremi korake” kaže što pokrenuti; ništa se ne gubi.
- Prijevod koraka ulaska na strane jezike radi tek s `ANTHROPIC_API_KEY`.
- Naslovnica, Pomoć, pravni tekst, admin i raspored za čistačicu su samo na hrvatskom.
- Vercel Hobby: 12/12 funkcija — nova poslužiteljska ruta traži spajanje ili Pro.

## 5. Što ostaje (prijedlozi za dalje)

- Dashboard: doraditi ostale panele u novom stilu (Objekt, Boravci) po vašim komentarima
- Vodič: isti „soft touch” kao javna stranica
- Upute za ulazak: i PDF kao privitak (ako ga domaćin već ima)
- Obavijesti na mobitel (odluke, točka 26)
- Stripe i obrt — kad odlučite
