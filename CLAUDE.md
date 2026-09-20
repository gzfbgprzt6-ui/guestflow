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
├── index.html              # Landing page — AKTIVNA, **prava v3 stranica** (dijeli `atmosphere.css`), konfigurator izgleda
├── p.html                  # Javna stranica objekta (?slug=xxx) — AKTIVNA, **v3 dizajn**
├── h.html                  # Privatni gostinski hub (?token=xxx) — AKTIVNA, **v3 dizajn**
├── dashboard.html          # Glavni host dashboard — AKTIVNA, **v3 paleta i tipografija**
├── login.html               register.html            reset-password.html
├── email-confirm.html       onboarding.html          add-property.html
├── account.html              help.html                admin.html (gated: owner auth UID)
├── terms.html                privacy.html             404.html
├── vercel.json              # Rewrites za clean URL-ove, security headeri + dnevni cron za keepalive
├── atmosphere.css           # DIJELJENI v3 dizajn sustav (tokeni, scena, gumbi, reveal) — koristi p.html
├── motion.js                # dijeljeni motion sustav (reveal, paralaksa, brojaci, rail)
├── links.js                 # gradnja linkova (/p/, /h/) — NIKAD ne zakucavati domenu, vidi dolje
├── plans.js                 # rezervne vrijednosti + helperi; pravi izvor istine je tablica `plans` u bazi
├── billing.js                # Stripe checkout/portal helperi — NIJE importan ni u jednom HTML-u (mrtav kod dok se ne spoji API)
├── assets/                   # odmoria-dashboard.png (više se nigdje ne koristi — stara naslovnica ju je prikazivala u herou)
├── api/
│   ├── keepalive.js          # Vercel Cron, jednom dnevno — sprječava pauziranje Supabase Free projekta
│   ├── sync-ical.js          # povlači zauzete termine s Booking.com-a i Airbnb-a
│   └── test-calendar.js      # testni iCal feed za isprobavanje sinkronizacije bez računa na Bookingu/Airbnbu
└── sql/
    ├── admin-access.sql                    # RLS politike scope-ane na owner auth UID
    ├── plan-limits.sql                     # tablica `plans` + okidaci koji limite PROVODE u bazi
    ├── add-gap-fill-stays.sql               add-min-gap-stay.sql
    ├── add-booking-id-to-availability.sql
    ├── add-source-to-availability.sql
    └── fix-missing-columns-and-storage.sql # ALTER TABLE dopune (photo_urls, ical_*, beds/bathrooms/size_m2) + storage bucket policy
