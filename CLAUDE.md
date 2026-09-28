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
- **Rizik (ublažen):** ovo je Free tier projekt koji se automatski pauzira nakon ~7 dana neaktivnosti (potvrđeno u praksi — cijela app tada baca "Failed to fetch"). `api/keepalive.js` se preko Vercel Crona pokreće **jednom dnevno** i radi jedan trivijalan read, što drži projekt budnim. Ako se cron ugasi ili Vercel preskoči izvršavanje nekoliko dana zaredom, problem se vraća — za pravi production i dalje treba Supabase Pro.

**GitHub repo:** `gzfbgprzt6-ui/guestflow` (public)

---

## Struktura projekta (stvarno stanje u repozitoriju)

```
/
├── index.html              # Landing page — AKTIVNA, **redizajn v2 iz Figme** (`odmoria.css`), bez konfiguratora
├── p.html                  # Javna stranica objekta (?slug=xxx) — AKTIVNA, **redizajn v2 iz Figme** (`odmoria.css`), teme se NE primjenjuju
├── h.html                  # Privatni gostinski hub (?token=xxx) — AKTIVNA, **redizajn v2** (`odmoria.css`), podstranice preko #adrese
├── dashboard.html          # Glavni host dashboard — AKTIVNA, **redizajn v2** (vlastiti CSS, ista imena tokena), navigacija po grupama
├── login.html               register.html            reset-password.html
├── email-confirm.html       onboarding.html          add-property.html
├── account.html              help.html                admin.html (gated: owner auth UID)
├── terms.html                privacy.html             404.html
├── vercel.json              # Rewrites za clean URL-ove, security headeri + dnevni cron za keepalive
├── odmoria.css              # v2 dizajn sustav (Figma „Odmoria / Product Design / v2”) — sve žive stranice osim dashboarda
├── auth.css                 # raspored četiri stranice prijave (login, register, reset-password, email-confirm)
├── forms.css                # obrasci za onboarding, add-property i account (ista imena razreda kao prije)
├── tekst.css                # tekstualne stranice: help, terms, privacy (za njih nema Figme)
├── teme.css                 # OSAM TEMA javne stranice — danas samo panel „Izgled” u dashboardu (p.html v2 ih ne primjenjuje); ostaje za teme na v2
├── teme.js                  # rasporedi zaglavlja, `izBaze(prop)` i zajednički birač tema
├── analitika.js             # izračuni i grafikoni analitike (boravci, popunjenost, praznine, pregledi) — dijele ga dashboard i admin
├── analitika.css            # pločice, stupčasti grafikoni (HTML, ne SVG), popisi, tablice analitike
├── links.js                 # gradnja linkova (/p/, /h/) — NIKAD ne zakucavati domenu, vidi dolje
├── plans.js                 # rezervne vrijednosti + helperi; pravi izvor istine je tablica `plans` u bazi
├── billing.js                # Stripe checkout/portal helperi — NIJE importan ni u jednom HTML-u (mrtav kod dok se ne spoji API)
├── assets/                   # landing/villa-1600.jpg i villa-900.jpg (naslovnica i prijava)
├── docs/napredak.md          # što je u redizajnu gotovo, a što nije — pregled za vlasnika
├── docs/odluke.md            # SVE odluke koje čekaju vlasnika (planovi, faze A/B/C, naslovnica) — čitati prije prijenosa sljedeće stranice
├── api/
│   ├── keepalive.js          # Vercel Cron, jednom dnevno — sprječava pauziranje Supabase Free projekta
│   ├── sync-ical.js          # povlači zauzete termine s Booking.com-a i Airbnb-a
│   ├── test-calendar.js      # testni iCal feed za isprobavanje sinkronizacije bez računa na Bookingu/Airbnbu
│   └── track.js              # upis pregleda s državom (x-vercel-ip-country), bez IP adrese
└── sql/
    ├── admin-access.sql                    # RLS politike scope-ane na owner auth UID
    ├── plan-limits.sql                     # tablica `plans` + okidaci koji limite PROVODE u bazi
    ├── add-gap-fill-stays.sql               add-min-gap-stay.sql
    ├── add-booking-id-to-availability.sql
    ├── add-source-to-availability.sql
    ├── add-theme-to-properties.sql      # properties.theme → ime teme, properties.highlight
    ├── sections-security.sql            # funkcija vodic_gosta + zatvaranje sections/bookings (KORACI 0–4, redom!)
    ├── add-country-to-page-views.sql    # page_views.country + indeks
    ├── add-inquiries.sql                # tablica inquiries (upiti gostiju): gost samo insert, vlasnik čita, 20/sat
    └── fix-missing-columns-and-storage.sql # ALTER TABLE dopune (photo_urls, ical_*, beds/bathrooms/size_m2) + storage bucket policy
```

**Napomena:** `api/` sadrži samo `keepalive.js`, `sync-ical.js`, `test-calendar.js` i `track.js`. Stripe serverless funkcije (`create-checkout-session`, `create-portal-session`, `stripe-webhook`) **ne postoje** — vidi "Poznati nedostaci".

Obje funkcije su namjerno **bez ijedne npm ovisnosti** — projekt nema build korak ni `package.json`, pa se Supabase zove izravno preko REST API-ja (`fetch`), a iCal se parsira ručno. CommonJS (`module.exports`), jer bez `package.json` Vercel `.js` u `api/` tretira kao CJS.

