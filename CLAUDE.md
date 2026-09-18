# Odmoria — Project Briefing for Claude Code

## Što je Odmoria

SaaS za iznajmljivače apartmana i villa na Jadranu. Digitalni gostinski vodič koji zamjenjuje printane upute, WhatsApp poruke i Booking.com ovisnost.

**Core value prop:** Host postavi objekt jednom, dobije dvije stranice:
- **Javna** (`/p/slug` → `p.html`) — marketing, fotografije, dostupnost. Bez šifri. Dijeli svugdje.
- **Privatna** (`/h/token` → `h.html`) — šifra vrata, Wi-Fi, upute. Samo za potvrđene goste (booking token). Vremenski zaključano do dolaska.

**Odmoria ne uzima proviziju.** Host plaća flat SaaS fee, rezervacije i plaćanja dogovara direktno s gostom (nema online plaćanja u aplikaciji).

---

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | Vanilla HTML/CSS/JS po stranici, bez frameworka i bez build stepa |
| Auth | Supabase Auth (email + Google OAuth) |
| Database | Supabase PostgreSQL (RLS enabled na svim tablicama) |
| Fotografije | **Cloudinary** — namjerna odluka (25GB free tier), ne Supabase Storage |
| Hosting | Vercel (Hobby plan), auto-deploy iz GitHub `main` grane |
| Domene | `guestflow-gamma.vercel.app` (Vercel default) + `odmoria.com` (custom domena) |
| Plaćanje | Stripe — cijene u tablici `plans`, **checkout nije spojen** (vidi "Poznati nedostaci") |

**Supabase projekt:**
- URL: `https://wtojzqjhipdfbrnmprmz.supabase.co`
- Publishable/anon key (javan, sigurno za commit): `sb_publishable_tmZAZTDbQ7ktc1N-8y4q4w_ztAu_62F`
- **Rizik:** ovo je Free tier projekt koji se automatski pauzira nakon ~7 dana neaktivnosti (potvrđeno u praksi — cijela app tada baca "Failed to fetch"). Za pouzdan production treba Supabase Pro ili redovito buđenje projekta.

**GitHub repo:** `gzfbgprzt6-ui/guestflow` (public)

---

## Struktura projekta (stvarno stanje u repozitoriju)

```
/
├── index.html              # Landing page — AKTIVNA
├── p.html                  # Javna stranica objekta (?slug=xxx) — AKTIVNA, **v3 dizajn**
├── h.html                  # Privatni gostinski hub (?token=xxx) — AKTIVNA, **v3 dizajn**
├── dashboard.html          # Glavni host dashboard — AKTIVNA, v2 redizajn
├── login.html               register.html            reset-password.html
├── email-confirm.html       onboarding.html          add-property.html
├── account.html              help.html                admin.html (gated: owner auth UID)
├── terms.html                privacy.html             404.html
├── vercel.json              # Rewrites za clean URL-ove + security headeri (NEMA cron konfiguracije)
├── atmosphere.css           # DIJELJENI v3 dizajn sustav (tokeni, scena, gumbi, reveal) — koristi p.html
├── motion.js                # dijeljeni motion sustav (reveal, paralaksa, brojaci, rail)
├── links.js                 # gradnja linkova (/p/, /h/) — NIKAD ne zakucavati domenu, vidi dolje
├── plans.js                 # rezervne vrijednosti + helperi; pravi izvor istine je tablica `plans` u bazi
├── billing.js                # Stripe checkout/portal helperi — NIJE importan ni u jednom HTML-u (mrtav kod dok se ne spoji API)
├── assets/                   # odmoria-dashboard.png
└── sql/
    ├── admin-access.sql                    # RLS politike scope-ane na owner auth UID
    ├── plan-limits.sql                     # tablica `plans` + okidaci koji limite PROVODE u bazi
    ├── add-gap-fill-stays.sql               add-min-gap-stay.sql
    ├── add-booking-id-to-availability.sql
    ├── add-source-to-availability.sql
    └── fix-missing-columns-and-storage.sql # ALTER TABLE dopune (photo_urls, ical_*, beds/bathrooms/size_m2) + storage bucket policy
```

**Napomena:** `api/` folder (Stripe/iCal serverless funkcije) **ne postoji u repozitoriju** — vidi "Poznati nedostaci".

`p.html`, `h.html` i `dashboard.html` dijele isti v2 dizajn token-sustav (vidi "Dizajn sustav"); `index.html` koristi srodnu ali ne identičnu smeđe/kremastu paletu (vlastite hex vrijednosti).

---

## Baza podataka — tablice koje se stvarno koriste u kodu