```

**Napomena:** `api/` sadrži samo `keepalive.js` i `sync-ical.js`. Stripe serverless funkcije (`create-checkout-session`, `create-portal-session`, `stripe-webhook`) **ne postoje** — vidi "Poznati nedostaci".

Obje funkcije su namjerno **bez ijedne npm ovisnosti** — projekt nema build korak ni `package.json`, pa se Supabase zove izravno preko REST API-ja (`fetch`), a iCal se parsira ručno. CommonJS (`module.exports`), jer bez `package.json` Vercel `.js` u `api/` tretira kao CJS.

**Mockupi više ne postoje.** Mapa `v3/` i stari `*-v2.html` obrisani su kad su sve četiri prave stranice prešle na v3 — nema više `/v3/` na domeni ni dvije adrese za isto.

`p.html`, `h.html` i `index.html` učitavaju dijeljeni `atmosphere.css` i `motion.js`. Jedino `dashboard.html` ima vlastiti potpun CSS s v3 vrijednostima u svojim starim imenima tokena (vidi "Dashboard — v3 preko vlastitih tokena").

---

## `preview/` — prijedlog dizajna (nije u produkciji)

Mapa `preview/` sadrži šest pravih HTML stranica koje pokazuju kako bi aplikacija
mogla izgledati. **Ne dira nijednu živu stranicu.**

```
preview/
├── index.html      # razdjelnik: popis stranica + što nije spojeno
├── landing.html     public.html      guide.html
├── dashboard.html   editor.html      system.html
├── prvi-dan.html   # prazan račun: napredak postavljanja, pločice bez podataka
├── greska.html     # baza ne odgovara / istekao link
├── admin.html      # redizajn vlasničkog panela: rast, MRR, istek, tablica s pretragom
├── ui.css          # ljuska aplikacije, paneli, polja, GRAFIKONI, dijalozi,
│                   #   tamna tema vodiča + ispravci kontrasta
└── scene.js        # nacrtani prizori (isti SVG-ovi kao u p.html) + QR ilustracija
```

**Stoji na živom sustavu.** Sve preview stranice učitavaju `/atmosphere.css` i
`/motion.js` iz korijena — istu paletu, tipografiju i pokret koje koriste `p.html`,
`h.html` i naslovnica. `ui.css` dodaje samo ono čega u `atmosphere.css` nema.
Nema druge palete i nema duplog dizajn sustava.

- **Nema Supabase poziva, prijave ni baze** — sve su vrijednosti upisane u HTML.
- **Cijene su prijedlog** (Besplatno / Domaćin 7,90 € / Pro 14,90 € / Partner 29,90 €)
  i **razlikuju se od tablice `plans`**. Tablica nije dirana i neće biti dok dizajn
  ne bude odobren.
- `vercel.json` nosi `X-Robots-Tag: noindex, nofollow` za `/preview/(.*)`.
- Provjereno Playwrightom na 1440 / 834 / 390 px, deset stranica, 30 provjera:
  nema vodoravnog prelijevanja, nijedan tekst ne pada ispod WCAG AA, nema greške
  u konzoli, i svako `[data-rv]` se stvarno otkrije. Tamna tema vodiča provjerena
  zasebno — i ona prolazi AA u cijelosti.

### Zasloni iz prijedloga, sada u kodu

Pet prijedloga više nisu opisi nego rade:

- **Slanje vodiča gostu** — dijalog u dashboardu (`<dialog>`, bez biblioteke) s QR-om,
  gotovom porukom i gumbima. Gumb „Pošalji” u tablici rezervacija vuče ime gosta iz retka.
- **Podsjetnik gostu** — Hansov redak je istaknut, gumb „Podsjeti” otvara dijalog
  s prijedlogom poruke **na njemačkom**, jer je rezervacija stigla s Booking.com-a.
- **Dokaz vrijednosti** — tamni panel: „46 gostiju otvorilo je vodič 214 puta.”
- **Prvi dan** (`prvi-dan.html`) — napredak „vodič je 40 % gotov” i popis od pet koraka.
- **Kad nešto ne radi** (`greska.html`) — dva stanja, s telefonom domaćice umjesto bijele stranice.

**Tamna tema gostinskog vodiča** pali se prekidačem u zaglavlju, prati
`prefers-color-scheme` i pamti ručni odabir u `localStorage` (u `try/catch`, jer
u privatnom prozoru zna baciti). Radi preko `html[data-tema="tamno"]` koji
redefinira tokene iz `atmosphere.css`.

**QR kod je ilustracija, ne pravi kod.** Crta se determinističkim uzorkom iz teksta
linka, s tri tražila, da zaslon izgleda kako će izgledati. Pravi kod generira se
tek kad se ovo spoji na bazu; dotad uz svaki QR stoji napomena.

### Analitika po državama — traži izmjenu sheme

`preview/dashboard.html` ima panel „Iz kojih država dolaze”, ali **to još nije
moguće s postojećom bazom**. `page_views` ima samo `id`, `property_id`,
`view_type` i `timestamp`, a upis ide **izravno iz preglednika** (`p.html:725`,
`h.html:506`) u Supabase — nema poslužiteljskog koraka pa IP nitko ne vidi.

Da proradi, treba oboje:

```sql
alter table page_views
  add column country text,   -- ISO dvoslovno, iz x-vercel-ip-country
  add column lang    text;   -- navigator.language