**Mockupi više ne postoje.** Mapa `v3/` i stari `*-v2.html` obrisani su kad su sve četiri prave stranice prešle na v3 — nema više `/v3/` na domeni ni dvije adrese za isto.

Sve žive stranice su na `odmoria.css` (vidi „Redizajn v2”). Jedino `dashboard.html` ima vlastiti potpun CSS s v2 vrijednostima u svojim starim imenima tokena (vidi "Dashboard — v2 preko istih imena tokena").

---

## Obrisano pri čišćenju (rujan 2026.)

Kad su sve žive stranice prešle na `odmoria.css`, obrisano je ono što više
nitko nije učitavao: **`atmosphere.css`, `motion.js`, `ui.css`** (stari v3
sustav), cijela mapa **`preview/`** (devet stranica prijedloga iz v3 +
`scene.js`), `assets/odmoria-dashboard.png` te `/preview` rute i zaglavlje u
`vercel.json`. Sve je u povijesti gita (zadnje stanje s njima: commit
`70d0552`), pa se prijedlog može otvoriti i kasnije.

Iz prijedloga **nije preneseno** (i dalje su samo ideje, popisane u
`docs/odluke.md`): cijene Domaćin 7,90 € / Pro 14,90 € / Partner 29,90 €,
tamna tema vodiča, zaslon „Prvi dan”, zaslon „Kad nešto ne radi”, podsjetnik
gostu na njegovom jeziku, grafikoni analitike i analitika po državama.

**Ostaju `teme.css` i `teme.js`** — vlasnik želi teme vratiti kasnije kao
mogućnost za one koji plaćaju (vidi niže i `docs/odluke.md`, točka 9).

---

## Teme javne stranice — čuvaju se za kasnije

> **Od redizajna v2 (28. 9. 2026.) `p.html` teme NE primjenjuje** — učitava
> samo `odmoria.css`, a `teme.css`/`teme.js` više ne. Panel „Izgled stranice” u
> dashboardu i dalje sprema temu u bazu i nosi napomenu „Uskoro”. **Vlasnik
> želi teme vratiti kasnije, kao veći izbor za one koji plaćaju** — plan je u
> `docs/odluke.md`, točka 9. Opis dolje vrijedi za stari v3 `p.html` iz
> povijesti gita; teme su pisane na tokenima obrisanog `atmosphere.css`, pa ih
> za v2 treba ponovno prenijeti.

Tema **ne mijenja samo boju**. Svaka drugačije slaže zaglavlje i vodi s drugom
informacijom — to je bit, ostalo je posljedica:

| Tema | Vodi s | Pismo |
|------|--------|-------|
| Jadran *(zadana)* | imenom objekta | Fraunces + Manrope |
| Laguna | temperaturom bazena (32°) | Jost |
| Zlatni sat | cijenom, na 12,5 rem | Bodoni Moda + Jost |
| Terakota | numeriranim popisom prostorija | Cormorant + Manrope |
| Beton | tablicom podataka, nula radijusa | Archivo Black + Space Grotesk |
| Riviera ’70 | imenom kao plakatom | Playfair Display + Syne |
| Ponoćni bazen | samom slikom, najmanje teksta | Space Grotesk |
| Borova šuma | pismom domaćice | Spectral |

`teme.css` i `teme.js` stoje u korijenu; danas ih učitava samo `dashboard.html`.

**Gdje se bira:** panel **Izgled stranice** u pravom `dashboard.html`
(grupa Objekt, podtab Izgled). Vrti **jednu** izvedbu —
`Odmoria.teme.birac()` iz `teme.js`. Dvije kopije te logike razišle bi se,
kao nekad kopije limita plana.

**Podaci dolaze iz baze,** ne iz koda: `izBaze(prop)` preslika red iz
`properties` u oblik koji rasporedi čitaju. Svako polje ima zamjenu — tema koja
vodi cijenom bez `price_per_night` vodi imenom, tema koja vodi popisom
prostorija izvede ga iz `bedrooms`/`bathrooms`/`size_m2`. **Nijedna ne ostane
prazna**, jer domaćin ne mora ispuniti sve.

**Fotografije imaju prednost pred nacrtanim prizorom** u svakoj temi koja ima
pozadinu, i izmjenjuju se istim ritmom (7 s) kao rotator u `p.html`. Terakota
ih stavlja u luk, Riviera u krug. Beton je namjerno bez fotografije — to je
tema koja vodi tablicom.

**Zadana tema „Jadran” NE dira `p.html`.** `primijeniTemu()` na njoj zove stari
`buildHero()` i stranica ostaje piksel u piksel ista kao dosad, s rotatorom i
`.phnav` trakom. Svaka druga tema zamijeni cijeli `<header>`. Zato zamjena mora
sačuvati značku `.mark`, a `buildChips()` mora podnijeti da `#hero-chips` više
ne postoji.

**Stupci** (`sql/add-theme-to-properties.sql`): `properties.highlight` je nov,
a **`properties.theme` je već postojao** — svih 8 objekata imalo je
`Beach & Sea`, ostatak starijeg koncepta tema koji nijedan `.sql` ne stvara i
nijedan kod više ne čita ni ne upisuje. Migracija ga **preslikava** u `jadran`
(konceptualno ista stvar), ne briše, pa se javna stranica ne mijenja ni za
jedan piksel — provjereno: `Beach & Sea` i `jadran` daju identično zaglavlje.
Migracija prvo skida DEFAULT sa stupca, inače bi novi objekt opet dobio staru
vrijednost i pao na CHECK-u.