```sql
plans           -- id (free/pro/business), name, cijene, max_* limiti, can_* zastavice
                   IZVOR ISTINE za limite i cijene. Promjena plana = UPDATE ovdje,
                   bez diranja koda. -1 u bilo kojem max_* znaci neograniceno.
subscriptions   -- user_id, plan (free/pro/business), status, period_end
properties      -- user_id, name, slug, host_name, phone, email, welcome_msg,
                   photo_urls, cover_photo_url, beds, bathrooms, size_m2,
                   ical_booking_url, ical_airbnb_url, ical_last_sync, guest_token (legacy),
                   show_availability, allow_gap_fill_stays, min_gap_stay
sections        -- property_id, wifi_name, wifi_pass, door_code, checkin_time, checkout_time,
                   address, parking_info, checkin_notes, checkout_notes,
                   ac_info, heating_info, hot_water_info, kitchen_info
amenities       -- property_id, icon, name (sadržaji objekta, prikazano na p.html)
local_places    -- property_id, icon, name, category, distance, maps_query
transport       -- property_id, icon, name, info
attractions     -- property_id, icon, name, type, distance, price
house_rules     -- property_id, text
faq             -- property_id, question, answer
availability    -- property_id, date, is_booked, source (manual/ical_booking/ical_airbnb)
bookings        -- property_id, guest_name, guest_note, token (16 znakova), checkin_date,
                   checkout_date, token_expires_at, is_active
page_views      -- property_id, view_type, timestamp
```

Anon (nelogirani) korisnici preko RLS mogu čitati: `properties` (po slugu), `bookings` (samo `is_active=true`, nije isteklo), `sections`/`local_places`/`transport`/`attractions`/`house_rules`/`faq`/`amenities`/`availability` (javno po `property_id`), i smiju `insert` u `page_views`.

`sections.ac_info/heating_info/hot_water_info/kitchen_info` spremaju se iz dashboarda ("Upute za korištenje") i **prikazuju se gostu u `h.html`** (vidi `h.html:431`). U `p.html` ih namjerno nema — javna stranica ne dira `sections`.

---

## Rezervacije (bookings) i iCal sinkronizacija — namjerne funkcionalnosti

Ovo su dizajnirani, core dijelovi proizvoda, ne ostaci:

- **Booking token sustav** je potpuno funkcionalan i radi samo preko baze (bez backend API-ja): host kreira rezervaciju u dashboardu (`sb.from('bookings').insert(...)`), dobiva jedinstveni 16-znakovni token, dijeli `odmoria.com/h/{token}` gostu. `h.html` čita taj token direktno preko Supabase anon key-a, vremenski otključava Wi-Fi/kod vrata.
- **iCal sinkronizacija** (Booking.com/Airbnb) je dizajnirana kao značajka — postoje polja `ical_booking_url`/`ical_airbnb_url`/`ical_last_sync` na `properties`, UI u dashboardu ("Sinkroniziraj odmah") i `source` stupac na `availability` koji razlikuje ručne od uvezenih datuma.
  - **Trenutno stanje:** endpoint koji bi stvarno povlačio iCal feed (`/api/sync-ical`) ne postoji u repozitoriju, niti postoji Vercel Cron konfiguracija — UI poziva funkciju koja bi vratila 404. Namjera i shema su ispravni, backend implementacija nedostaje.

---

## Fotografije — Cloudinary (namjerna odluka)

Upload postoji na tri mjesta i svugdje poštuje limit plana: `dashboard.html` (Fotografije), `onboarding.html` (korak 4) i `add-property.html` (kartica Fotografije). Prva fotografija je uvijek naslovna (`cover_photo_url`). U `add-property.html` objekt još ne postoji dok se forma ne pošalje, pa se URL-ovi skupljaju lokalno i šalju zajedno s `insert`-om.


Upload fotografija ide direktno s klijenta na Cloudinary (unsigned upload preset), ne kroz Supabase Storage — svjesna odluka radi 25GB free storage/prometa:

```js
const CLOUDINARY_CLOUD='sck9mbg9'
const CLOUDINARY_PRESET='odmoria_photos'
// POST https://api.cloudinary.com/v1_1/{CLOUDINARY_CLOUD}/image/upload
```

URL-ovi vraćenih fotografija spremaju se u `properties.photo_urls` (jsonb) i `properties.cover_photo_url`. `sql/fix-missing-columns-and-storage.sql` još sadrži i Supabase Storage bucket politiku iz starijeg pristupa — nije više u aktivnoj upotrebi za nove uploade, ali nije štetno da ostane.

---

## Planovi i limiti

| Plan | Objekti | Fotografije | Cijena |
|------|---------|-------------|--------|
| Free | 1 | 5 | €0 zauvijek |
| Pro | 5 | 30 | €15/mj ili €150/god |
| Business | 15 | 50 | €49/mj ili €490/god |

**Kako limiti rade (od rujna 2026.):**