```

i mali `api/track.js` koji pročita zaglavlje `x-vercel-ip-country` (Vercel ga
daje besplatno na svakom serverless pozivu) pa upiše red umjesto klijenta.
Jezik preglednika može se skupljati i bez tog koraka, samo uz novi stupac.
Napomena o tome stoji i u samom panelu, da se ne zaboravi.

### Admin panel — redizajn u pregledu

Živi `admin.html` (185 linija) ima četiri pločice i tablicu domaćina s odabirom
plana. `preview/admin.html` je prijedlog koji **koristi isključivo podatke koji
već postoje** (`properties`, `subscriptions`, `bookings`, `plans`) i dodaje:

- procijenjeni **MRR** iz `plans` × broj aktivnih pretplata (ne iz Stripea —
  checkout nije spojen),
- **rast** novih domaćina po mjesecima,
- **raspodjelu planova** rangirano,
- **„Uskoro istječe”** — pretplate koje istječu u 14 dana, s radnjom,
- tablicu s **pretragom, filtrom i sortiranjem**, izvozom u CSV, i gumbom
  „Spremi” koji se budi tek kad se plan stvarno promijeni.

Brojke u panelu su međusobno usklađene: raspodjela planova (14/11/6/3 = 34) stoji
zasebno od uzorka od 12 redaka u tablici, jer je izvođenje iz uzorka davalo zbroj
koji se ne slaže s MRR-om.

### Grafikoni u dashboardu

`preview/dashboard.html` nosi vlastiti crtač grafikona — bez biblioteke i bez build
koraka, kao i ostatak projekta. Devet grafikona: pregledi kroz vrijeme (s rasponom
7/30/90 dana, križićem i oblačićem), dva mala grafikona iste skale, rangirani izvori
prometa, popunjenost po mjesecima, kada gost otvori vodič, četiri iskrice u pločicama.
Svaki grafikon ima i **prikaz tablicom** ispod sebe.

**Boje su sekvencijalne rampe, nikad kategorijske** — i to je mjereno, ne stvar ukusa:
`--sea` (#2E6B77) ima OKLCH zasićenost 0,065 i `--olive` (#7E8F6A) 0,057, oboje ispod
praga 0,10 nakon kojeg boja prestaje nositi identitet; uz to maslina i terracota pod
deuteranopijom stoje na ΔE 5,6, ispod praga 8. Sekvencijalna rampa traži samo monotonu
svjetlinu, što terracota i more rampa zadovoljavaju. Mjere su fiksne: stupac ≤ 24 px s
kapicom 4 px, linija 2 px, točka r = 5 s 2 px prstenom u boji podloge, ploha 10 %,
mreža 1 px puna.

Dashboard ima i **prebacivanje plana** (Besplatno / Domaćin / Pro / Partner) koje
uživo pokazuje koji su uvidi zaključani iza kojeg plana.

### Dvije greške u živom kodu nađene usput (nisu popravljene)

Obje su popravljene **samo pod `/preview/`**, u `ui.css`. `atmosphere.css` nije diran
jer ga koriste `p.html`, `h.html` i `index.html` — popravak tamo treba dogovor.

1. **Kontrast.** `--terra` (#D4674A) kao tekst na kremi daje **3,34:1**, a bijelo na
   terri **3,60:1** — oboje pada WCAG AA (traži 4,5:1). Pogađa `.kicker` i svaki
   `.btn--fill`. Pod pregledom: tekst ide na `--terra-ink` #A8462F (4,79:1 i bolje na
   sve četiri podloge), gumbi na `--terra-d` #B44F35 (bijelo na njemu 5,11:1).
2. **`.wipe` se sam zaključava.** `clip-path:inset(0 100% 0 0)` svodi presjek elementa
   na nulu, pa `IntersectionObserver` u `motion.js` nikad ne okine i element ostane
   nevidljiv **zauvijek**. Provjereno u pregledniku. `.wipe` mora stajati na
   **unutarnjem** elementu, a `[data-rv]` na roditelju. U `p.html`, `h.html` i
   `index.html` `.wipe` se zasad nigdje ne koristi, pa još nije puklo.

Uz to, tri stvari koje je lako ponoviti:

- `scene.js` prizore ubacuje s `insertAdjacentHTML('afterbegin', …)`, nikad preko
  `innerHTML` — inače nestane sve što je već u elementu (naslov kartice, oznaka
  „Naslovna”, gumb za brisanje).
- **Svaki IIFE na kraju datoteke počinje s `;`.** Bez njega se `})()` prethodnog
  bloka i `(` sljedećeg spoje u poziv, blok tiho ne krene, a `node --check` to ne
  vidi. Dogodilo se dvaput.
- **`<dialog>` mora stajati u DOM-u prije skripti koje ga traže.** Ako je ispod
  `<script>`, `getElementById` vraća `null`.
- **Figma `node.query()` puca na ne-ASCII znakove i razmake u selektoru.**
  `[name=red-Klima uređaj]` baca `Invalid selector`. Imena nodova koje se
  dohvaćaju moraju biti ASCII bez razmaka (`red-klima`).
- **Pali `use_figma` poziv povuče se u cijelosti** — ništa ne ostane na canvasu,
  pa se smije jednostavno ponoviti ispravljen.

Dodatni pokret (parovi 7–12 u Figmi, u kodu pod `/preview/`): harmonika se
otvara preko `::details-content` uz `interpolate-size: allow-keywords`, tema i
prijelaz s javne stranice na vodič idu preko **View Transitions API**
(`@view-transition` + `view-transition-name` na zajedničkom elementu), navigacija
se skupi na `.is-stuck`, cijena se prevrne, a nacrtani prizor „diše” 9 s u
petlji. Sve staje na `prefers-reduced-motion`.

U tamnoj temi pazi na komponente koje boju uzimaju iz tokena koji se obrnu:
`.btn--fill`, `.btn--dark`, `.btn--light`, `.chip--glass` i sve `.tag--*` imaju
vlastite vrijednosti pod `html[data-tema="tamno"]`, jer im je inače pozadina
svijetla, a tekst bijel.

Kad dizajn bude odobren, ovo se prenosi na prave stranice **i tek tada** se usklađuje
`plans`. Ako bude odbijen, cijela mapa se briše — ništa drugo ne ovisi o njoj.

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

## Dizajn sustav v3

**Dijeljeni:** `atmosphere.css` i `motion.js` u korijenu, koriste ih `p.html` i `h.html`. Ovo je **svjesno odstupanje** od pravila „svaki HTML je self-contained" — dvije stranice dijele isti sustav pa bi kopiranje 300 linija CSS-a u svaku značilo dvije kopije koje se razilaze, točno onaj problem koji smo imali s limitima plana.

**Fontovi:** Fraunces (naslovi, varijabilne osi SOFT/WONK) + Manrope (sučelje) + Caveat (rukopisni akcenti).

**Tokeni:** `--cream:#FAF6EF --sand:#F1E7D7 --shell:#FFFCF7 --night:#14202E --terra:#D4674A --sun:#E9A13B --sea:#2E6B77 --olive:#7E8F6A`

**Zaglavlje:** rotira do 3 fotografije iz `photo_urls` (naslovna je `cover_photo_url`). Ako fotografija nema, vrti tri nacrtana prizora (`.art--zalazak`, `.art--plava`, `.art--maslinik`) — sve CSS i SVG, bez vanjskih datoteka.

**Ritam stranice** je namjeran i tamne plohe se izmjenjuju sa svijetlima: zaglavlje (tamno) → traka s činjenicama → pismo/činjenice/galerija (svijetlo) → puna foto traka (tamno) → karta (svijetlo) → sadržaji i „dobro je znati" (tamno) → kalendar (svijetlo) → upit domaćinu (tamna kartica) → preporuke i ostalo (svijetlo). **Ne slagati dvije tamne sekcije jednu do druge.**

**Stranica mora izgledati puno i kad host ima malo sadržaja.** Bez fotografija idu nacrtani prizori i prazna mjesta u galeriji; s jednom fotografijom puna traka uzima nacrtani prizor umjesto da se preskoči.

---

## Pristupačnost — poznato

`--muted` (`#6C7A88`) na `--paper` daje **4,30:1**, što pada WCAG AA za običan tekst (traži 4,5:1). Token se koristi na ~200 mjesta u dashboardu pa nije mijenjan globalno. Panel „Sinkronizacija kalendara" koristi `#5A6774` (5,66:1) kao ispravljenu vrijednost — isti pristup primijeniti pri sljedećem većem zahvatu u dashboard, ili jednom promijeniti sam token i vizualno provjeriti sve panele.

---

## Dashboard — v3 preko vlastitih tokena

`dashboard.html` **nije prepisan**, nego preslikan: imena tokena su ostala ista (`--cream`, `--brown`, `--copper`…), samo su im vrijednosti zamijenjene v3 paletom, a DM Serif Display zamijenjen Fraunces-om. Time je 830 linija provjerene logike (kalendar, fotografije, rezervacije, iCal) ostalo netaknuto.

`--brown` sada znači tamnoplavu `#14202E`, `--copper` je terra `#D4674A`. **Imena namjerno nisu mijenjana** jer se koriste na ~200 mjesta; mijenjati ih značilo bi ~200 prilika za grešku bez ijedne vizualne koristi.

**Bočna traka je svijetla** (`--paper`), s tamnom aktivnom stavkom — kao u v3 mockupu, ne tamna kao prije. Ako se ikad vraća tamna podloga, provjeriti sve `color:#fff` u prvih 100 linija CSS-a.

**Traka „Imate nespremljene promjene"** (`.savebar`) javlja se na bilo koju izmjenu unutar aktivnog panela i nestaje pri spremanju ili promjeni panela. Ne uvodi novi način spremanja — samo pronađe gumb koji panel već ima (`onclick="saveXxx()"`) i pritisne ga. Paneli bez takvog gumba (liste, rezervacije) je ne pokazuju.

Dashboard **ne učitava `atmosphere.css`** — ima vlastiti potpun CSS. Dvostruko definiranje istih tokena bi se sukobilo.

`index.html` **nije** prošao isti postupak — nju smo prvo pokušali prebojati, ali je ostala „fiksna" i u herou je prikazivala sliku zastarjelog dashboarda. Zato je zamijenjena pravom v3 naslovnicom iz mockupa: dijeli `atmosphere.css` i `motion.js`, nema **nijednu** vanjsku sliku (svi su prizori crtani u CSS-u i SVG-u), i nosi **konfigurator izgleda** (boja, naslovnica, font) koji na Free planu drži dio opcija zaključanim i nudi nadogradnju.

Cijene, nazivi planova i limiti na naslovnici **nisu zakucani** — skripta na dnu `index.html` ih puni iz tablice `plans` preko `loadPlans(sb)`, isto kao `help.html`. Vrijednosti upisane u HTML služe samo kao rezerva ako je Supabase nedostupan. Popust na godišnje plaćanje (`−2 mj.`) se izračuna iz Pro cijena, ne pretpostavlja.

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
- **Stripe serverless funkcije ne postoje** (`create-checkout-session`, `create-portal-session`, `stripe-webhook`). `track-event.js` također ne postoji, ali ne treba — `page_views` insert ide direktno s klijenta preko Supabase (`sb.from('page_views').insert(...)`), pa analytics radi neovisno.
- **Automatska iCal sinkronizacija** — sinkronizira se samo na klik u dashboardu, ne po rasporedu (vidi gore).
- **Landing obećava višejezičnost koje nema.** U Pro planu na `index.html` piše „Vodič na jeziku gosta — 5 jezika". To treba maknuti ili implementirati prije nego se krene prodavati.
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