Dok se migracija ne pokrene, sve radi — vrijedi „Jadran”, a `?stil=` u adresi
pokazuje svih osam. **Spremanje odbija upisati temu ako u stupcu stoji nešto
što nije ime teme** (`smijePisati()` u `teme.js`) — istaknuta brojka se svejedno
spremi, a panel kaže zašto tema nije. Bez toga bi jedan klik pojeo tuđi podatak.
Ime stupca je jedna konstanta `STUPAC` u `teme.js`.

**`teme.css` je samodostatan.** `dashboard.html` namjerno ne učitava
`atmosphere.css`, pa `.tema-okruzje` nosi osnovne tokene i `.th .btn` gumbe.
Taj razred mora biti **predak** elementa s `data-stil`, nikad isti element:
izravno pravilo pobjeđuje naslijeđenu vrijednost, pa bi tema inače izgubila.

**Kako se pali:** atribut `data-stil`. Na `<html>` prebojava cijelu stranicu
(stari `p.html?stil=laguna`), a na bilo kojem omotaču samo ono unutar
njega — zato birač pokazuje temu uživo, a sučelje oko njega ostaje u
Odmorijinim bojama. Bez atributa vrijedi „Jadran”, tj. čisti `atmosphere.css`.

**Minijature u biraču nisu slike.** Isti su HTML i CSS kao prava stranica, samo
s `--hs:.30`. Sve mjere u `.th--*` idu kroz `--hs`, pa isti raspored služi i
zaglavlju i minijaturi.

Tri stvari koje je lako pokvariti:

1. **Gumbi ne znaju za `--hs`** — dolaze iz `atmosphere.css` s fiksnim `padding`
   i `min-height`, pa su u minijaturi ispadali u punoj veličini i razbijali
   kartice. Zato `.th .btn` množi te iste vrijednosti s `--hs` (pri `--hs:1`
   rezultat je identičan izvornome).
2. **Radijus minijature mora biti broj, ne `--r-sm`** — u temi Riviera taj
   token je 999px, pa je kartica ispadala kao elipsa.
3. **Tokeni koje teme pomiču moraju biti u `teme.css`, prije tema** — bili su u
   `<style>` same stranice, dolazili kasnije u dokumentu i pri istoj
   specifičnosti nadjačavali temu. Kalendar je zato u tamnim temama ostajao
   svijetao (1,95:1).

**Kontrast je mjeren, ne procijenjen.** Svaka tema ima vlastiti `--terra-ink`
(tekst) i `--terra-d` (pune plohe) izmjeren na **vlastitoj** podlozi, jer
vrijednosti iz `ui.css` vrijede samo za kremu. Najniži omjer je 4,54:1.

Zaglavlje se ne može mjeriti obilaskom roditelja: tekst stoji nad velom koji je
**susjed, a ne predak**, pa CSS kaže „bijelo na kremi” (1,08:1) iako je stvarno
6:1. Mjeri se pikselima — snimi se isječak s tekstom i bez njega, maska slova
je razlika, podloga su ti isti pikseli iz druge snimke. Pritom se **moraju
isključiti prijelazi** (`transition:none`), inače druga snimka uhvati tekst
nasred `transition:color .3s` i podloga ispadne tamnija nego što jest — to je
lažno prijavilo četiri gumba. Provjereno: 95 tekstova u osam zaglavlja prolazi,
i 24 kombinacije teme × širine (1440/834/390) bez prelijevanja i bez greške.

### Analitika po državama — traži izmjenu sheme

Stari prijedlog dashboarda imao je panel „Iz kojih država dolaze”, ali **to nije
moguće s postojećom bazom**. `page_views` ima samo `id`, `property_id`,
`view_type` i `timestamp`, a upis ide **izravno iz preglednika** (`p.html`,
`h.html`) u Supabase — nema poslužiteljskog koraka pa IP nitko ne vidi.

Da proradi, treba oboje:

```sql
alter table page_views
  add column country text,   -- ISO dvoslovno, iz x-vercel-ip-country
  add column lang    text;   -- navigator.language
```

i mali `api/track.js` koji pročita zaglavlje `x-vercel-ip-country` (Vercel ga
daje besplatno na svakom serverless pozivu) pa upiše red umjesto klijenta.
Jezik preglednika može se skupljati i bez tog koraka, samo uz novi stupac.

### Analitika domaćina i admin (rujan 2026.)

Sve na **postojećim tablicama** — nijedan novi stupac. Izračuni su u
`analitika.js` (čiste funkcije: `boravci()`, `popunjenost()`, `praznine()`,
`nociPoIzvoru()`, `dogadjaji()`, `boravciBezLinka()`, `kante()`, `broji()`,
`sviRedovi()`), prikaz u `analitika.css`. Dijele ih `dashboard.html` i
`admin.html` — **jedna kopija logike**, kao `plans.js`.

**Mjerenje** (`p.html`, `h.html`, funkcija `biljezi(vrsta)`): pregled,
upit (klik na `wa.me` / `mailto:` / „Kopiraj poruku”), karta i dio vodiča
upisuju se u `page_views.view_type`, **svaka vrsta jednom po otvaranju**.
`?domacin=1` (dodaju ga `viewPub()`/`viewGuest()` u dashboardu, pregled u
onboardingu i poveznice u adminu) isključuje bilježenje — domaćin ne smije
napuhati vlastitu statistiku. `biljezi` i njegove konstante stoje **uz `let
PROP`**, iznad prvog poziva (vidi zamku sa `STATES`).