- Stvarni izvor istine je tablica **`plans` u Supabaseu**, ne kod. Promjena limita ili cijene je `UPDATE public.plans ...` — bez izmjene koda i bez deploya.
- `plans.js` drži iste vrijednosti kao **rezervu** i puni se iz baze pozivom `loadPlans(sb)` pri pokretanju stranice. Ako je Supabase nedostupan, stranica radi s rezervnim vrijednostima.
- Limite **provodi baza** okidačima (`sql/plan-limits.sql`): broj objekata, fotografija po objektu, preporuka, prijevoza, atrakcija, pravila i pitanja. Provjere u pregledniku postoje samo da korisnik dobije lijepu poruku — nisu sigurnosna granica.
- Istek plana je na jednom mjestu: `effectivePlanId(sub)` u `plans.js` i `current_plan_id(uid)` u bazi. Istekao plan koji nije `free` pada na `free`.
- `plans.js` uvezen je u `dashboard.html`, `add-property.html`, `account.html` i `admin.html`. **Nikad ne zakucavati limite u HTML** — to su prije bile četiri razilazeće kopije.

Tablica cijena gore je početno stanje u bazi; planovi i cijene još nisu konačni.

---

## Dizajn sustav v3 (p.html + v3/ mockupi)

**Dijeljeni:** `atmosphere.css` i `motion.js` u korijenu. Ovo je **svjesno odstupanje** od pravila „svaki HTML je self-contained" — tri stranice dijele isti sustav pa bi kopiranje 300 linija CSS-a u svaku značilo tri kopije koje se razilaze, točno onaj problem koji smo imali s limitima plana.

**Fontovi:** Fraunces (naslovi, varijabilne osi SOFT/WONK) + Manrope (sučelje) + Caveat (rukopisni akcenti).

**Tokeni:** `--cream:#FAF6EF --sand:#F1E7D7 --shell:#FFFCF7 --night:#14202E --terra:#D4674A --sun:#E9A13B --sea:#2E6B77 --olive:#7E8F6A`

**Zaglavlje:** rotira do 3 fotografije iz `photo_urls` (naslovna je `cover_photo_url`). Ako fotografija nema, vrti tri nacrtana prizora (`.art--zalazak`, `.art--plava`, `.art--maslinik`) — sve CSS i SVG, bez vanjskih datoteka.

**Ritam stranice** je namjeran i tamne plohe se izmjenjuju sa svijetlima: zaglavlje (tamno) → traka s činjenicama → pismo/činjenice/galerija (svijetlo) → puna foto traka (tamno) → karta (svijetlo) → sadržaji i „dobro je znati" (tamno) → kalendar (svijetlo) → upit domaćinu (tamna kartica) → preporuke i ostalo (svijetlo). **Ne slagati dvije tamne sekcije jednu do druge.**

**Stranica mora izgledati puno i kad host ima malo sadržaja.** Bez fotografija idu nacrtani prizori i prazna mjesta u galeriji; s jednom fotografijom puna traka uzima nacrtani prizor umjesto da se preskoči.

---

## Dizajn sustav (v2 — dashboard.html)

**Fontovi:** DM Serif Display (naslovi) + Manrope 400–800 (sučelje).

**Paleta (canonical `:root` tokeni, dijeljeni kroz dashboard/p/h):**
```css
--cream:#f5f1eb; --paper:#fffdf9; --paper-2:#ede5dc;
--ink:#21150f; --muted:#786a60;
--brown:#5b321f; --brown-deep:#432316; --brown-soft:#76442f; --copper:#b7603b; --peach:#e7b69c;
--green:#3e6954; --green-bg:#e4eee8; --border:#dfd5ca;
```

**Uzorci:** numerirane/kicker "page-section" kartice, chip-red liste (male bordered kartice po stavci), tamni "spotlight" blokovi (`--brown-deep`) za Wi-Fi/kontakt podatke, tamni hero na p.html i h.html.

`index.html` koristi vlastitu, srodnu ali ne bit-identičnu smeđe/kremastu paletu (`--cream:#F7F5F1`, `--brown:#5A3323` itd.) — nije nasljedio v2 token set 1:1.

---

## Linkovi — nikad zakucana domena

Svi linkovi koje korisnik kopira ili dijeli grade se preko `links.js` (`publicUrl`, `bookingUrl`, `legacyGuestUrl`, `prettyUrl`). Adresa se uzima iz `location.origin`, pa link uvijek pokazuje na domenu s koje je kopiran — Vercel danas, vlastita domena čim se spoji, bez izmjene koda.

Prije toga je `odmoria.com` bio zakucan na šest mjesta u `dashboard.html`, `onboarding.html` i `add-property.html` (kopiranje javnog i gostinskog linka, link nove rezervacije, QR kod, popis rezervacija). Kako ta domena još nije spojena, **svaki takav link vodio je u prazno** — uključujući onaj koji host šalje gostu.