**Boravci** se slažu iz `availability`: uzastopne noći istog izvora i iste
rezervacije (`booking_id`) = jedan boravak. Rezervacija bez noći u kalendaru
dodaje se kao `bezKalendara` (vidi se u dolascima, ne ulazi u popunjenost);
rezervacija koja se preklapa s boravkom s Bookinga/Airbnba samo mu da ime
gosta. Popunjenost čita **samo kalendar**. `loadAvail()` zato čita
`select('*')` i puni `AVAIL_ROWS` (s `booking_id` ako stupac postoji).

**Dashboard:** Pregled (brojke, „Na što obratiti pažnju” s radnjama,
„Sljedećih 14 dana”) i novi podtab **Analitika** u grupi Pregled
(`nav('analytics')`, `renderAnalytics()`). Pregledi se dohvaćaju za 2 × raspon
(zbog usporedbe) i pamte po objektu u `AN`.

**Admin** (`admin.html`, 7 tabova): Pregled, Domaćini, Objekti, Korištenje,
Prihod, Poruke, Sustav. Na `odmoria.css` + `analitika.css` + vlastiti
`<style>`. Učitava `properties` (bez tajnih stupaca), `subscriptions`,
`bookings` i `page_views` zadnjih 90 dana (do 100.000 redova, po 1000 —
Supabase više ne vraća odjednom); dulji raspon u Korištenju povuče se tek na
klik. **Admin namjerno ne čita `sections`** (šifre). Promjena plana i isteka
ide kroz `spremiPretplatu()` s `.select()` — ako nema reda u `subscriptions`,
update prođe bez greške i bez učinka, pa se to javlja. E-mail domaćina je
kontakt iz objekta, ne adresa računa (`auth.users` nije čitljiv).
**Cijene i planovi uvijek iz `plans`** — preview-ove četiri cijene nisu preuzete.

### Upiti gostiju i rezervacije (rujan 2026.)

- **Upit** (`p.html`, `posaljiUpit()`): gost nakon odabira termina upiše ime i
  e-mail/telefon; upis ide izravno u `inquiries` (anon smije samo `insert`).
  Skriveno polje `web` hvata botove. Kanal u analitici: `inquiry_form`.
- **Dashboard → Boravci → Upiti** (`ucitajUpite()`, `renderUpiti()`,
  `prihvatiUpit()`): „Prihvati i napravi link” zove **`napraviRezervaciju()`**
  — istu funkciju koju koristi obrazac rezervacije (rezervacija + zauzete
  noći s `booking_id` + `token_expires_at` = dan nakon odlaska). Nikad dvije
  kopije te logike. Poruka gostu: `porukaGostu()`, broj za wa.me: `waBroj()`.
- Nove upite broji `osvjeziBrojUpita()` (značke `[data-iq-count]`, naslov
  kartice); provjera svaku minutu dok je kartica vidljiva.
- **`.nav-count` ima `display:inline-grid` pa treba `.nav-count[hidden]{display:none}`**
  — inače atribut `hidden` ne skriva značku i pokaže se „0”.
- **Traka za spremanje:** `DIRTY` + `pitajPrijeOdlaska()`; `nav()` i
  `onPropChange()` pitaju prije odlaska, `beforeunload` upozori. Svaki gumb
  čiji `onclick` počinje sa `save` gasi stanje. Pazi: `change` na polju okida
  se tek na blur, dakle pri kliku na navigaciju — testovi prvo `blur()`.

### Pokret (animacije)

Suptilno i samo pod `prefers-reduced-motion: no-preference`. Otkrivanje pri
listanju je **`animation-timeline: view()`** unutar `@supports` na
`.sec > .wrap > *` (odmoria.css) — ne IntersectionObserver, pa ništa ne može
ostati nevidljivo. Posljedica: na snimci cijele stranice (Playwright
`fullPage`) elementi ispod prvog zaslona su prozirni — za snimke koristiti
`reducedMotion: 'reduce'`. Brojke u pločicama broji `A.odbroji(el)`.

### Zamke koje su se već dogodile

- **`.sr-only` (position:absolute) u tablici koja se vodoravno pomiče rastegne
  cijelu stranicu** — apsolutni element se računa prema dokumentu, ne prema
  omotaču. Omotač tablice (`.tblwrap`, `.an-tblwrap`) zato ima
  `position:relative`. Na mobitelu je admin zbog toga imao 1071 px širine.
- **Grid dijete s tablicom treba `min-width:0`** — inače široka tablica
  rastegne cijeli stupac (dogodilo se u prozoru s detaljima domaćina).
- **Svaki IIFE na kraju datoteke počinje s `;`.** Bez njega se `})()` prethodnog
  bloka i `(` sljedećeg spoje u poziv, blok tiho ne krene, a `node --check` to ne
  vidi. Dogodilo se dvaput.
- **`<dialog>` mora stajati u DOM-u prije skripti koje ga traže.** Ako je ispod
  `<script>`, `getElementById` vraća `null`.
- **`add column if not exists` tiho preskoči stupac koji već postoji**, pa
  `CHECK` odmah padne na zatečenim redovima. Tako se otkrilo da `properties.theme`
  postoji od ranije. Prije nego se stupac preuzme, provjeriti što je u njemu
  (`select theme, count(*) ... group by 1`) i ima li DEFAULT — i pisanje u njega
  zaštititi, da jedan klik ne pojede tuđi podatak.
- **Dva elementa s istim `id`-em tiho pokvare drugi.** U dashboardu su obje trake
  za prebacivanje plana (Pregled i Analitika) nosile `id="planbar"`, a
  `getElementById` veže samo prvu — traka u Analitici nije radila. Sada je
  `[data-planbar]` i obje se drže usklađene.
- **Figma `node.query()` puca na ne-ASCII znakove i razmake u selektoru.**
  `[name=red-Klima uređaj]` baca `Invalid selector`. Imena nodova koje se
  dohvaćaju moraju biti ASCII bez razmaka (`red-klima`).
- **Pali `use_figma` poziv povuče se u cijelosti** — ništa ne ostane na canvasu,
  pa se smije jednostavno ponoviti ispravljen.

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
inquiries       -- property_id, guest_name, guest_email, guest_phone, checkin_date, checkout_date, guests,
                   message, status (novi/prihvacen/odbijen), booking_id, created_at (sql/add-inquiries.sql)
page_views      -- property_id, view_type, timestamp, country (ISO, iz /api/track; stupac iz sql/add-country-to-page-views.sql). view_type: public, guest_hub, inquiry_whatsapp,
                   inquiry_email, inquiry_copy, map, guide:<dolazak|kuca|preporuke|domacin>
```

Anon (nelogirani) korisnici preko RLS mogu čitati: `properties` (po slugu), `bookings` (samo `is_active=true`, nije isteklo), `sections`/`local_places`/`transport`/`attractions`/`house_rules`/`faq`/`amenities`/`availability` (javno po `property_id`), i smiju `insert` u `page_views`.

`sections.ac_info/heating_info/hot_water_info/kitchen_info` spremaju se iz dashboarda ("Upute za korištenje") i **prikazuju se gostu u `h.html`** (`renderHouse()` u `h.html`, zaslon „Wi-Fi i kuća”). U `p.html` ih namjerno nema — javna stranica ne dira `sections`.

---

## Rezervacije (bookings) i iCal sinkronizacija — namjerne funkcionalnosti

Ovo su dizajnirani, core dijelovi proizvoda, ne ostaci:

- **Booking token sustav** je potpuno funkcionalan i radi samo preko baze (bez backend API-ja): host kreira rezervaciju u dashboardu (`sb.from('bookings').insert(...)`), dobiva jedinstveni 16-znakovni token, dijeli `odmoria.com/h/{token}` gostu. `h.html` čita taj token direktno preko Supabase anon key-a, vremenski otključava Wi-Fi/kod vrata.
- **iCal sinkronizacija** (Booking.com/Airbnb) je dizajnirana kao značajka — postoje polja `ical_booking_url`/`ical_airbnb_url`/`ical_last_sync` na `properties`, UI u dashboardu ("Sinkroniziraj odmah") i `source` stupac na `availability` koji razlikuje ručne od uvezenih datuma.
  - **Backend postoji** (`api/sync-ical.js`). Radi s **korisnikovim access tokenom**, ne sa service role ključem — RLS i dalje odlučuje što se smije pročitati i upisati, pa korisnik može sinkronizirati samo vlastiti objekt.
  - Tri stvari koje je lako pokvariti pri izmjeni:
    1. **`DTEND` je u iCal-u ekskluzivan.** Boravak 12.–19. znači noći 12…18; 19. mora ostati slobodan za sljedećeg gosta. Ovo je najčešći izvor „fantomski zauzetog" dana.
    2. **Brisanje je scope-ano po izvoru** (`source=eq.ical_booking`). Nikad ne brisati cijelu `availability` za objekt — ručno blokirani dani (`source='manual'`) i dani vezani uz rezervacije (`booking_id`) moraju preživjeti sinkronizaciju.
    3. **URL upisuje korisnik**, pa `safeUrl()` odbija `localhost`, privatne IP raspone i ne-HTTP sheme. Bez toga ruta postaje proxy prema internoj mreži. (Ne pokriva DNS rebinding.)
  - Sinkronizacija je **ručna** (gumb u dashboardu). Automatsko periodično povlačenje ne postoji — Vercel Hobby dopušta samo jedan cron dnevno, a taj je zauzet za `keepalive`.
  - `api/test-calendar.js` služi za isprobavanje bez računa na Bookingu/Airbnbu. Datumi se **računaju od danas** (dolazak za 10 i za 24 dana), pa test ne zastarijeva. Sadrži i jedan `STATUS:CANCELLED` događaj koji se **ne smije** upisati — ako se pojavi u kalendaru, filtriranje otkazanih je puklo. Očekivani rezultat je točno **12 noći**.
  - Prije javnog lansiranja odlučiti ostaje li gumb „Popuni testnim kalendarom" u dashboardu — koristan je dok se proizvod isprobava, ali pravom domaćinu ne treba.

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

## Dizajn sustav v3 — obrisan

Stari sustav (`atmosphere.css`, `motion.js`, `ui.css`; Fraunces + Manrope +
Caveat, krema/terakota/more) obrisan je u rujnu 2026. Njegovi tokeni žive još
samo kao osnova u `teme.css` (`.tema-okruzje`). Jedno pravilo iz v3 vrijedi i
dalje: **stranica mora izgledati puno i kad domaćin ima malo sadržaja.**

---

## Pristupačnost — poznato

**Riješeno u redizajnu v2:** dashboardov `--muted` je sada `#536D77` (5,6:1 na
bijelom), pa stari problem od 4,30:1 više ne postoji.