Ako ikad zatreba da linkovi uvijek pokazuju na jednu domenu bez obzira odakle su kopirani, upiše se u `SITE_URL` u `links.js`. Prazno znači „koristi trenutnu".

**Nikad ne zakucavati domenu u HTML.**

---

## Sigurnost — važno

- `p.html` **nikad** ne čita `sections` tablicu — `door_code` i `wifi_pass` su isključivo na `h.html`.
- `h.html` ima `<meta name="robots" content="noindex,nofollow">`.
- Wi-Fi i kod vrata prikazuju se tek unutar prozora `[checkin_time - 1h, checkout 23:59]` (vremensko zaključavanje), uz `setInterval` koji auto-otključa kad prozor otvori. **Prije otključavanja te vrijednosti uopće ne ulaze u HTML** — ne postoje ni u skrivenom elementu ni u `window.__VALS`, pa se ne mogu izvući iz izvornog koda stranice. Ovo je testirano i mora ostati tako.
- Postoji i stariji fallback (`slug` + `properties.guest_token`) koji **odmah** otključava bez vremenskog ograničenja — legacy put, ne koristi se za nove rezervacije.
- Booking token se deaktivira ručno (`is_active=false`) ili istječe (`token_expires_at`).
- Nema service role ključa u klijentskom kodu — sve stranice koriste samo publishable/anon key.
- Admin panel (`admin.html`) je ispravno zaštićen i na RLS razini (`sql/admin-access.sql`, politike scope-ane na `auth.uid()` vlasnikovog računa), ne samo klijentskom provjerom.

---

## Poznati nedostaci (stanje repozitorija, ne backlog-želje)

- **Stripe checkout nije spojen.** Gumbi za nadogradnju u dashboardu su statični (`toast(...)`), ne pozivaju `billing.js`. `billing.js` uopće nije importan ni u jednom HTML-u.
- **`/api` folder ne postoji** — ni Stripe (`create-checkout-session`, `create-portal-session`, `stripe-webhook`), ni `sync-ical`, ni `track-event` serverless funkcije nisu u repozitoriju. `page_views` insert ide direktno s klijenta preko Supabase (`sb.from('page_views').insert(...)`), pa analytics tracking radi neovisno o `track-event.js`.
- **iCal sinkronizacija nema backend** (vidi gore) — UI postoji, endpoint ne.
- **`dashboard.html` i `index.html` još su na starom dizajnu.** `p.html` i `h.html` su preneseni na v3. Mockupi `v3/dashboard.html` i `v3/index.html` služe kao predložak i brišu se čim se prenesu; `v3/guest.html` više ne treba.
- **v3 mockupi nemaju fotografija.** Zaglavlje vrti tri nacrtana prizora (`.art--zalazak`, `.art--plava`, `.art--maslinik` u `v3/atmosphere.css`) — sve je CSS i SVG, nijedna vanjska slika, pa nema pitanja licence. Isti sloj kasnije preuzima prava fotografija iz `photo_urls`, bez diranja ostatka stranice. Galerija prikazuje prazna mjesta — točno ono što vidi host koji još nije dodao fotografije.
- **Nema višejezičnosti.** `plans.maxLanguages` postoji, ali u kodu nema nijednog prijevoda ni prebacivanja jezika.

---

## Git / deploy pravila — obavezno slijediti

- **Pitaj prije svake izmjene** koja ide dalje od lokalnog rada.
- Svaka promjena prvo ide na **novu feature granu**, nikad direktno na `main`.
- Nakon pusha na feature granu, javi **Vercel Preview URL** i pričekaj da korisnik vizualno provjeri.
- **Merge u `main` (produkcija) samo na eksplicitnu, svježu potvrdu** za tu konkretnu promjenu — prijašnje odobrenje ne vrijedi automatski za sljedeću izmjenu.
- Nikad ne mijenjati Supabase ključeve, RLS politike ni konfiguraciju bez izričitog dogovora.
- Nikad ne izmišljati nove SQL stupce/tablice — provjeriti stvarnu shemu prije pisanja koda koji na nju pretpostavlja.
- `p.html` ne smije nikad dohvaćati ni prikazivati `wifi_pass` ili `door_code`.

---

## Konvencije

- Svaki HTML fajl je self-contained (CSS + JS inline), bez build koraka.
- Supabase client: `createClient(...)` iz `https://esm.sh/@supabase/supabase-js@2` (ESM import), `type="module"` skripte.
- `vercel.json` definira rewrites za clean URL-ove (`/p/:slug`, `/h/:token`, `/dashboard`, itd.) i security headere (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) — nema `crons` ključa.

---

*Ažurirano prema stvarnom stanju repozitorija. Ne sadrži tajne ključeve — samo javni Supabase publishable key.*