---

## Dashboard — v2 preko istih imena tokena

`dashboard.html` **nije prepisan**, nego preslikan drugi put (v3 → v2): imena tokena i razreda su ostala ista (`--cream`, `--brown`, `--copper`, `.card`, `.nav-item`…), a cijeli `<style>` je zamijenjen v2 vrijednostima iz Figme (05 Host App). JavaScript panela nije diran — 830 linija provjerene logike (kalendar, fotografije, rezervacije, iCal) ostalo je isto.

Značenje tokena u v2: `--brown` = petrol `#103D4B` (tamne plohe), `--copper` = akcija `#116D76`, `--paper` = bijela kartica, `--cream` = perla podloga, `--paper-2` = wash `#EDF5F6`, `--peach` = menta na tamnom. **Imena namjerno nisu mijenjana** — ~200 mjesta. Pisma su Manrope (sučelje) i DM Sans (tekst); Fraunces se i dalje učitava samo zbog minijatura tema u panelu „Izgled”.

**Navigacija po grupama** (Figma HostSidebar): bočna traka ima `.side-link[data-group]` — Pregled, Objekt, Boravci, Linkovi i QR, a dolje Pretplata. Svi paneli i dalje imaju svoj gumb `.nav-item[data-panel][data-group]` u `.panelnav`; `syncGroup(id)` na kraju `nav()` pokazuje samo podtabove aktivne grupe (traka se skriva kad grupa ima jedan panel) i pamti zadnji podtab grupe, pa `openGroup(g)` vraća tamo gdje je korisnik stao. Na mobitelu (≤ 780 px) ista je stvar donja traka `.bottom-nav`; „Više” otvara bočnu traku. **Bočna traka ne smije koristiti razred `.nav-item`** — `nav()` s njega skida `active` sa svega.

Elementi `#completion-card`, `#user-av` i `.user-row` i dalje postoje jer ih JS puni, ali su skriveni: dovršenost vodiča je u Pregledu i u zaglavlju panela. `#user-plan` je sada značka uz „Pretplata”, a `#user-name` sitni redak uz „Postavke računa”.

Pregled gosta (telefon desno) vidi se tek iznad 1280 px; Figma ga nema, pa je to otvorena odluka.

**Traka „Imate nespremljene promjene"** (`.savebar`) javlja se na bilo koju izmjenu unutar aktivnog panela i nestaje pri spremanju ili promjeni panela. Ne uvodi novi način spremanja — samo pronađe gumb koji panel već ima (`onclick="saveXxx()"`) i pritisne ga. Paneli bez takvog gumba (liste, rezervacije) je ne pokazuju.

Dashboard **ne učitava `odmoria.css`** — ima vlastiti potpun CSS s istim vrijednostima. Dvostruko definiranje istih tokena bi se sukobilo.

## Redizajn v2 — prijenos iz Figme u kod (u tijeku)

Figma datoteka `BVdEgki8jV7z6Oa3K6Te2h` (faze A, B, C) je vizualni izvor; postojeći
kod je izvor funkcija i podataka. Prenosi se stranicu po stranicu, svaka na
Preview pa potvrda: **naslovnica ✔** → **`p.html` ✔** → **aplikacija domaćina ✔** → **vodič ✔** →
**prijava ✔** → **postavljanje i račun ✔** → **admin i 404 ✔** → **pomoć i pravne stranice ✔**. Otvorena pitanja su u `docs/odluke.md`, ne u kodu; što je gotovo, a što
nije, u `docs/napredak.md`.

**`odmoria.css`** nosi tokene iz Figme (perla #FCFCFA, petrol #103D4B, akcija
#116D76, zaobljenja 7/10/14, razmaci 4–96, širina sadržaja 1376, rub 48/16),
gumbe, oznake, harmoniku i fokus. Pisma: Manrope (sučelje, naslovi), DM Sans
(tekst), Georgia → Gelasio (ime objekta). Ikone su Lucide, kao inline SVG sprite
na dnu `<body>` svake stranice. Stari v3 sustav je obrisan; `teme.*` ostaje za
teme na v2 (vidi `docs/odluke.md`, točka 9).

**Naslovnica (`index.html`)** — nema konfiguratora tema (odgođeno, vidi
`docs/odluke.md`). Fotografija je samo `assets/landing/villa-*.jpg` (AI vila iz
handoffa); sličice u izlogu su CSS izrezi iste slike jer ostale fotografije nemaju
dokaz licence. Tekst nad fotografijom uvijek stoji **na dnu**, gdje je scrim
najtamniji — na mobitelu je to `justify-content:flex-end`, inače ime objekta
padne na nebo. Demo panel „Za domaćine” ima ARIA tabove (strelice, Home/End) i
izmišljene podatke s oznakom „Demo · sintetički podaci”. Nijedna tvrdnja o planu
nije jača od koda: nema „5 jezika”, automatske sinkronizacije ni vlastite domene.

Cijene, nazivi planova i limiti **nisu zakucani** — skripta na dnu `index.html`
ih puni iz tablice `plans` preko `loadPlans(sb)`, isto kao `help.html`.
Provjereno podmetnutim klijentom: 20/50 €, 41 fotografija i neograničeno (-1)
pojave se s ispravnim padežima. Vrijednosti u HTML-u su rezerva ako Supabase
ili esm.sh nisu dostupni. Ako su cijene „stare”, to je stanje tablice `plans`.

Provjereno Playwrightom na 1920/1440/834/430/390/360: bez vodoravnog
prelijevanja, nijedan tekst na punoj podlozi ispod WCAG AA, bez JS grešaka,
izbornik (Esc zatvara), tabovi i koraci rade.

**Javna stranica (`p.html`)** — izgled iz Figme, **logika ista kao prije**:
dohvat po slugu, `orderedPhotos()`, kalendar s `fillableGaps()`/`isFillableGap()`
(DTEND i dan odlaska smiju biti zauzeti), gotove poruke (kratko / s detaljima /
fleksibilni), WhatsApp/e-mail/kopiranje, karta tek na klik, `page_views` upis.
`sections` se i dalje **ne čita**. Promjene u odnosu na v3, sve prema Figmi:

- Kalendar i upit su **jedan tijek**: desni panel prije odabira nudi upit bez
  datuma, a nakon odabira poruku. Stari tamni blok s brojačem noći i usporedbom
  „Preko platforme (~15 %)” je **maknut** (tvrdnja bez izvora; vidi odluke).
- Zaglavlje pokazuje **jednu** naslovnu fotografiju (bez rotacije); bez fotografije
  ide petrol gradijent. Nacrtani prizori, pokretna traka i puna foto traka su maknuti.
  Bez fotografija galerija se ne prikazuje.
- Ikone su Lucide, birane **po nazivu** (`AMEN_IC`, `PLACE_IC`, `TX_IC`, `AT_IC`);
  emoji iz baze se ne prikazuju.
- Dani u kalendaru su `<button>` s `aria-label` (datum + stanje), zauzeti bez
  odabira nose `aria-disabled`. Na mobitelu se vidi jedan mjesec.
- Galerija preko cijelog zaslona: sličice, strelice, Esc, povlačenje prstom,
  fokus ostaje unutra i vraća se na gumb koji ju je otvorio.
- Na mobitelu sažetak s cijenom zamijeni traka na dnu (`.dock`), koja se pojavi
  tek kad prvi ekran ode sa zaslona.

Tri zamke: pravilo za prvu pločicu galerije mora biti `.gal > .gal__i:first-child`
(`:nth-child(1)` hvata i prvu pločicu u `.gal__pair`); slike u pločicama su
`position:absolute`, inače visina slike razvuče red; i dan u kalendaru treba
`min-width:0;padding:0`, inače na 360 px sedam stupaca izađe iz kartice.

**Vodič za gosta (`h.html`)** — početna (pozdrav, „Vaš pristup”, riječ domaćina,
pločice „Sve za boravak”) i podstranice koje se otvaraju preko adrese:
`#dolazak`, `#kuca` (i `#kuca/pravila`, `#kuca/odlazak`), `#preporuke`,
`#domacin`; `route()` na `hashchange`/`popstate` pokazuje jedan `[data-view]`.
Pločica se prikaže samo ako iza nje ima sadržaja. Provjera linka
(`loadHub`, `unlockMoment`, stari put `slug` + `guest_token`) prepisana je
doslovno. Četiri stanja linka (neispravan, istekao, deaktiviran = istekao,
objekt nije pronađen) nikad ne pokazuju naziv objekta. Zamka: tablica poruka
`STATES` mora biti definirana **prije** prvog poziva `showErr()` — link bez
tokena inače pukne na `const` prije inicijalizacije.

**Prijava i registracija** (`login`, `register`, `reset-password`,
`email-confirm`) dijele `auth.css`: obrazac lijevo, fotografija vile desno (ispod
900 px samo obrazac). Supabase pozivi su isti kao prije (`signInWithPassword`,
`signInWithOtp`, `signInWithOAuth`, `signUp` s `emailRedirectTo` na
`/email-confirm.html`, `updateUser`). Greške Supabasea prevodi `hrErr()`.
**Zamka:** funkcija koju zove `onsubmit` ne smije se zvati `submit` — unutar
`<form>` to ime pokazuje na ugrađeni `form.submit()`, pa gumb tiho pošalje
obrazac umjesto da spremi lozinku (dogodilo se na `reset-password.html`).
Tijek „zaboravljena lozinka” ne postoji — vidi `docs/odluke.md`, točka 5.

**Postavljanje, dodavanje objekta i račun** dijele `forms.css`; imena razreda
(`.fi`, `.fg`, `.type-btn`, `.btn-blue`, `.ph-*`…) i svi ID-jevi su isti kao
prije, pa je JavaScript ostao gotovo netaknut (samo tekstovi na „vi”). Postavljanje:
brojevi koraka lijevo idu CSS brojačem, a traka napretka su postojeći `.slbl`
elementi nacrtani kao odsječci (tekst im je skriven, `aria-hidden`). Zid limita
u `add-property` i popis planova u računu pune se iz `plans` (`getPlan`,
`listPlans`) — **nikad zakucane cijene**. Račun ima tabove „Profil i sigurnost”
i „Pretplata i limiti”; `#pretplata` u adresi otvara drugi (na njega vodi
„Pogledaj planove”). Brisanje računa i e-mail obavijesti i dalje ništa ne rade
na poslužitelju — sad to piše uz njih (vidi `docs/odluke.md`, točka 5).

**Pomoć, Uvjeti, Privatnost** (`help`, `terms`, `privacy`) nemaju dizajn u
Figmi; dijele `tekst.css` (traka, zaglavlje, tekst do 760 px, podnožje).
**Pravni tekst je prenesen doslovno** i na više mjesta ne odgovara aplikaciji
(Stripe, zakucane cijene, timski pristup, nepotpun popis trećih strana) — popis
je u `docs/odluke.md`, točka 8; mijenja ga vlasnik, ne kod. Pomoć je očišćena:
nema vlastite domene, oznake, white-labela ni lažnog WhatsApp broja. **QR kod iz
dashboarda vodi na javnu stranicu** (`publicUrl`), ne na vodič — Pomoć to tako i
kaže. Pretraga u Pomoći ne ovisi o dijakritici, a planovi se pune iz `plans`
samo s limitima (objekti, fotografije, preporuke), bez zakucanih dodataka.

Provjereno podmetnutim klijentom (puni objekt, objekt bez ičega, nepostojeći slug)
na 1920/1440/834/430/390/360: bez prelijevanja, bez JS grešaka; odabir raspona,
prekratak boravak, popunjavanje razmaka, zauzet dan, predlošci poruke, gosti,
filtar preporuka, galerija i karta rade.

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
- Wi-Fi i kod vrata prikazuju se tek unutar prozora `[checkin_time - 1h, checkout 23:59]` (vremensko zaključavanje), uz `setInterval` koji auto-otključa kad prozor otvori. **Prije otključavanja te vrijednosti uopće ne ulaze u HTML** — ne postoje ni u skrivenom elementu ni u `window.__VALS`, pa se ne mogu izvući iz izvornog koda stranice. Ovo je testirano i mora ostati tako. U v2 vodiču sve prolazi kroz `vaultItems()` → `secretHtml()` (zapečaćeno = samo `••••`); testirano i ubrzanim satom (`page.clock`) da se vrijednosti pojave same u trenutku otključavanja.
- **Šifre izdaje baza, ne preglednik** (od rujna 2026.): `h.html` zove funkciju `vodic_gosta(token, slug)` iz `sql/sections-security.sql`. Ona provjerava link i prozor (po Europe/Zagreb) i **izvan prozora ne vraća `door_code` ni `wifi_pass`**, samo `ima_door_code`/`ima_wifi_pass` — vodič tada stavi oznaku `true` (`zapecati()`) da pokaže zaključanu kućicu. U trenutku otključavanja `otkljucaj()` pita funkciju ponovno. Vodič na novom putu **ne čita ni `sections` ni `bookings`**.
- **Stari put** (izravno čitanje tablica) ostaje samo kao rezerva dok KORAK 1 nije pokrenut. KORAK 2 zatvara `sections` i `bookings` za anonimne (samo vlasnik; admin čita `bookings`). **Redoslijed: KORAK 1 → objava h.html → KORAK 2** — obrnuto bi slomilo vodič. Dok KORAK 2 nije pokrenut, ranjivost iz `docs/odluke.md` (točka 0) i dalje postoji, pa vodič još ne smije tvrditi da se šifre „ne šalju u preglednik”.
- `const zvatiFunkciju` i `let IZ_FUNKCIJE` moraju stajati **iznad** poziva `loadHub()` — ista zamka kao `STATES`: inače `loadHub` baci grešku, `try` je proguta i vodič tiho padne na stari put (dogodilo se, test je pokazao `rpc: 0`).
- Novi SQL se provjerava na **lokalnom PostgreSQL-u 16** (instaliran u okruženju: `/usr/lib/postgresql/16/bin`, `initdb` kao ne-root korisnik) s ulogama `anon`/`authenticated` i `auth.uid()` iz `request.jwt.claims` — tako je provjeren `sections-security.sql`.
- Postoji i stariji link (`slug` + `properties.guest_token`) koji **odmah** otključava bez vremenskog ograničenja (i kroz funkciju: `stari_link_otkljucava`). Dashboard ga i dalje nudi kao „Privatni vodič”; ukidanje čeka odluku (odluke, točka 0).
- Booking token se deaktivira ručno (`is_active=false`) ili istječe (`token_expires_at`).
- Nema service role ključa u klijentskom kodu — sve stranice koriste samo publishable/anon key.
- Admin panel (`admin.html`) je ispravno zaštićen i na RLS razini (`sql/admin-access.sql`, politike scope-ane na `auth.uid()` vlasnikovog računa), ne samo klijentskom provjerom.

---

## Poznati nedostaci (stanje repozitorija, ne backlog-želje)

- **Stripe checkout nije spojen.** Nadogradnja u dashboardu (Pretplata) i u Računu ide e-mailom (`mailto:`), kartice planova pune se iz `plans`; ništa ne poziva `billing.js`. `billing.js` uopće nije importan ni u jednom HTML-u.
- **Stripe serverless funkcije ne postoje** (`create-checkout-session`, `create-portal-session`, `stripe-webhook`). `track-event.js` također ne postoji, ali ne treba — `page_views` insert ide direktno s klijenta preko Supabase (`sb.from('page_views').insert(...)`), pa analytics radi neovisno.
- **Automatska iCal sinkronizacija** — sinkronizira se samo na klik u dashboardu, ne po rasporedu (vidi gore).
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
