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
| Plaćanje | Stripe — **testni način spojen** (checkout, portal, webhook u `api/`); iznos iz baze (`cijena_plana`), vidi „Plaćanje karticom” |
| Jezici gostiju | `jezici.js` (sučelje, 6 jezika) + `api/prevedi.js` (tekst domaćina, Claude/Anthropic, spremljeno u `prijevodi`) — vidi „Jezici za goste” |
| E-mail | Resend, šalje ga **baza** (okidač na `inquiries` → pg_net), ključ u Supabase Vaultu — vidi „E-mail o upitu” |

**Supabase projekt:**
- URL: `https://wtojzqjhipdfbrnmprmz.supabase.co`
- Publishable/anon key (javan, sigurno za commit): `sb_publishable_tmZAZTDbQ7ktc1N-8y4q4w_ztAu_62F`
- **Rizik (ublažen):** ovo je Free tier projekt koji se automatski pauzira nakon ~7 dana neaktivnosti (potvrđeno u praksi — cijela app tada baca "Failed to fetch"). `api/keepalive.js` se preko Vercel Crona pokreće **jednom dnevno** i radi jedan trivijalan read, što drži projekt budnim. Ako se cron ugasi ili Vercel preskoči izvršavanje nekoliko dana zaredom, problem se vraća — za pravi production i dalje treba Supabase Pro.
- **Drugi budilnik (16. 10. 2026.):** `.github/workflows/supabase-budan.yml` — GitHub Actions dvaput dnevno (05:17 i 17:43 UTC) napravi isti read `plans` javnim ključem, s 5 pokušaja. Besplatno (javni repo), radi tek s `main`; GitHub ga gasi nakon 60 dana bez commita (tada Actions → Enable workflow). Dva neovisna izvora: ako Vercel preskoči cron, GitHub ne.

**GitHub repo:** `gzfbgprzt6-ui/guestflow` (public)

---

## Struktura projekta (stvarno stanje u repozitoriju)

```
/
├── index.html              # Landing page — AKTIVNA, **redizajn v2 iz Figme** (`odmoria.css`), bez konfiguratora
├── p.html                  # Javna stranica objekta (?slug=xxx) — AKTIVNA, **redizajn v2 iz Figme** (`odmoria.css`), teme se NE primjenjuju
├── h.html                  # Privatni gostinski hub (?token=xxx) — AKTIVNA, **redizajn v2** (`odmoria.css`), podstranice preko #adrese; /h/demo = primjer
├── c.html                  # Raspored za čistačicu (/c/<token>) — dolasci i odlasci, bez šifri i imena
├── sw.js                   # service worker vodiča (opseg /h/) — rad bez interneta (VERZIJA odmoria-vodic-13)
├── push-sw.js              # service worker obavijesti domaćina (opseg /dashboard) — samo push i klik, bez predmemorije
├── manifest-domacin.webmanifest  # dashboard kao aplikacija na početnom zaslonu (iPhone obavijesti to traže)
├── dashboard.html          # Glavni host dashboard — AKTIVNA, **redizajn v2** (vlastiti CSS, ista imena tokena), navigacija po grupama
├── login.html               register.html            reset-password.html
├── email-confirm.html       onboarding.html          add-property.html
├── account.html              help.html                admin.html (gated: owner auth UID)
├── terms.html                privacy.html             404.html
├── .github/workflows/supabase-budan.yml  # GitHub Actions: Supabase budan (2× dnevno, besplatno)
├── vercel.json              # Rewrites za clean URL-ove, security headeri + dnevni cron za keepalive
├── odmoria.css              # v2 dizajn sustav (Figma „Odmoria / Product Design / v2”) — sve žive stranice osim dashboarda
├── auth.css                 # raspored četiri stranice prijave (login, register, reset-password, email-confirm)
├── forms.css                # obrasci za onboarding, add-property i account (ista imena razreda kao prije)
├── tekst.css                # tekstualne stranice: help, terms, privacy (za njih nema Figme)
├── stilovi.js               # OSAM STILOVA javne stranice (+ zadani): imena, pisma, boje; primijeni(), varijable() — vidi „Stilovi javne stranice”
├── stilovi.css              # izgled stilova na p.html (<html data-stil>), tokeni odmoria.css + ukrasi
├── analitika.js             # izračuni i grafikoni analitike (boravci, popunjenost, praznine, pregledi) — dijele ga dashboard i admin
├── analitika.css            # pločice, stupčasti grafikoni (HTML, ne SVG), popisi, tablice analitike
├── links.js                 # gradnja linkova (/p/, /h/, /c/) — NIKAD ne zakucavati domenu, vidi dolje
├── auth-greske.js           # prijevod Supabase Auth grešaka (prijava, registracija, nova lozinka, račun)
├── plans.js                 # rezervne vrijednosti + helperi; pravi izvor istine je tablica `plans` u bazi
├── jezici.js                 # jezici vodiča i javne stranice: rječnik (ključ = hrvatski tekst), t(), n(), H(), birač — vidi „Jezici za goste”
├── pokret.js                 # male animacije: veselje(el) iskrice, kvacica(btn) „✓ Kopirano” (stilovi u odmoria.css i dashboardu)
├── objave.js                 # Linkovi i QR → Objave: slobodni termini, tekstovi (6 jezika), slika na canvasu, letak — vidi „Objave”
├── potvrda.js                # potvrdi()/obavijesti(): prozor u stilu aplikacije — NIKAD sistemski confirm()/alert()
├── mjesta-osm.js             # prijedlog mjesta u blizini: Nominatim + Overpass (OpenStreetMap), iz preglednika, besplatno
├── adresa-predlozi.js        # prijedlozi adrese dok se tipka (Photon/OSM, besplatno) + „Koristi moju trenutnu lokaciju” — Lokacija, Točna adresa, Gdje tražiti
├── domacin-jezik.js          # jezik sučelja DOMAĆINA (HR/EN): prekidač, prijevod DOM-a preko rječnika — vidi „Engleski za domaćina”
├── domacin-en.js             # engleski rječnik (T) i uzorci (P) za domacin-jezik.js; ključ = hrvatski tekst
├── sadrzaji.js               # KATALOG SADRŽAJA (75, 9 skupina): naziv, skupina, Lucide ikona, prijevodi — dashboard, p.html, jezici.js
├── drzave.js                 # države ISO 3166 za prijavu boravka (vodič bira s popisa, sprema kod) — kopija u api/_evisitor.js
├── slike.js                  # smanjiSliku(): fotografije prije Cloudinaryja (2048 px, JPEG 82 %) — dashboard, onboarding, add-property
├── bez-tehnike.js            # domaćin ne vidi „pokrenite sql/…”: tehničke rečenice → „Ova mogućnost još nije uključena.” (vidi niže)
├── billing.js                # Stripe iz preglednika: billingStatus, startCheckout, openBillingPortal, povratak s plaćanja (dashboard, account)
├── assets/                   # landing/villa-1600.jpg i villa-900.jpg (naslovnica i prijava); logo/ (B2 „izlazak sunca”: odmoria.svg, odmoria-bijeli.svg, ikona.svg, ikona-svijetla.svg)
├── docs/must-do.md           # KRATKO za vlasnika: što je postavljeno (SQL, Vercel), što je u mainu, što ostaje
├── docs/napredak.md          # što je u redizajnu gotovo, a što nije — pregled za vlasnika
├── docs/odluke.md            # SVE odluke koje čekaju vlasnika (planovi, faze A/B/C, naslovnica) — čitati prije prijenosa sljedeće stranice
├── api/
│   ├── keepalive.js          # Vercel Cron, jednom dnevno — drži Supabase budnim i usput sinkronizira iCal
│   ├── _ical.js              # zajednička iCal sinkronizacija (gumb, sync-all, keepalive)
│   ├── sync-ical.js          # gumb „Sinkroniziraj” — korisnikov token, RLS
│   ├── sync-all.js           # automatska sinkronizacija svih objekata (CRON_SECRET, poslužiteljski ključ)
│   ├── stranica.js           # /p/:slug s meta/OG/JSON-LD + /sitemap.xml + /robots.txt
│   ├── mjesta.js             # „Predloži mjesta u blizini” preko poslužitelja: Nominatim/Photon + Overpass/Nominatim, User-Agent, 1 zahtjev/s, samo prijavljeni
│   ├── kalendar.js           # iCal IZVOZ /kalendar/<token>.ics (+ testni feed ?test=1, stara /api/test-calendar)
│   ├── track.js              # upis pregleda s državom (x-vercel-ip-country), bez IP adrese
│   ├── prevedi.js            # prijevod teksta domaćina (Claude) za /h/ i /p/, spremljen u tablicu prijevodi
│   ├── _evisitor.js          # prijava gostiju u eVisitor (kroz sync-ical.js?evisitor=1), ISKLJUČENO: EVISITOR=off|test|live
│   ├── _push.js              # Web Push bez npm-a: VAPID (ES256) + aes128gcm; /api/obavijest → sync-all?push=1
│   ├── _stripe.js            # zajedničko za Stripe rute (s „_” → Vercel ga ne objavljuje kao rutu)
│   ├── billing-status.js     # je li plaćanje karticom uključeno (i testni način)
│   ├── create-checkout-session.js  # Stripe Checkout; iznos iz cijena_plana_za_mene, popust kao kupon
│   ├── create-portal-session.js    # Stripeov portal (kartica, računi, otkaz)
│   └── stripe-webhook.js     # JEDINI upisuje plaćeni plan u subscriptions (service role iz env)
└── sql/
    ├── admin-access.sql                    # RLS politike scope-ane na owner auth UID
    ├── plan-limits.sql                     # tablica `plans` + okidaci koji limite PROVODE u bazi
    ├── add-gap-fill-stays.sql               add-min-gap-stay.sql
    ├── add-booking-id-to-availability.sql
    ├── add-source-to-availability.sql
    ├── add-theme-to-properties.sql      # properties.theme → ime teme, properties.highlight
    ├── sections-security.sql            # funkcija vodic_gosta + zatvaranje sections/bookings (KORACI 0–4, redom!)
    ├── add-country-to-page-views.sql    # page_views.country + indeks
    ├── add-plan-promotions.sql          # tablica plan_promotions + cijena_plana() — popusti na pretplate
    ├── add-stripe-to-subscriptions.sql  # subscriptions.stripe_customer_id / stripe_subscription_id (KORAK 0 dijagnostika!)
    ├── add-inquiries.sql                # tablica inquiries (upiti gostiju): gost samo insert, vlasnik čita, 20/sat
    ├── add-reviews.sql                  # recenzije (ostavi_ocjenu, javno_o_objektu) + oznaka „pokreće Odmoria” po planu
    ├── add-guest-registration.sql       # podaci gostiju za eVisitor + pristojba (properties.pristojba_*)
    ├── add-cleaner-links.sql            # link za čistačicu (raspored_ciscenja)
    ├── delete-account.sql               # obrisi_moj_racun()
    ├── admin-upgrades.sql               # admin stvara pretplate, admin_korisnici(), admin_log + okidači
    ├── auto-ical-sync.sql               # pg_cron + pg_net: /api/sync-all svakih 30 min, brisanje starih prijava
    ├── add-translations.sql             # tablice prijevodi + prijevodi_rucni (samo service role)
    ├── add-inquiry-email.sql            # e-mail domaćinu za novi upit: okidač → pg_net → Resend (ključ u Vaultu)
    ├── add-ical-export.sql              # izvoz kalendara: calendar_exports + kalendar_izvoz(token)
    ├── add-team-access.sql              # suradnici: property_members, je_suradnik(), prihvati_pozivnicu(), plan_objekta(), najviše 3
    ├── add-guest-emails.sql             # automatski e-mail gostu (dolazak / zahvala), pg_cron dnevno; TEK nakon KORAKA 2 i add-inquiry-email.sql
    ├── add-styles.sql                   # stilovi: nova imena u properties.theme (CHECK), Beach & Sea → NULL, stane na nepoznatom
    ├── delete-property.sql              # obrisi_objekt(id): brisanje jednog objekta, samo vlasnik, sve tablice u jednoj transakciji
    ├── add-parking.sql                  # sections.parking_foto / parking_lat / parking_lon — parking sa slikom i pribadačom (samo vodič)
    ├── add-cleaner-status.sql           # cleaning_status + javi_ciscenje(token…) + kalendar_promjene (otkazano/novo s platformi); raspored_ciscenja + javljanja
    ├── add-referrals.sql                # moje_preporuke(), admin_preporuke() — Preporuči domaćina (user_metadata.preporucio)
    ├── add-push.sql                     # obavijesti na mobitel: push_pretplate, push_prijava/odjava/proba, VAPID u Vaultu, okidači → /api/obavijest
    ├── add-arrival-steps.sql            # sections.ulazak_koraci (jsonb, ≤ 12): „Kako ući” po koracima sa slikama, samo vodič
    ├── add-guest-arrived.sql            # bookings.usao_at + gost_usao(token): „Ušli smo” u vodiču → push domaćinu (jednom)
    ├── add-subdomain.sql                # v5: properties.poddomena / poddomena_do (samo webhook), tablica dodaci (cijena 19 €/god), poddomena_slobodna()
    ├── add-team-roles.sql               # v5: property_members.uloga (upravitelj/recepcija/vlasnik), ima_ulogu(), politike „suradnik” po ulozi; properties.brend + mogucnosti_vodica() s brendom
    ├── add-direct-bookings.sql          # v5: sezonske_cijene, kapara_posto, inquiries.iznos (računa baza: cijena_boravka), kod, pristanak_ponude; mogućnost „izravno”
    ├── add-per-object-plans.sql         # v5: cijena po objektu (po_objektu, min_properties, subscriptions.kolicina), plan_limit, moji_objekti_limit()
    ├── add-plan-features.sql            # plans.mogucnosti (koraci, preporuke, ocjena, evisitor, stilovi, cistacica, promocija, email) + mogucnosti_vodica(token, slug)
    ├── add-ical-sukobi.sql              # v6: kalendar_sukobi (dvostruka rezervacija), calendar_exports.dohvat_*, kalendar_izvoz_za(), cron 10 min
    ├── add-evisitor.sql                 # v6: guest_registrations.evisitor (što je poslano u eVisitor)
    ├── add-cleaner-checklist.sql        # v6: cleaner_links.popis, cleaning_status.kvacice/fotke, ciscenje_popis()
    ├── add-safety-v7.sql                # v7: zabrana preklapanja rezervacija (okidač + zaključavanje), bookings.plan_pri_izradi, mogucnosti_vodica do odlaska
    ├── add-properties-privacy.sql       # v7: javni_objekt() + tajni stupci objekta (guest_token, iCal) zatvoreni za javnost (KORAK A pa B)
    ├── test-sigurnost.sql               # SIGURNOSNI TEST — pokretati nakon svake veće promjene; sve se poništi (rollback)
    └── fix-missing-columns-and-storage.sql # ALTER TABLE dopune (photo_urls, ical_*, beds/bathrooms/size_m2) + storage bucket policy
```

**Napomena:** Vercel Hobby dopušta najviše 12 funkcija — sada ih je **12, NEMA slobodnog mjesta** (datoteke s `_` nisu funkcije; zadnja je `api/mjesta.js`, 3. 10. 2026.). Nova ruta = spojiti je u postojeću (kao `stranica.js` koji nosi i sitemap i robots, ili `kalendar.js` s testnim feedom) ili prijeći na Vercel Pro.

Sve funkcije su namjerno **bez ijedne npm ovisnosti** — projekt nema build korak ni `package.json`, pa se Supabase zove izravno preko REST API-ja (`fetch`), a iCal se parsira ručno. CommonJS (`module.exports`), jer bez `package.json` Vercel `.js` u `api/` tretira kao CJS.

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

**`teme.css` i `teme.js` (stare teme v3) obrisani su 3. 10. 2026.** — zamijenili su ih
stilovi (`stilovi.js` / `stilovi.css`, vidi niže). Zadnje stanje s njima je u povijesti gita.

---

## Stilovi javne stranice (3. 10. 2026.)

Osam stilova s platna (`docs/odluke.md`, točka 20) + zadani izgled
„Odmoria”: **priroda, luksuz, more (Sunce i more), moderno, grad, snijeg,
relax, seoska**. Zasad **besplatno za sve planove**.

- **Jedan izvor:** `stilovi.js` (`STILOVI`: id, ime, opis, Google pisma, boje
  `t`). `api/stranica.js` ima **kopiju** id-jeva i adresa pisama (CJS) —
  mijenjati zajedno.
- **`p.html`:** `STIL.primijeni(?stil= ili prop.theme)` → `<html data-stil>` +
  pisma; `stilovi.css` preslika tokene `odmoria.css` (boje, pisma `--font-ui`
  / `--font-body` / `--font-editorial`, zaobljenja) i doda ukrase. Raspored i
  logika stranice su **isti** u svim stilovima. Bez atributa = zadani v2
  izgled, piksel u piksel. `api/stranica.js` (`saStilom`) upiše `data-stil` i
  link na pisma u HTML — stil od prvog prikaza, bez treptaja.
- **Kontrast je izmjeren** na podlozi svakog stila (sve ≥ 4,5:1) i provjeren
  na stranici (`scratchpad/stilpub.mjs`: 8 stilova × 1440/390, bez
  prelijevanja). Na tamnoj plohi (`.contact`) i na fotografiji zaglavlja
  (`.hero__copy .eyebrow`) zajednička pravila poništavaju ukrase natpisa iz
  stila — inače natpis nestane (dogodilo se u Prirodi, Snijegu i Modernom).
- **Dashboard → Objekt → Osnovno → Izgled:** kartice (`role=radio`, strelice),
  „Kako gost vidi” = prava `/p/<slug>?stil=…&domacin=1` u `<iframe>`
  smanjenom na širinu kartice (ne broji se u analitici), `saveStil()` →
  `properties.theme` (NULL = zadani). Ne piše preko vrijednosti koja nije ni
  stil ni stara tema; bez `sql/add-styles.sql` CHECK odbije novo ime i panel
  kaže koji SQL pokrenuti. `STIL_ODABRAN` i `previewMode` stoje **uz uvoz**,
  iznad prvog `selectProp()` (zamka kao `STATES`).
- **Soft touch i „živo”** (vlasnik, 12. 10. 2026., samo `p.html`): naslovna
  fotografija polako „diše” (`.hero::before{background:inherit}` + scale),
  znak `#hero-zivo` „Slobodno već danas / od …” (`zivo()` iz `bookedDates`,
  zove ga i `nacrtaj()`), mekane sjene, kartice/gumbi/sličice reagiraju na
  pokazivač — sve pod `prefers-reduced-motion: no-preference`, boje iz tokena.
- **Zamka:** imena pisama u `t` su u **jednostrukim** navodnicima —
  `varijable()` ide u `style="…"`, a `"` je prekidao atribut pa su kartice
  gubile pola boja.

### Pregled gosta (desno, ≥ 1280 px)

Telefon prati **pravu** javnu stranicu u odabranom stilu (`--pv-*` iz
`STIL.varijable()` na `#pv-device`) i **pravi** vodič (v2: „Vaš pristup”,
pločice). Šifra vrata se nikad ne pokazuje (samo `••••` ako je postavljena).
`setPreviewMode()` prebacuje `hidden` i klizni pokazivač (`#pv-seg[data-pv]`);
`pregledStil()` osvježi boje, ime stila i link „otvori”. Ikone su Lucide u
spriteu dashboarda.

## Stare teme (v3) — obrisane 3. 10. 2026.

Osam starih tema (Jadran, Laguna, Zlatni sat, Terakota, Beton, Riviera ’70,
Ponoćni bazen, Borova šuma) iz `teme.css`/`teme.js` obrisano je kad su ih
zamijenili stilovi. Njihova imena i dalje su **dopuštena** u
`properties.theme` (CHECK iz `sql/add-styles.sql`) i javna stranica ih
prikazuje kao zadani izgled. Stupac `properties.highlight` ostaje u bazi, ali
ga više ništa ne koristi. Jedna lekcija vrijedi i dalje: **kontrast mjeriti na
vlastitoj podlozi stila**, a tekst nad fotografijom mjeriti pikselima.

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

**Pregled u stilu „nekretnine”** (vlasnik, 4. 10. 2026.): zaglavlje
`.ov-hero` (objekt, fotografija, cijena, traka zauzetosti 30 dana: crno
zauzeto / narančasto kratke praznine / šrafirano slobodno — `ovTraka()`),
brojke s malim stupcima (`ovSpark()`, `ovNiz()` po danu iz `page_views`) i
strelicom u panel, kartice **Vaši objekti** (`ovStatika()`; klik = promjena
objekta kroz `#prop-sel` + `onPropChange()`) i **karta** uz „Sljedećih 14
dana”. `.property-banner` se na Pregledu skriva (`:has`). Podtabovi su i na
računalu kapsule (crna = odabrano). Podaci i izračuni su isti kao prije.
**Isti stil na svim zaslonima** (4. 10. 2026.): u dashboardu sloj
„STIL NEKRETNINE” na kraju `<style>` (kartice s `--kartica-sjena`, gumbi
kapsule i **crni** `--crna` za glavnu radnju, mekša polja, crni prekidači,
`.property-banner` kao bijela kartica sa sličicom `#banner-thumb`) i veća
zaobljenja (`--radius-sm/--radius/--radius-lg` = 10/14/22), podloga `--cream`
sivlja (#F5F6F5). Isti sloj na kraju `forms.css` (postavljanje, dodavanje
objekta, račun) i kapsule tabova u `account.html`. Javne stranice
(`odmoria.css`) se NE mijenjaju — gostinski izgled ostaje Figma v2 / stilovi.
**`X-Frame-Options` je `SAMEORIGIN`** (ne `DENY`) — inače „Kako gost vidi”
(iframe javne stranice u Izgledu) ostane prazan; tuđe stranice nas i dalje ne
mogu uokviriti.

**Dashboard:** Pregled (brojke, „Na što obratiti pažnju” s radnjama,
„Sljedećih 14 dana”) i novi podtab **Analitika** u grupi Pregled
(`nav('analytics')`, `renderAnalytics()`). Pregledi se dohvaćaju za 2 × raspon
(zbog usporedbe) i pamte po objektu u `AN`.

**Admin** (`admin.html`, 8 tabova): Pregled, Domaćini, Objekti, Korištenje,
Prihod, Popusti, Poruke, Sustav. Na `odmoria.css` + `analitika.css` + vlastiti
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
- **`hidden` ne skriva element kojem razred daje `display:flex/grid`.** Treći put: natpis „Plaćeni plan je istekao” vidio je svaki domaćin u Računu. `odmoria.css` zato ima `[hidden]{display:none!important}`; dashboard (bez `odmoria.css`) treba `.x[hidden]{display:none}` za svaki takav razred.
- **`esc()` u dashboardu prima samo tekst** (`(s||'').replace`) — broj (npr. iznos) mu treba dati kao `String(x)`, inače baci grešku i prozor se ne nacrta.
- **U testnim init skriptama redak koji počinje zagradom** nakon `if(x)return {...}` bez `;` spoji se s prethodnim (isti problem kao IIFE) — test tada tiho ne bilježi pozive.
- **Dva elementa s istim `id`-em tiho pokvare drugi.** U dashboardu su obje trake
  za prebacivanje plana (Pregled i Analitika) nosile `id="planbar"`, a
  `getElementById` veže samo prvu — traka u Analitici nije radila. Sada je
  `[data-planbar]` i obje se drže usklađene.
- **Figma `node.query()` puca na ne-ASCII znakove i razmake u selektoru.**
  `[name=red-Klima uređaj]` baca `Invalid selector`. Imena nodova koje se
  dohvaćaju moraju biti ASCII bez razmaka (`red-klima`).
- **Nikad `confirm()`, `alert()` ni `prompt()`** — preglednik ih pokaže kao
  „Na web-lokaciji … navodi se sljedeće” (vlasnik, 3. 10. 2026.). Umjesto toga
  `await potvrdi(poruka, {da:'Ukloni', opasno:true})` i `obavijesti(poruka)`
  iz `potvrda.js` (dashboard, admin); funkcija mora biti `async`. Testovi koji
  su prihvaćali sistemski prozor uključuju `scratchpad/autoda.js`.
- **Pali `use_figma` poziv povuče se u cijelosti** — ništa ne ostane na canvasu,
  pa se smije jednostavno ponoviti ispravljen.

---

## Baza podataka — tablice koje se stvarno koriste u kodu

```sql
plans           -- id (free/pro/business), name, cijene, max_* limiti, can_* zastavice
                   IZVOR ISTINE za limite i cijene. Promjena plana = UPDATE ovdje,
                   bez diranja koda. -1 u bilo kojem max_* znaci neograniceno.
subscriptions   -- user_id, plan (free/pro/business), status (Stripeovi: active/trialing/past_due/canceled…), period_end,
                   stripe_customer_id, stripe_subscription_id (sql/add-stripe-to-subscriptions.sql)
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
reviews         -- property_id, booking_id (unique), ocjena 1–5, tekst, ime, javno, skriveno (sql/add-reviews.sql)
guest_registrations -- booking_id (unique), property_id, osobe jsonb, odlazak — čita SAMO vlasnik, briše se 30 dana nakon odlaska
cleaner_links   -- property_id (unique), token (16–64)
admin_log       -- tko, tablica, radnja, za_korisnika, prije, poslije (okidači na subscriptions i plan_promotions)
inquiries       -- property_id, guest_name, guest_email, guest_phone, checkin_date, checkout_date, guests,
                   message, status (novi/prihvacen/odbijen), booking_id, created_at (sql/add-inquiries.sql)
plan_promotions -- id, naziv, plan_id (null = svi plaćeni), vrsta (posto/cijena), vrijednost,
                   razdoblje (mjesec/godina/oba), trajanje_mjeseci, user_id (null = svi),
                   pocinje, zavrsava, aktivan  (sql/add-plan-promotions.sql)
page_views      -- property_id, view_type, timestamp, country (ISO, iz /api/track; stupac iz sql/add-country-to-page-views.sql). view_type: public, guest_hub, inquiry_whatsapp,
                   inquiry_email, inquiry_copy, map, guide:<dolazak|kuca|preporuke|domacin>
```

Anon (nelogirani) korisnici preko RLS mogu čitati: `properties` (samo netajni stupci; javna stranica kroz `javni_objekt()`), `bookings` (samo `is_active=true`, nije isteklo), `sections`/`local_places`/`transport`/`attractions`/`house_rules`/`faq`/`amenities`/`availability` (javno po `property_id`), i smiju `insert` u `page_views`.

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
  - Sinkronizacija: gumb u dashboardu, dnevno uz `keepalive` i svakih 30 min preko Supabase pg_cron → `/api/sync-all` (vidi „Paket značajki”).
  - Testni feed je `api/kalendar.js?test=1` (stara adresa `/api/test-calendar` i dalje radi, `vercel.json`); služi za isprobavanje bez računa na Bookingu/Airbnbu. Datumi se **računaju od danas** (dolazak za 10 i za 24 dana), pa test ne zastarijeva. Sadrži i jedan `STATUS:CANCELLED` događaj koji se **ne smije** upisati — ako se pojavi u kalendaru, filtriranje otkazanih je puklo. Očekivani rezultat je točno **12 noći**.
  - Gumb „Popuni testnim kalendarom” je maknut (odluka vlasnika); testni feed ostaje za ručno isprobavanje (upisati njegovu adresu kao iCal URL).
  - **Izvoz** (od 2. 10. 2026.): vidi „Izvoz kalendara, suradnici, preuzimanje sadržaja”.

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

| Plan (id) | Objekti | Fotografije | Cijena |
|------|---------|-------------|--------|
| Free (`free`) | 1 | 5 | €0 zauvijek |
| Domaćin (`pro`) | 1–5 | 30 | **€12 po objektu/mj** ili €99 po objektu/god |
| Agencija (`business`) | 6+ (plaća se najmanje 6) | 50 | **€9 po objektu/mj** ili €89 po objektu/god |

**Cijena po objektu (v5, `sql/add-per-object-plans.sql`):** `plans.po_objektu`,
`plans.min_properties`, `subscriptions.kolicina` (upisuje samo webhook iz
Stripeove `quantity`). `plan_limit(…,'properties')` = plaćena količina u
granicama plana; bez količine (admin) = `max_properties`. U kodu:
`limitObjekata(plan, sub)`, `placeniObjekti()`, `ukupnoZa()`, `planZaBroj()`
(`plans.js`). Checkout prima `objekata`; postojeću pretplatu **mijenja**
(isti kupac, razmjerno) i vraća `{promijenjeno:true}`. Broj objekata bira
se samo u dashboardu → Pretplata (`OBJ_N`, `brojObjekata()`); Račun i zid
limita vode tamo (`?otvori=pretplata`). Naslovnica ima računicu
(`#racunica`) s upisivom provizijom.

**Kako limiti rade (od rujna 2026.):**

- Stvarni izvor istine je tablica **`plans` u Supabaseu**, ne kod. Promjena limita ili cijene je `UPDATE public.plans ...` — bez izmjene koda i bez deploya.
- `plans.js` drži iste vrijednosti kao **rezervu** i puni se iz baze pozivom `loadPlans(sb)` pri pokretanju stranice. Ako je Supabase nedostupan, stranica radi s rezervnim vrijednostima.
- Limite **provodi baza** okidačima (`sql/plan-limits.sql`): broj objekata, fotografija po objektu, preporuka, prijevoza, atrakcija, pravila i pitanja. Provjere u pregledniku postoje samo da korisnik dobije lijepu poruku — nisu sigurnosna granica.
- Istek plana je na jednom mjestu: `effectivePlanId(sub)` u `plans.js` i `current_plan_id(uid)` u bazi. Istekao plan koji nije `free` pada na `free`.
- `plans.js` uvezen je u `dashboard.html`, `add-property.html`, `account.html`, `admin.html`, `index.html` i `help.html`. **Nikad ne zakucavati limite u HTML** — to su prije bile četiri razilazeće kopije.

**Popusti (od rujna 2026.):** tablica `plan_promotions`, uređuje se u adminu
(tab Popusti). `plans.js` ih učitava u `loadPlans(sb, {userId})` (tiho
preskoči ako tablice nema) i daje `popustZa(plan, interval)`, `cijenaPlana()`,
`rokPopusta()`, `trajanjePopusta()`, `formatEur()`. Stranice s cijenom
prikazuju precrtanu staru cijenu (`.cijena-stara`) i oznaku `.ponuda`.
**Naplata smije uzeti iznos samo iz funkcije `cijena_plana(plan, razdoblje,
korisnik)` u bazi** (izvršava je samo `service_role`; klijent ima
`cijena_plana_za_mene`) — nikad iz preglednika. Ista logika u JS-u i SQL-u:
najniža cijena od ponuda koje sada vrijede. Fiksna nova cijena ne smije imati
razdoblje `oba` (CHECK u bazi). MRR u adminu računa samo osobne popuste.

Tablica cijena gore je početno stanje u bazi; planovi i cijene još nisu konačni.

---

## Dizajn sustav v3 — obrisan

Stari sustav (`atmosphere.css`, `motion.js`, `ui.css`; Fraunces + Manrope +
Caveat, krema/terakota/more) obrisan je u rujnu 2026. Njegovi tokeni žive još
samo u povijesti gita. Jedno pravilo iz v3 vrijedi i
dalje: **stranica mora izgledati puno i kad domaćin ima malo sadržaja.**

---

## Pristupačnost — poznato

**Riješeno u redizajnu v2:** dashboardov `--muted` je sada `#536D77` (5,6:1 na
bijelom), pa stari problem od 4,30:1 više ne postoji.

---

## Dashboard — v2 preko istih imena tokena

`dashboard.html` **nije prepisan**, nego preslikan drugi put (v3 → v2): imena tokena i razreda su ostala ista (`--cream`, `--brown`, `--copper`, `.card`, `.nav-item`…), a cijeli `<style>` je zamijenjen v2 vrijednostima iz Figme (05 Host App). JavaScript panela nije diran — 830 linija provjerene logike (kalendar, fotografije, rezervacije, iCal) ostalo je isto.

Značenje tokena u v2: `--brown` = petrol `#103D4B` (tamne plohe), `--copper` = akcija `#116D76`, `--paper` = bijela kartica, `--cream` = perla podloga, `--paper-2` = wash `#EDF5F6`, `--peach` = menta na tamnom. **Imena namjerno nisu mijenjana** — ~200 mjesta. Pisma su Manrope (sučelje) i DM Sans (tekst); Fraunces se i dalje učitava zbog naslova na slikama u Objavama.

**Navigacija po grupama** (Figma HostSidebar): bočna traka ima `.side-link[data-group]` — Pregled, Objekt, Boravci, Linkovi i QR, a dolje Pretplata. Svi paneli i dalje imaju svoj gumb `.nav-item[data-panel][data-group]` u `.panelnav`; `syncGroup(id)` na kraju `nav()` pokazuje samo podtabove aktivne grupe (traka se skriva kad grupa ima jedan panel) i pamti zadnji podtab grupe, pa `openGroup(g)` vraća tamo gdje je korisnik stao. Na mobitelu (≤ 780 px) ista je stvar donja traka `.bottom-nav`; „Više” otvara bočnu traku.
**Ikone glavne navigacije** (4. 10. 2026., vlasnik: stil „Iconly”) su vlastiti
simboli `#nv-<grupa>-o` (obris, 1,6 px) i `#nv-<grupa>-b` (puna); u gumbu
stoje obje (`.nv-o`, `.nv-b`), a `.active` pokazuje punu. Donja traka je
**plutajuća bijela kapsula** (12 px od rubova, `env(safe-area-inset-bottom)`),
traka za spremanje stoji iznad nje. Podtabovi (`.panelnav`) se pomiču **samo
vodoravno** (`overflow-y:hidden`; `syncGroup()` pomiče `scrollLeft`, ne
`scrollIntoView` — on je pomicao i stranicu); na mobitelu su kapsule. **Bočna traka ne smije koristiti razred `.nav-item`** — `nav()` s njega skida `active` sa svega.

**Izbornik objekta** (bočna traka, 4. 10. 2026.): gumb `#prop-btn` s
fotografijom objekta (`palac()`) i prozorčić `#prop-meni` s karticama
(`nacrtajIzbornik()`: fotografija, ime, mjesto, oznaka dijeljeno/zaključano,
kvačica na otvorenom) i „Dodaj objekt”. Tipkovnica: strelice, Home/End,
Enter, Esc; klik izvan zatvara. **Vrijednost i dalje nosi skriveni
`<select id="prop-sel">`** — izbornik postavi `value` i zove `onPropChange()`
(pita za nespremljeno, odbija zaključane), pa testovi i ostali kod rade kao prije.
Na dnu izbornika „Napravi kopiju” (samo vlastiti objekt).

**Kopija i brisanje objekta** (Objekt → Osnovno → „Upravljanje objektom”,
4. 10. 2026.):
- **Kopija** (`otvoriDuplikat()` → `#dupl-dlg` → `napraviDuplikat()`): novi
  red u `properties` s novim `slug` i `guest_token`; domaćin kvačicama bira
  skupine stupaca (`DUPL_POLJA`: opis i kontakt, kapacitet, cijene i postavke
  + `pristojba_*`, stil; **fotografije su zadano isključene**) i sadržaj iz
  drugih tablica — isti `prenesiSadrzaj()` kao „Preuzmi sadržaj” (jedna kopija
  logike). **Nikad se ne prenose** kalendar, rezervacije, iCal linkovi,
  `door_code`, `wifi_name`, `wifi_pass`, `address`, recenzije ni statistika.
  Limit broja objekata provjerava se prije (`vlastiti()`), a provodi ga baza.
  Suradnik ne može kopirati tuđi objekt.
- **Brisanje** (`obrisiObjekt()`): dvije potvrde (druga samo ako ima aktivnih
  rezervacija), pa `rpc('obrisi_objekt')` iz **`sql/delete-property.sql`**
  (SECURITY DEFINER, samo **vlasnik**, sve tablice objekta u jednoj
  transakciji). Bez SQL-a poruka kaže koju datoteku pokrenuti. Fotografije na
  Cloudinaryju ostaju (kao i kod brisanja računa).
- Gumbi se ne smiju zvati „Kopiraj …” — svaki gumb s tim početkom dobije
  kvačicu „Kopirano” (zato „Napravi kopiju”).

**Kalendar** (Boravci → Kalendar, 4. 10. 2026.): `renderCal()` crta zauzete
noći kao **trake** — uzastopni dani istog izvora i iste rezervacije
(`kljucDana(ds)`) dobiju `poc`/`kraj` i spajaju se preko razmaka (negativan
`margin-left` = `--cg`); traka se lomi na kraju tjedna. Boje: rezervacija
crna (ime gosta na početku trake), ručno sivo prugasto, Booking narančasto,
Airbnb koraljno (`.ical.airbnb`). Iznad mreže tanka traka mjeseca
(`#cal-traka`, crtica po danu) i `#cal-stat` („N od M noći zauzeto ·
popunjenost X %”); gumb „Danas” (`calDanas()`). Oznaka „danas” je element
`.dn`, ne CSS `content`, da je engleski prevede. Dan označen upravo sada još
nema red u `AVAIL_MAP` — `kljucDana()` ga zato tretira kao ručni.

**Gornja traka „Aurex”** (vlasnik, 12. 10. 2026.): na računalu (> 780 px)
**nema bočne trake** (`.sidebar{display:none}`); `header.topbar` nosi logo,
izbornik objekta (`#prop-izbornik` je premješten ovamo), grupe kao kapsule
(`.side-link.tb-tab[data-group]` — isti razred kao bočna traka, pa ih
`syncGroup()` označava sam), traži (`tbTrazi()`: podtabovi, radnje
`TB_RADNJE`, objekti; Ctrl/⌘ K), obavijesti (`OBAV` puni `renderOverviewOps()`:
upozorenja + dolasci/odlasci danas i sutra; značka = broj upozorenja),
postavke i profil (plan, račun, **prekidač HR · EN `#jezik-sw` je sad tu**,
odjava). „Privatni vodič” i „Pogledaj stranicu” su u `.ph-akcije` zaglavlja
stranice. Na mobitelu ostaje donja traka, a „Više” otvara bočnu.
`let OBAV` i `const tbNorm` stoje uz `STIL_ODABRAN` (zamka kao `STATES`).
**Pregled** (isti dan): bez telefona desno (`:has(#section-overview.active)`),
red 2 = dvije brojke + „Odakle dolaze noći” (`ovIzvori()`, ±90 dana) +
kartice objekata; red 3 = tablica svih objekata s filtrima (`ovTablica()`:
availability 30 dana i broj pregleda po objektu, `ovTablicaNacrtaj()`) + karta;
red 4 = upozorenja i 14 dana.
**Nespremljene promjene = „kapljica”** (`#savebar`): mali balon dolje u
sredini; pri odlasku isti balon pita („Spremiti prije odlaska?” · Ne spremaj
· Spremi · ×), **bez prozora** (`#dirty-dlg` je obrisan; `pitajPrijeOdlaska`,
`kapSpremi/kapOdbaci/kapOstani`, Esc = ostani). Gumbi koji mijenjaju stanje
bez `input`/`change` događaja moraju sami zvati `markDirty` (brojači
`stepCount`, vrsta `setType` — prije se tu balon nije javljao).
**Kako ući, korak po korak** (Dolazak i upute, `KORACI`, `nacrtajKorake()`,
`saveKoraci()`): `sections.ulazak_koraci` = `[{naslov, tekst, foto}]`, slike
na Cloudinary (`uploadToCloudinary`), najviše 12. Vodič: `renderUlaz()` u
`#dolazak` + prikaz preko cijelog zaslona (`ulaz-dlg`, strelice, povlačenje).
`vodic_gosta()` vraća cijeli red `sections`, pa SQL funkciju ne treba
mijenjati; `api/prevedi.js` prevodi naslov i tekst (zaseban upit — bez
stupca tiho ništa). Javna stranica `sections` i dalje ne čita.

Elementi `#completion-card`, `#user-av` i `.user-row` i dalje postoje jer ih JS puni, ali su skriveni: dovršenost vodiča je u Pregledu i u zaglavlju panela. `#user-plan` je sada značka uz „Pretplata”, a `#user-name` sitni redak uz „Postavke računa”.

Pregled gosta (telefon desno) vidi se tek iznad 1280 px; Figma ga nema, pa je to otvorena odluka.

**Traka „Imate nespremljene promjene"** (`.savebar`) javlja se na bilo koju izmjenu unutar aktivnog panela i nestaje pri spremanju ili promjeni panela. Ne uvodi novi način spremanja — samo pronađe gumb koji panel već ima (`onclick="saveXxx()"`) i pritisne ga. Paneli bez takvog gumba (liste, rezervacije) je ne pokazuju.

Dashboard **ne učitava `odmoria.css`** — ima vlastiti potpun CSS s istim vrijednostima. Dvostruko definiranje istih tokena bi se sukobilo.

## Dorade vlasnika (16. 10. 2026.)

- **Logo C „Sunce u o”** (v5, 20. 10.; zamijenio B2): prvo „o” je prsten s
  pola sunca u otvoru, točka na „i” je obična. Dvije boje: tinta `#12303A`,
  sunce `#F2B33D` (+ perla `#F6F5F1`, crvena samo hitno) — tokeni u
  `odmoria.css` (`--sunce`, `--sunce-meko`), dashboardu i zadanom stilu.
- **Logo B2** (stari, opis ostaje radi povijesti): `assets/logo/*.svg`, u svim
  stranicama `<img class="o-logo">` (visina 1,12 em, `odmoria.css` +
  dashboard) i `<link rel="icon" href="/assets/logo/ikona.svg">`.
- **Osnovno**: jedna zbijena kartica; vrsta = kapsule `TYPES` + „Drugo…” s
  vlastitim upisom (`#prop-type` je skriveno polje, `properties.type` slobodan
  tekst, `drugaVrsta()`); kapacitet `.kap` = upisiva polja `data-count` +
  −/+ (`kapUpis()`, `stepCount()`).
- **Riječ domaćina** (bivša „poruka dobrodošlice”). **Besplatni prijevod**:
  Prijevodi → „Prevedi besplatno” — preglednik domaćina pita **MyMemory**
  (`mmPrevedi()`, dijelovi ≤ 480 znakova, `&de=` e-mail domaćina ≈ 50.000
  znakova/dan), upiše prijedloge, domaćin spremi kao ručne (`prijevodi_rucni`).
  Gostu se onda ništa ne prevodi u hodu. Treba `SUPABASE_SERVICE_ROLE_KEY`
  i `sql/add-translations.sql`; `ANTHROPIC_API_KEY` je neobavezan.
- **Sadržaji**: `sadrzaji.js` je jedini izvor (`SADRZAJI`, `SKUPINE`,
  `ikonaZa()`, `RJECNIK` → `jezici.js` ga uvozi). Dashboard: pločice po
  skupinama (`renderAmenityCatalog()`), `amenities.icon` = ime Lucide ikone;
  p.html: `ikonaZa(name) || pick(…AMEN_IC)`. Nova ikona = simbol `i-<ime>` u
  spriteu dashboarda **i** p.html (`lucide-static`, kao skripta `ikone.py`).
  `sadrzaji.js` je u predmemoriji `sw.js` (`VERZIJA` `odmoria-vodic-10`).
- **`data-bez-spremanja`** na polju = ne pali kapljicu (pretraga sadržaja,
  FB grupe…). Paneli koji se spremaju odmah inače bi lažno tražili „Spremi”.
- **Predlošci** (`PREDLOSCI.faq` 20, `.rules` 12, `nacrtajPredloske()`): klik
  otvori obrazac s tekstom, prva `[zagrada]` označena; spremanje sa
  zaostalom zagradom pita.
- **Kalendar**: dva mjeseca (`crtajMjesec()` ×2, `#cal-days` + `#cal-days2`);
  ≤ 1100 px jedan mjesec (naslov i brojka prate `matchMedia`), povlačenje
  prsta = `calNav`.
- **Parking** (`sql/add-parking.sql`): Leaflet 1.9.4 s unpkg + OSM pločice
  tek kad se otvori Dolazak (`parkKarta()`), pribadača `divIcon` (bez slika),
  klik/povlačenje; fotografija na Cloudinary. `saveArrival()` bez stupaca
  ponovi upis bez parkinga i kaže koji SQL. Vodič: tekst + slika + Google
  karta `q=lat,lon` + „Navigiraj do parkinga”.
- **Čistačica javlja** (`sql/add-cleaner-status.sql`): c.html uz svaki
  odlazak — Potvrđujem / Dolazim u… / Gotovo / Ne mogu doći (+ napomena) →
  `javi_ciscenje(token, dan, stanje, vrijeme, napomena)`; dashboard: Linkovi i
  QR → Čistačica → „Javljanja čistačice” i obavijesti.
- **Otkazano / novo s platformi**: `api/_ical.js` `zabiljeziPromjene()` usporedi
  stare i nove buduće noći istog izvora (samo ako je izvor već bio povučen) i
  upiše raspone u `kalendar_promjene` (bez tablice tiho ništa).
- **Obavijesti po prioritetu**: `OBAV` = `{r: hitno|vazno|info, n, tx, btn, on}`;
  hitno = upit čeka ≥ 3 h, boravak bez linka za ≤ 2 dana, dolazak sutra bez
  šifre, čistačica ne može, otkazano; značka broji hitno + važno (crvena /
  narančasta). „U redu” = `promVidjeno(id)`.
- **Objave → „Objavi”** (`obObjavi(k)`): tekst se kopira; mobitel =
  `navigator.share` sa slikom; računalo = preuzimanje slike + Instagram /
  Facebook sharer / wa.me / Njuškalo. **Moje Facebook grupe** u
  `user_metadata.fb_grupe` (bez SQL-a): klik kopira tekst, preuzme sliku,
  otvori grupu. Objava u grupe preko API-ja ne postoji (Meta, 2024.).
- **Nova početna vodiča** (19. 10., proba): umjesto pločica i „Vaš pristup”
  — `#karta` (karta za odmor: datumi, vremena, živo odbrojavanje, „sef” sa
  šifrom kroz `UNLOCKED`, zapečaćeno `••••` → `#dolazak`), `#brzo` „Brzo do
  informacije” (`renderBrzo()`: odgovor se odmah prikaže u `#odgovor`, šifre
  samo kroz `secretHtml()`), `#sada` po fazi (`faza()`: prije = vrijeme
  dolaska puni poruku, boravak = preporuka dana, odlazak = napredak popisa),
  „Sve za boravak” = **pametni popis** (`renderTiles()`: težina po fazi,
  prva stavka velika „Sada je na redu”; odrađeno — `GOTOVO` u localStorage
  `odm-gotovo:<token>`, `oznaci(id)`: ulaz, wifi, prijava, pravila, odlazak —
  spušta se u „Već pogledano”), pismo domaćina i `#pisi` (`renderPisi()`, `posaljiDomacinu()` → wa.me / sms /
  mailto — poruka ide domaćinu izravno). Donja traka se na početnoj ne vidi.
  `otkljucaj()` ponovno crta kartu, „Sada” i brza pitanja.
  **Ulazak korak po korak** (`#ulaz/<n>`, `renderUx()`, `uxIdi()`): tamni
  ekran preko cijelog zaslona, jedan korak, crtice napretka, povlačenje prsta i
  strelice; šifra na koraku sa zvjezdicom kroz `secretHtml()`; „Ušli smo” →
  `javiUlazak()` → `gost_usao(token)` (`sql/add-guest-arrived.sql`, push
  `usao` u `api/_push.js`, jednom po rezervaciji; iznad gumba piše da domaćin
  dobiva obavijest — odluke 33). Bez funkcije ili bez domaćinove push
  pretplate kraj nudi „Javi domaćinu da ste stigli” (wa.me / mailto); prije
  dolaska gumb je „Gotovo” i ništa se ne šalje. Dashboard u popisu
  rezervacija pokazuje „✓ Gost je ušao · vrijeme”. Dolazak ima karticu sa
  sličicama koraka (`renderUlaz()`). **Podstranice** imaju zaglavlje u boji teme
  (`vglava(view)`: naslov, opis, činjenice u kapsulama; `#sadrzaj[data-ton]`,
  `body[data-v]`) i sadržaj u bijelim karticama na sivoj podlozi. **Odlazak je
  zasebna stranica `#odlazak`** (popis s trakom napretka, „Trebate kasniju
  odjavu?”, ocjena) — stara adresa `#kuca/odlazak` (e-mail gostu) vodi
  ovamo; Kuća je samo Wi-Fi, uređaji, pravila (ikone po riječi, `RULE_IC`) i
  pitanja. **Domaćin**: brze poruke (`BRZE_PORUKE`, `[data-poruka]`) puni
  `#dom-tx`, slanje istim `posaljiDomacinu(kanal, polje)`. Riječ domaćina
  (`welcome_msg`) se na početnoj vodiča **više ne prikazuje** (vlasnik, 19. 10.).
- **v5 čišćenje dashboarda (20. 10., odluke 35):** tab Analitika skriven
  (`data-skriven`; panel i `renderAnalytics()` ostaju za `nav('analytics')`),
  Danas = popunjenost (gore) + Upiti + **Noći izravno** (`nociPoIzvoru().odmoria`);
  pregled gosta (telefon desno) skriven CSS-om (`--preview-width:0`); traka
  mjeseca iznad kalendara skrivena; stilovi u izboru samo `izbor:true`
  (Svijetli = zadani, Topli = `priroda`, Tamni = `luksuz`; stari stil objekta
  ostaje vidljiv); sadržaji = `AM_NAJCESCI` (12) + „Još sadržaja”; prijevoz i
  atrakcije = vrste preporuke (stari popisi `.v5-prazno` dok su prazni);
  „Preuzmi sadržaj” je red u Upravljanju objektom; **„Prevedi besplatno” je
  automatski**: `autoPrevedi()` nakon `saveBasic/saveArrival/saveKoraci/
  saveDeviceInfo/saveListItem/saveWifi` (omotane) i pri otvaranju Jezika —
  MyMemory → `prijevodi_rucni`, tiho. Preporuči domaćina ima napomenu „nagrada
  uskoro”. **Tražilica** (`tbIndeks()`): dijelovi, naslovi kartica, natpisi
  polja (`label[for]`), radnje, objekti, gosti (`AN.bookings`), upiti, preporuke,
  pravila, pitanja i katalog sadržaja; `tbPokazi(sel)` skrolne i bljesne
  (`.tb-bljesak`).
- **Agencija v5** (20. 10., odluke 37): panel `sviobjekti` (Danas → „Svi
  objekti”, `data-mog="agencija"`, tab `data-skriven` dok je samo 1 objekt i
  nije Agencija — `primijeniPlan()`): `agOtvori()` (availability i bookings za
  sve `PROPS`, `agNizovi()`), `#ag-kal` (30 dana × objekti), `agPrimijeni()`
  (= `prenesiSadrzaj()` za više objekata), `agIzvjestaj()` (novi prozor,
  ispis/PDF, bez iznosa). Mogućnost `agencija` dodaje `add-per-object-plans.sql`.
- **Vlastita adresa v5** (20. 10., odluke 38): `ime.odmoria.hr` → redirect `/`→`/o`
  (vercel.json, `has: host`) → `api/stranica.js?pod=` (samo `poddomena_do > now`,
  slug pregledniku kroz `<meta name="odmoria-slug">`, `p.html` ga čita). Dashboard
  `#adresa-card` (`ucitajAdresu()`, `adrProvjeri()` → `poddomena_slobodna`, `adrKupi()` →
  `billing.js startDodatak()` → checkout `{dodatak:'poddomena', objekt}`); webhook
  `primijeniPoddomenu()` upiše rok. Portal: vlastita konfiguracija `portal-v5` bez
  `subscription_update`. Prošli datumi: `p.html` `.cday.past` + okidač
  `inquiries_iznos` odbija `checkin_date < danas`. Sezone: `input type=date`, sprema MM-DD.
- **Uloge i brend v5** (20. 10., odluke 37, `sql/add-team-roles.sql`): `PROP.__uloga`
  na dijeljenom objektu; `ULOGA_PANELI` + `ulogaDopusta()` / `primijeniUlogu()`
  skrivaju (`data-uloga-skriven`) i `nav()`/`openGroup()` preusmjere — **baza
  to provodi RLS-om**, UI samo ne nudi. Tim: `#tim-uloga`, `promijeniUlogu()`,
  „Čistačica” vodi na link za čistačicu. Brend: `#brend-card` (`spremiBrend()`,
  `kontrastSBijelim()` ≥ 4,5), vodič `BREND` → `primijeniBrend()` (tokeni
  `--bg-inverse/--action/--ton/--brend`, `#brend-ime`, `#brend-dno`).
  Naslovnica: zvjezdica `#i-star` (`.ic--zv`) = novo u planu; računica kaže
  noći **po objektu** (`#rac-isp-s`).
- **Izravne rezervacije v5** (20. 10., odluke 36, `sql/add-direct-bookings.sql`):
  `cijene.js` (`cijenaNoci`, `cijenaBoravka`, `najnizaCijena`, `uMD`/`izMD`) =
  ista pravila kao `cijena_noci()`/`cijena_boravka()` u bazi — mijenjati
  zajedno. p.html: „od … / noć” = najniža cijena, iznos odabranog termina po
  sezonama, obrazac upita ima `#iq-kod` i `#iq-ponude` (bez stupaca upis se
  ponovi bez njih). Dashboard: Cijene → `#izravno-card` (`SEZ`,
  `saveIzravno()`; IBAN/primatelj u `user_metadata`), Upiti → oznake iznos /
  kod / pristanak i `otvoriPonudu()` → `#ponuda-dlg` (`PO_TX` hr/en/de/it,
  jezik po `jezikIzMaila`), `#povratni-card` (`POVRATNI()`,
  `savePovratni()`, `renderPovratni()`). Sve pod `data-mog="izravno"`.
- **Kalendar v5** (20. 10.): `.day.busy.rez` tinta (izravno), `.day.ical`
  sivo + značka `.plt` B/A na početku trake, ručno = svijetlo šrafirano,
  **praznine** 1–3 noći između boravaka (`racunajPraznine()` →
  `CAL_PRAZ`, `A.praznine(…,3)`) = sunce, crtkano (`.praz`), danas = sunčani
  krug oko broja. Ispod kalendara `#cal-strana` (`calStrana()`): popunjenost
  30 dana, noći izravno, s platformi + popis praznina s
  **„Kopiraj link s datumima”** (`kopirajLinkSDatumima()` →
  `/p/<slug>?od=&do=`) i „Objava” (`otvoriObjave`). `p.html`
  `terminIzAdrese()` označi termin iz `?od=&do=` (samo budući, `od < do`) i
  skrolne do kalendara. Traka mjeseca (`.cal-traka`) i `#cal-stat` skriveni.
- **v4 (19. 10., odluke 34) — vodič na jednoj stranici i dashboard u 4 dijela.**
  *Vodič:* nema podstranica osim `#ulaz` (korak po korak) i `#prijava`
  (eVisitor obrazac). Početna: karta → trake `#skok` (skrolaju do odjeljka,
  `skociNa()`) → `#sada` (tamna kartica po fazi) → `#odjeljci`: statični
  `section.odj#o-<id>` (ulaz, wifi, kuca, pravila, okolica, prijava,
  odlazak) u koje je **premješten stari HTML** (isti ID-jevi: `#codes-arr`,
  `#codes-wifi`, `#dev-list`, `#rules`, `#faq-blk`, `#out-list`, `#stars`…),
  pa stari rendereri rade kao prije. `poredaj()` ih slaže po fazi
  (`REDOSLIJED`; `faza()` sad ima i `dolazak` = cijeli dan dolaska) **samo
  premještanjem u DOM-u** (ocjena ne gubi upisano); obavljeno (`GOT_KLJUC`:
  ulaz, wifi, prijava) dobije `.odj--got` (sažetak u jednom redu, „Prikaži”)
  i ide pod `#got-oz`. `oznaci(id, false)` (kopirana lozinka) ne miče
  karticu dok gost ne otvori vodič ponovno (`OTVORENO`). Stare adrese
  (`#dolazak`, `#kuca[/pravila|/odlazak]`, `#preporuke`, `#domacin`,
  `#hitno`, `#odlazak`) skrolaju do odjeljka (`ODJ_ZA`, `ODJ_SIDRO`). Popis za
  odlazak tek dan prije odlaska (`#out-pred`). Kuća = `details.ur` pločice.
  Domaćin i Hitno su kartice na dnu; „Vodič pokreće Odmoria” (`#pokrece`) po
  `oznaka` iz baze. **Po planu** (`MOG`, `imaM(k)` iz `mogucnosti_vodica`):
  bez `koraci` koraci su tekst bez slika i bez `#ulaz`; bez `preporuke`,
  `ocjena`, `evisitor` tih dijelova nema. Gost nikad ne vidi „zaključano”.
  Bez SQL-a `MOG = null` → sve kao prije.
  *Dashboard:* grupe **Danas** (`pregled`) · **Gosti** (`boravci`) ·
  **Vodič** (`vodic`: arrival, guide = „Preporuke”, prijevodi = „Jezici”) ·
  **Javna stranica** (`objekt`: basic = „Opis i izgled”, photos, pricing,
  links, objave = „Promocija”); `linkovi` je spojen (openGroup('linkovi') →
  Linkovi i QR). Dijelovi s `data-mog="…"` se zaključaju po
  `imaMogucnost(planObjekta(), k)` (`plans.js`, rezerva u `FALLBACK`):
  `primijeniPlan()` u `selectProp()` ubaci jedan red `.zakl` s gumbom plana;
  `data-mog-tiho` = sakrij bez reda (prijevoz, atrakcije uz preporuke).
- **Dolazak u vodiču, redom** (vlasnik, 16. 10.): kartica „Prijava · Odjava”
  (`renderKad()`: datumi iz rezervacije + **živo odbrojavanje** do prijave,
  `KAD_TICK` svake sekunde, zatim „Prijava je otvorena”) → koraci ulaska →
  upute za dolazak i parking → adresa s kartom. **Zvjezdica na koraku**
  (`ulazak_koraci[i].sifra = true`, samo jedan; dashboard `[data-zv]`) = na
  tom koraku stoji šifra vrata kroz istu `secretHtml()` (zapečaćeno = `••••`);
  bez zvjezdice šifra ostaje ispod koraka (`#codes-arr`). Wi-Fi mreža nema
  „Kopiraj” (samo lozinka i šifra); u kućnim pravilima prijava i odjava su
  jedan red. Stari opći link nema datume — kartica tada samo s vremenima.
- **Stari opći link vodiča ukinut za šifre** (19. 10., odluke 32): u
  `vodic_gosta()` je `stari_link_otkljucava = false` — `/h/<slug>-<guest_token>`
  otvori vodič, ali šifre vrata i Wi-Fi lozinka nikad ne izlaze iz baze
  (`STARI_LINK` u `h.html`: „dobivate u osobnom linku od domaćina”).
  Dashboard ga više ne nudi za dijeljenje: kartice „Privatni vodič” imaju
  „Napravi link” (`linkZaGosta()` → nova rezervacija), a gumb je „Pregled
  vodiča” (domaćin vidi vodič kao gost prije dolaska). `guest_token` NE
  poništavati — tada prestaje i pregled.
- **Obavijesti na mobitel** (Web Push, `sql/add-push.sql`, odluke 26/32):
  🔔 → „Obavijesti na ovom uređaju” (`pushPrekidac()`, `pushStanje()`,
  `pushProba()`): `push-sw.js` (opseg `/dashboard`), ključ s
  `/api/obavijest?kljuc=1`, pretplata kroz `push_prijava()`. Okidači na
  `inquiries` (novi upit), `cleaning_status` (`ne_mogu`) i `kalendar_promjene`
  (otkazano/novo) → `_push_posalji()` → pg_net → `/api/obavijest` (Bearer
  `odmoria_cron_secret`; adresa iz Vaulta `odmoria_adresa` ili iz zadatka
  `odmoria-ical-sync`). **VAPID ključeve napravi ruta sama** i spremi u Vault
  (`push_vapid_spremi`, samo service_role) — nitko ih ne upisuje. Ruta je u
  `api/sync-all.js` (`?push=1`, `api/_push.js`) jer je 12/12 funkcija. Tekst
  hr/en po `push_pretplate.jezik`; 404/410 briše pretplatu. Šifriranje
  provjereno referentnom bibliotekom (`http_ece`). iPhone: tek s početnog
  zaslona (`manifest-domacin.webmanifest`, `apple-touch-icon.png`).
  Duboki linkovi: `?otvori=upiti|kalendar|cistacica&objekt=`.
- **Preporuči domaćina** (`sql/add-referrals.sql`): link
  `/register.html?preporuka=<prvih 8 znakova id-ja>` → `user_metadata.preporucio`
  (Google prijava: kod čeka u `localStorage` `odm-preporuka`, `upisiPreporuku()`);
  brojač `moje_preporuke()`. **Nagrada nije obećana u sučelju** — odluka
  vlasnika (odluke, točka 30); admin vidi popis kroz `admin_preporuke()`.

## v6 — besplatna poboljšanja (20. 10. 2026., odluke 39–43)

- **iCal:** `api/_ical.js` `nadjiSukobe()` → `kalendar_sukobi` (jednom po rasponu,
  `on_conflict` + `ignore-duplicates`), push `sukob`. „Jeka” = platforma je
  povukla naš izvoz NAKON nastanka rezervacije (`calendar_exports.dohvat_*`,
  upisuje `kalendar_izvoz_za()` iz `api/kalendar.js`, rezerva stara funkcija).
  Airbnb „Not available” nije prodaja (`stvarnaRezervacija()`). Dashboard:
  `ucitajUvoz()`, `nePovlaci()`, „Povukao prije …”, `sukobVidjen()`.
  `napraviRezervaciju()` **ne upisuje noći koje kalendar već drži**
  (jedinstveni `(property_id, date)` je prije rušio cijeli upis).
- **eVisitor:** `api/_evisitor.js` — prijava domaćinovim računom, lozinka se
  **nikad ne sprema**, šifrarnici, `CheckInTourist` s ID-jem iz rezervacije,
  odjava u `finally`. Sve nepotvrđeno označeno „PROVJERITI”. Dashboard blok
  `#ev-blok` u Podacima gostiju (`evNacrtaj`, `evSifrarnici`, `evPrijavi`),
  samo kad GET vrati `nacin` ≠ `off`. Test: lažni eVisitor (`scratchpad/lazni-evisitor.cjs`).
- **Prijedlozi cijena:** `cijene.js` `prijedloziCijena()`; dashboard
  `#cij-prijedlozi` (`nacrtajPrijedloge()` zove `nacrtajSezone()` i `loadAvail()`).
- **Čistačica:** `c.html` `popisHtml()`/`spremiPopis()` → `ciscenje_popis()`;
  dashboard `nacrtajPopisCist()`, `spremiPopisCist()`.
- Zamka: PostgreSQL regex ne prima ponavljanje > 255 (`{1,300}` baca grešku).
- Zamka: `.sez` redak s `input type=date` treba `min-width:0` na labeli i polju,
  inače na 390 px raširi stranicu.

## v7 — sigurnost (21. 10. 2026., odluke 44)

- **Nakon svake veće promjene pokrenuti `sql/test-sigurnost.sql`** (rollback na kraju).
  Nova tablica s podacima objekta = dodati je u popis `privatne` u testu.
- Okidač `bookings_bez_preklapanja`: aktivna rezervacija koja još nije prošla
  ne smije se preklapati s drugom (errcode 23P01, hrvatska poruka); dashboard
  je prikazuje bez „Greška:”.
- `mogucnosti_vodica()` sada je u `add-safety-v7.sql` (bolji od trenutnog plana i
  `bookings.plan_pri_izradi` do odlaska).
- **Tajni stupci objekta** (odluke 45, `sql/add-properties-privacy.sql`): javna
  stranica čita objekt kroz `javni_objekt(slug, pod)` (bez `guest_token` i iCal
  adresa); anon ima stupčana prava bez tajnih stupaca, a `public_read_by_slug`
  vrijedi samo za anon. **Novi stupac u `properties` anon ne vidi** — `p.html`
  ga dobiva kroz `javni_objekt`; nikad `select('*')` na `properties` iz javnih stranica.

## Redizajn „Pearl / Quiet Adriatic” (21. 10. 2026., grana `odmoria-unified-redesign`)

Specifikacija vlasnika (jedinstven sustav za cijeli proizvod). **Paket 1** gotov lokalno:
- **Tokeni** (`odmoria.css` i zadnji sloj „PEARL” u `<style>` dashboarda, stara imena tokena):
  perla `#F6F7F5`, bijela, tekst `#183D42`, sekundarni `#536564`, akcija `#286863`,
  mekano `#E8F0ED`, obrub `#DCE3DF`; zaobljenja 8/12. **Jedno pismo: Manrope**
  (DM Sans i Gelasio maknuti sa svih stranica; Fraunces ostaje samo u dashboardu za slike Objava).
  Zadani stil u `stilovi.js` ima iste vrijednosti.
- **Shell dashboarda:** bočna traka 216 px u gridu (sticky, ne fixed) s 8 dijelova —
  `data-group`: `pregled` (Danas), `upiti`, `kalendar` (availability + ical), `rezervacije`
  (reservations + reviews), `objekt` (Objekti: basic, photos, arrival, pricing, guide, rules,
  prijevodi, links, objave), `analitika`, `tim`, `pretplata` (Postavke). 781–1080 px = traka
  s ikonama (72 px). ≤ 780 px bočne trake **nema**; donja traka točno Danas · Kalendar · Upiti
  · Više, a „Više” je panel `section-vise` (redovi preko cijele širine). Stari ključevi
  `boravci`/`vodic` u `openGroup()` vode na Upite/Objekte. `body[data-grupa]` = aktivni dio
  (traka „Trenutačno uređujete” samo u Objektima).
- **Novi paneli:** `section-tim` (kartice čistačice i suradnika premještene iz Linkova —
  `?otvori=cistacica` vodi ovamo) i `section-uredaji` (upute za uređaje, uz Dolazak).
  `SPOJ = {basic:[basic, amenities, izgled], arrival:[arrival, wifi, uredaji], guide:[…]}`;
  Pravila i FAQ su svoj podtab.
- **Danas:** tri obveze (`#dn-kpi`: dolasci danas, upiti bez odgovora, čišćenja za potvrdu
  danas/sutra = odlazak bez `cleaning_status`), slijed događaja po danu s vremenima iz
  `sections.checkin_time/checkout_time` (bez izmišljenih vremena), „Traži pažnju” (isti `OBAV`),
  objekti kao redovi (`ovTablicaNacrtaj`, filtri tek od 4 objekta), „Dovršite vodič” samo dok
  nešto fali. Zaglavlje, karta, izvori noći i linkovi s Pregleda maknuti (podaci su u Analitici,
  Kalendaru i Linkovima).
- **Vodič (`h.html`):** početna = manja fotografija, naziv, karta boravka, **jedna** radnja po
  fazi (`renderGlavna()`) i popis „Sve za vaš boravak” (`renderPopis()`, redovi `.pr`:
  Parking, Ulazak, Wi-Fi, Uređaji, Kućni red, Odlazak, pa Prijava, Preporuke, Domaćin).
  Red otvara **detalj** `#v/<id>` (`DETALJI`, `body[data-detalj]`): CSS pokaže samo taj
  odjeljak, s „Povratak” (`nazad()`, povratak na isti položaj popisa). Parking i Ulazak dijele
  `#o-ulaz` (svaki skriva tuđi dio). Stare adrese (`#dolazak`, `#kuca/pravila`, `#preporuke`…)
  vode na detalj. Donja traka `#gnav`: Boravak · Vodič (`#v/vodic` = preporuke + korisne
  informacije) · Domaćin (`#v/domacin` + hitno); skrivena samo na `#ulaz`. Šifre i dalje samo
  kroz `secretHtml()`; status reda „Dostupno od …” ne otkriva vrijednost. `sw.js` VERZIJA 15.
- Novi tekstovi: `jezici.js` (blok „redizajn vodiča”, množina `pravilo`) i `domacin-en.js`.
- **Paket 2–3 (isti dan):** *Upiti* `.iqx` = popis (`IQ_SEL`, `#iq-filtar`, `#iq-trazi`) · detalj
  (`iqDetalj()`: termin, gosti, procijenjena cijena, poruka, radnje) · ponuda u stupcu — `#ponuda-dlg`
  više nije `<dialog>` nego `div` u `#iq-pon` (`iqPonuda()` → `iqPopuni()`; `otvoriPonudu(id)` samo odabere
  upit). *Rezervacije* = tablica `.bk-tbl` + panel `#bk-panel` (`BK_SEL`, `bkStanje()`, `bkPanel()`,
  `bkOdaberi()`); opasne radnje odvojeno. *Kalendar*: timeline svih objekata iznad mjeseca (`tlUcitaj()`,
  `tlNacrtaj()`, `TL_N` mj/14/7; izravno petrol, B/A sivo, blokade šrafirano, praznine crtkano; stvarni
  `ical_last_sync`), na mobitelu skriven. *Objekti*: putokaz u `#panelEyebrow`, `.property-banner`
  skriven, `.ob-vrh` (Osnovno · `obFoto()` · dovršenost `#ob-prsten`), `#door-code` maskiran
  (`pokaziTajnu()`), „Kako gost vidi” je `<details>`. *Analitika*: `an3()` (popunjenost, zauzete noći,
  izravni upiti s usporedbom u p.b., SVG graf s prethodnim razdobljem, izvori noćenja, definicije).
  *`p.html`*: galerija 1+2 na vrhu (`.gal-vrh`, na mobitelu listanje prstom), naslov bez fotografije,
  `.pg` = sadržaj lijevo + `.pg-r` stalni panel (`sumTermin()` iz `refreshAsk()`), sidra
  Pregled/Sadržaji/Lokacija/Dostupnost/Pitanja. *Naslovnica*: „Vaš smještaj. Sve na svom mjestu.”, bez
  tamnih blokova. **Namjerno nije preuzeto sa slika:** chat, „polog za štetu”, „Najpopularnije”,
  Destinacije/Inspiracija, favoriti, lijevak konverzije.
- **Postavke** (`account.html`): četiri taba Račun · Pretplata · Obavijesti · Sigurnost (`TABOVI`
  na vrhu modula — zamka kao `STATES`; `#pretplata`/`#obavijesti`/`#sigurnost` u adresi), podcrtani tabovi.
  `forms.css` bez stare tinte (akcija `var(--action)`). `c.html`: „Odlazak” neutralno, odabir u boji akcije.
  Admin: bijeli logo na tamnoj traci (tamna traka = jasno administratorski dio). Pomoć i pravne
  stranice samo nova paleta.
- **Sigurna izravna rezervacija** (22. 10. 2026.): `p.html` `#sig-sec` (Odmoria ne prima uplate, upit
  nije rezervacija, razgovor prije kapare, ime primatelja u banci) + „Prijavi stranicu” (`buildSig()`,
  mailto podrške s adresom), 6 jezika. Dashboard: ponuda (`PO_TX.potv`) kaže da je termin rezerviran tek
  kad kapara stigne; `prihvatiUpit()` pita je li kapara na računu (samo uz mogućnost `izravno` i
  `kapara_posto > 0`); panel rezervacije: deaktivirati link ako gost ne plati. Pomoć: dva odgovora u
  Sigurnosti. Provjera domaćina / zaključani IBAN / 2FA = sljedeći paket (treba SQL i pravnika).

## Dorade vlasnika (22. 10. 2026.)

- **Dashboard:** „Traži pažnju” je preko cijele širine iznad slijeda (`.dn-paznja`, stavke kao kartice);
  Osnovno = Osnovno | Dovršenost (kartica naslovne fotografije maknuta, `obFoto()` bez elementa ništa ne radi);
  prijava/odjava kao kućice `.vr2` (isti `#ci-time`/`#co-time`); uređaji 2×2 `.ur4` (polja prazna, samo primjer
  u placeholderu); cijene tri male kućice `.cj3` (`#pricePreview`/`#minStayPreview` ostaju skriveni za `livePreview()`);
  sezone su jednake kartice `.sez` („Sezona N”). Gumbi „Pregled vodiča / Pogledaj stranicu” vide se samo u
  Danas i Objektima (ne u Jezicima) — `body[data-panel]` postavlja `syncGroup()`. Postavke imaju četiri taba:
  Račun, Obavijesti i Sigurnost su `.nav-van` gumbi bez `data-panel` koji vode u `account.html#…`.
- **Prikaz cijene „Javno / Na upit”** (`sql/add-price-display.sql`, `properties.prikaz_cijene`): dashboard
  `setPrikazCijene()`; bez stupca `savePricing()` spremi ostalo i kaže koji SQL. `p.html` (`NA_UPIT`) i
  `api/stranica.js` (JSON-LD) tada ne pokazuju iznose. `javni_objekt()` vraća cijeli red, pa je ne treba mijenjati.
- **`p.html`:** galerija visine `clamp(340px, 40vw, 580px)` (manje rezanja), karta preko cijele širine lijevog
  stupca `16 / 7` (mobitel `4 / 3`).
- **Vodič prema slici:** naslovna fotografija s imenom i mjestom na njoj (`.naslov--foto`), `renderKarta()` =
  „Dobro došli!”, datumi i noći, okvir s vremenom dolaska/odjave po fazi; `#glavna` gumb; `renderZakl()` = topli
  okvir „Podaci za ulazak dostupni od …” dok je zaključano, a nakon otključavanja šifra vrata kroz `secretHtml()`;
  pločice `#plocice` (Parking, Ulazak s lokotom, Wi-Fi, Domaćin), `#prep-k` preporuke po vrsti (klik otvori
  Preporuke s tim filtrom), `#popis-k` = „Korisne informacije”. Fotografija vodiča je naslovna fotografija objekta.
  `sw.js` VERZIJA 17.
- **Naslovi uređaja** (`sql/add-device-titles.sql`, `sections.uredaji_naslovi` = `{ac, grijanje, voda, kuhinja}`):
  dashboard `[data-ur]` polja u kućicama, prazno = zadani naziv; vodič `urNaslov()`; `api/prevedi.js` ih prevodi.
- **Sezone:** `.sez` stupci `auto-fit minmax(180px)` — Od/Do jedno uz drugo samo kad stanu; `input[type=date]` s
  `appearance:none` (iPhone). Provjera preklapanja: `scratchpad/rd/t14.mjs` (rubovi polja, 360–1440 px).
- **Fotografije preporuka** (`fotke-mjesta.js`, `sql/add-place-photos.sql`: `local_places.foto`, `foto_izvor`):
  Wikimedia Commons iz preglednika domaćina — OSM oznake (`wikimedia_commons`, `wikidata` → P18, `image` na Commons;
  `odaberi()` ih nosi u `osm`) pa geosearch (plaže 300 m, ostalo 60 m); samo slobodne licence, autor i licenca u
  `foto_izvor` i ispod slike u vodiču. „Predloži mjesta” ih traži odmah, „Pronađi fotografije” za postojeće (koordinate iz
  `maps_query`); „Ukloni sliku” u popisu. Bez slike vodič crta obojenu pločicu po vrsti (`PREP_TON`).
- **Pokrenuto u bazi 22. 10.:** `add-price-display.sql`, `add-device-titles.sql`, `add-place-photos.sql`.
- **Jezici** (prijevodi) tab je skriven (`data-skriven`, vlasnik: „ne treba”); panel i `nav('prijevodi')` ostaju,
  `autoPrevedi()` i dalje radi nakon spremanja. **Tim i čišćenje:** kartica čistačice = `.cs-vrh` (link · slanje)
  i `.cs-dno` (popis · javljanja kao vremenska crta `.cs-tl`). Sezone: datum i cijena centrirani.

## Vodič „časopis” (23. 10. 2026., analiza vlasnika, P0-1)

`h.html` je **jedna stranica**: naslovna fotografija preko cijele širine (zaglavlje je prozirno
preko nje — `body.preko`, `preko()` s IntersectionObserverom), oznaka faze na fotografiji
(`fazaOznaka()`: „Dolazak za N dana” / „Danas stižete” / „Dan 2 od 5” / „Danas odlazite”),
karta boravka preko ruba fotografije, jedna radnja (`renderGlavna()`), ljepljive trake za skok
(`#skok`, `oznaciSkok()` prati položaj) i **svi odjeljci otvoreni** kao poglavlja s brojem
(CSS brojač). Nema više detalja `#v/<id>`, pločica, popisa ni donje trake — stare adrese
(`#v/wifi`, `#dolazak`, `#kuca/pravila`, `#odlazak`…) kroz `odjeljakZa()` samo **skrolaju**
(`skociNa()`). Zasebni ekrani ostaju `#ulaz` i `#prijava`. Novo: **vrijeme** (Open-Meteo,
prognoza + temperatura mora, besplatno bez ključa, 3 h u localStorage, bez odgovora kartice
nema), **QR za Wi-Fi** (esm.sh `qrcode@1.5.3`, crta se TEK kad je lozinka otključana),
preporuke kao kartice s fotografijom (`paintRecs()`, `.mc`), uređaji uvijek otvoreni.
**Stil objekta vrijedi i u vodiču** (`STIL.primijeni(PROP.theme)` + `stilovi.css`); CSS je
samo na tokenima, `--bg-soft` u stilovima = `--bg-wash`. `sw.js` VERZIJA 18 (sprema i
`stilovi.js/css`). Test: `tests/vodic.test.mjs`; snimke: `node tests/snimi-vodic.mjs <mapa>`.

## Bez tehničkih poruka za domaćina (23. 10. 2026., P0-4)

`bez-tehnike.js` (učitan u dashboardu): MutationObserver prepravi svaki tekst s `sql/…`,
Supabase, Vercel, imenom ključa ili `docs/odluke` — tehnička rečenica ispada, stoji
„Ova mogućnost još nije uključena.” (izvornik u konzoli). Poruke u kodu **i dalje pišu koji
SQL fali** (za vlasnika i testove); `window.__ADMIN` (vlasnikov UID, isti kao `admin.html`)
vidi ih kao prije, a `[data-tehnika]` izuzima element. Kartica „Vlastita adresa” je skrivena
(`hidden`) dok dodatak nije spreman, „Preporuči domaćina” je u Postavkama (`section-sub`,
`ucitajPreporuke()` na `nav('sub')`). Test: `tests/tehnika.test.mjs`.

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
na dnu `<body>` svake stranice. Stari v3 sustav i stare teme su obrisani; stilovi su u
`stilovi.js` / `stilovi.css` (vidi „Stilovi javne stranice”).

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
- Stariji opći link (`slug` + `properties.guest_token`) od 19. 10. 2026. **nikad ne otključava šifre** (`stari_link_otkljucava = false` u `vodic_gosta()`, i na starom putu `UNLOCKED = false`); dashboard ga koristi samo za „Pregled vodiča”.
- Booking token se deaktivira ručno (`is_active=false`) ili istječe (`token_expires_at`).
- Nema service role ključa u klijentskom kodu — sve stranice koriste samo publishable/anon key. Poslužiteljski ključ postoji **samo** kao Vercel varijabla `SUPABASE_SERVICE_ROLE_KEY` i koriste ga **samo** `api/stripe-webhook.js`, `api/sync-all.js`/`keepalive.js` (iCal) i `api/prevedi.js` (koji iz `sections` bira stupce izričito — nikad `door_code`, `wifi_pass`, `wifi_name`, `address`).
- Admin panel (`admin.html`) je ispravno zaštićen i na RLS razini (`sql/admin-access.sql`, politike scope-ane na `auth.uid()` vlasnikovog računa), ne samo klijentskom provjerom.

---

## Plaćanje karticom — Stripe (od rujna 2026., testni način)

- **Uključuje se samo varijablama okruženja u Vercelu** (`STRIPE_SECRET_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`). Bez njih `/api/billing-status` kaže
  `stripe:false` i stranice pokazuju staru nadogradnju e-mailom. Upute:
  `docs/odluke.md`, točka 16.
- **Iznos nikad iz preglednika.** Checkout zove `cijena_plana_za_mene` s
  korisnikovim tokenom (bez funkcije → redovna cijena iz `plans`). Popust =
  Stripe kupon s našim id-jem (`odm_<ponuda>_<centi>_<trajanje>`), proizvod =
  `odmoria_<plan>`; oba se naprave jednom i ponovno koriste.
- **Plan upisuje samo `api/stripe-webhook.js`**, poslužiteljskim ključem. Iz
  tijela zahtjeva uzima **samo id događaja** i događaj dohvati od Stripea
  (Stripeov potpis se ne koristi: Vercel tijelo sam pretvori u JSON, pa
  izvorni bajtovi nisu pouzdano dostupni). I pretplatu uvijek dohvati iznova,
  pa redoslijed događaja ne smeta. Događaj stare pretplate ne smije srušiti
  novu (`stripe_subscription_id` se uspoređuje).
- `period_end` = kraj Stripeova razdoblja **+ 2 dana** (kasni webhook ne smije
  spustiti domaćina na Free). Od API verzije 2025-03-31 `current_period_end`
  je na stavci — `krajRazdoblja()` čita oba mjesta; zahtjevi idu s
  `Stripe-Version: 2024-06-20`.
- Portal i ponovni checkout koriste `stripe_customer_id` **samo ako kupac u
  Stripeu nosi `metadata.user_id` istog korisnika** — webhook ga upiše.
- Tko ima aktivnu pretplatu karticom, checkout vraća 409 → preglednik otvara portal.
- Povratak: `?placanje=uspjeh|odustao`; `povratakSPlacanja()` ga makne iz
  adrese, `cekajPlan()` čeka da webhook upiše plan (do ~20 s).

## Paket značajki (rujan 2026.) — kako radi

- **Gost i čistačica ne pišu u tablice izravno** — samo kroz SECURITY DEFINER
  funkcije s tokenom: `ostavi_ocjenu`, `ocjena_gosta`, `prijava_gostiju`,
  `prijava_za_link`, `raspored_ciscenja`, `javno_o_objektu`. Nove funkcije
  za goste pišu se isto (provjera tokena, `is_active`, `token_expires_at`).
- **`/h/demo`** je primjer s izmišljenim podacima u samom `h.html` — ne dira
  bazu, ne bilježi preglede. Izmišljene šifre ne smiju biti iste kao u
  testovima (`4821` je testna šifra; primjer ima `7305`), inače provjera
  „šifra u HTML-u” lažno padne.
- **Rad bez interneta:** `sw.js` (opseg `/h/`) sprema HTML, stilove i
  biblioteke; podatke vodič sprema sam u `localStorage` (`odm-vodic:<token>`),
  šifre SAMO ako su bile otključane. Nova verzija workera = promijeniti `VERZIJA`.
- **`/p/:slug` ide kroz `api/stranica.js`** (meta i OG u HTML-u, CDN 5 min).
  Kad baza ne odgovori, vraća neizmijenjen `p.html`. `includeFiles: p.html`
  u `vercel.json`.
- **Dashboard, Objekt:** 5 podtabova, svaki pokazuje više panela
  (`SPOJ` u `nav()`); `nav('wifi')` i sl. otvori roditelja i skrolne.
  `DIRTY` je `Set` panela — „Spremi” na traci pritisne gumb svakog izmijenjenog.
- **Analitika po planu:** kartice s `data-treba="90|365"`, dopušteni dani iz
  `plans.analytics_days` (`anDana()`); ograničenje je u sučelju.
- **iCal:** dan koji drži drugi izvor (ručno, rezervacija) sinkronizacija ne
  prepisuje (`_ical.js`) — prije bi ga sljedeća sinkronizacija obrisala.

## Poznati nedostaci (stanje repozitorija, ne backlog-želje)

- **Stripe je spojen samo za testni način** — računi se ne fiskaliziraju, nema PDV-a ni poreznog broja kupca; odluke u `docs/odluke.md`, točka 16. `track-event.js` ne postoji i ne treba — pregledi idu kroz `/api/track`.
- **Automatska iCal sinkronizacija** radi tek kad su postavljeni `SUPABASE_SERVICE_ROLE_KEY` (dnevno) i `sql/auto-ical-sync.sql` + `CRON_SECRET` (svakih 30 min).
- **Višejezični su vodič i javna stranica** (6 jezika) te **domaćinov dio na engleskom** (dashboard, prijava, registracija, postavljanje, dodavanje objekta, račun). Naslovnica, Pomoć, pravni tekst, `c.html`, admin i e-mailovi su samo na hrvatskom.

---

## Git / deploy pravila — obavezno slijediti

- **Pitaj prije svake izmjene** koja ide dalje od lokalnog rada.
- Svaka promjena prvo ide na **novu feature granu**, nikad direktno na `main`.
- Nakon pusha na feature granu, javi **Vercel Preview URL** i pričekaj da korisnik vizualno provjeri.
- **Merge u `main` (produkcija) samo na eksplicitnu, svježu potvrdu** za tu konkretnu promjenu — prijašnje odobrenje ne vrijedi automatski za sljedeću izmjenu.
- Nikad ne mijenjati Supabase ključeve, RLS politike ni konfiguraciju bez izričitog dogovora.
- **Supabase je spojen konektorom** (16. 10. 2026.). Izmjene baze (SQL datoteke iz `sql/`) pitaju se **jednom za cijeli paket**, uz puštanje u `main` — ne datoteku po datoteku. Prije toga samo čitati stanje (što je već pokrenuto). SQL s riječju `delete` konektor ne pušta bez potvrde koju vlasnik ne vidi (istekne nakon 60 s, ništa se ne upiše) — takve dati vlasniku kao okvire koda u chatu (datoteke .sql/.txt mu se ne otvaraju).
- Nikad ne izmišljati nove SQL stupce/tablice — provjeriti stvarnu shemu prije pisanja koda koji na nju pretpostavlja.
- `p.html` ne smije nikad dohvaćati ni prikazivati `wifi_pass` ili `door_code`.

---

## Konvencije

- Svaki HTML fajl je self-contained (CSS + JS inline), bez build koraka.
- Supabase client: `createClient(...)` iz `https://esm.sh/@supabase/supabase-js@2` (ESM import), `type="module"` skripte.
- `vercel.json` definira rewrites (`/p/:slug` → `api/stranica`, `/h/:token`, `/c/:token`, `/sitemap.xml`, `/robots.txt`, `/dashboard`…), security headere, dnevni cron za `keepalive` i `functions` (includeFiles, maxDuration).

---

*Ažurirano prema stvarnom stanju repozitorija. Ne sadrži tajne ključeve — samo javni Supabase publishable key.*

## Jezici za goste (rujan 2026.)

Vodič (`h.html`) i javna stranica (`p.html`) su na **HR, EN, DE, IT, PL, CS**.
Sve je u `jezici.js` (ES modul, `import * as L from '/jezici.js'`).

- **Ključ rječnika je hrvatski tekst.** Na hrvatskom stranica ostaje točno
  ista kao prije. Novi tekst u sučelju = `t('Hrvatski tekst')` **i** red u
  rječniku `[hr, en, de, it, pl, cs]` — bez reda ostaje hrvatski (ne pukne).
  Umetanje: `t('Prijava od {v}', { v })` — ime rezerviranog mjesta je dio
  ključa (`'do {vrijeme}'` i `'do {n}'` su dva različita teksta).
- **Množina:** `L.n(3, 'noć')` → „3 noći” / „3 nights” / „3 noce” (tablica `P`,
  pravila za hr/pl/cs). Ne slagati „broj + riječ” ručno.
- **Datumi:** `L.datum`, `L.datumKratko`, `L.mjesec`, `L.mjesecGodina`,
  `L.daniUTjednu`; na hrvatskom daju isti oblik kao stari kod.
- **Statični HTML** prevodi `L.prevediDom()` (tekstni čvorovi + `aria-label`,
  `placeholder`, `title`, `alt`) — pamti izvornik, pa se može ponoviti.
  Element s `translate="no"` preskače.
- **Tekst domaćina** uvijek kroz `H(tekst)`: prijevod s rute → rječnik →
  uzorak („5 min pješice”) → izvornik. `pick()` za ikone i dalje gleda
  **izvorni** hrvatski tekst.
- **Tok:** `L.postavi(L.odaberi())` + `L.prevediDom()` odmah; `L.unaprijed()`
  pošalje zahtjev ruti usporedo s podacima; `L.pokreni(upit, {kasnije})` suzi
  jezik na plan domaćina (ruta vraća `jezici`) i učita prijevod. Stigne li
  prijevod nakon 6 s, `kasnije` ponovno nacrta (`nacrtaj()` u obje stranice) —
  zato sve što nosi tekst domaćina mora biti u `nacrtaj()` i smije se pozvati
  dvaput.
- **Filtar „Sve”** ima vrijednost `'*'` (natpis ovisi o jeziku).
- **Poruka domaćinu** (`p.html`) ide kroz `L.tu(L.jezikPoruke(), …)`: hr/en/de/it
  ostaju, pl/cs → engleski. Upit u bazi nosi istu poruku.
- **eVisitor:** vrijednosti opcija (`Putovnica`, `Ž`) ostaju hrvatske, prevodi se natpis.
- **`jezici.js` je u predmemoriji service workera** (`sw.js`) — promjena
  izvoza ili rječnika = povećati `VERZIJA` u `sw.js`, inače vodič bez mreže
  može dobiti stari modul.
- **Testovi:** Playwright je po zadanom `en-US`, pa stari testovi (koji
  očekuju hrvatski) trebaju `--lang=hr-HR` ili `locale:'hr-HR'`.

**Panel Prijevodi** (dashboard → Objekt → Prijevodi, `ucitajPrijevode()`,
`saveTranslations()`, `vratiPrijevod()`): zove istu rutu u načinu za
domaćina (`?objekt=&lang=[&prevedi=1]` + korisnikov Bearer token; POST
`{objekt, lang, izmjene}`). Ruta provjeri `/auth/v1/user` i `user_id`
objekta, sprema samo tekstove tog objekta u **`prijevodi_rucni`** (po
objektu — nikad u zajedničku `prijevodi`, inače bi jedan domaćin mijenjao
tuđe prijevode). Ručni ispravak ima prednost i u vodiču i na javnoj stranici.

**`api/prevedi.js`:** `?lang=&slug=` (javna) ili `?lang=&token=[&slug=]`
(vodič; provjeri `is_active` i `token_expires_at`, stari link slug+guest_token).
Tekstove čita **sama** (klijent ne šalje tekst — ruta nije besplatan
prevoditelj), prevodi što nema u `prijevodi` (sha256 teksta + jezik), do 4
dijela po 40 tekstova istodobno, rok 24 s (`maxDuration: 30`). Broj jezika =
`plan_limit(vlasnik, 'languages')`, redoslijed `JEZICI`. Bez tablice
`prijevodi` **ne prevodi** (svako otvaranje bi se platilo); bez ključeva vrati
sve jezike i `prijevod:false`. Javni odgovor se kešira na CDN-u samo kad je
potpun. Varijable: `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
neobavezno `PRIJEVOD_MODEL`.

## E-mail o upitu (rujan 2026.)

`sql/add-inquiry-email.sql`: okidač `email_o_upitu` (AFTER INSERT na
`inquiries`) → `net.http_post` na `api.resend.com/emails`. Ključ, pošiljatelj
i adresa aplikacije su u **Supabase Vaultu** (`odmoria_resend_key`,
`odmoria_email_od`, `odmoria_adresa`); dok su u njima `<ZAMJENSKI>` nazivi,
okidač ne šalje ništa. Primatelj: e-mail računa (`auth.users`), inače
`properties.email`; ne šalje ako je `user_metadata.obavijesti.vazne = false`.
Sve gostovo prolazi kroz `_html_esc`. Greška slanja je samo WARNING — upit se
uvijek spremi. Link u e-mailu: `/dashboard.html?otvori=upiti&objekt=<id>`
(dashboard odabere objekt ako je domaćinov i nije zaključan). Lokalni test:
lažni `vault` i `net` shemom (pg_net lokalno ne postoji).

## Objave — slika, tekst i letak za promociju (listopad 2026.)

Dashboard → Linkovi i QR → **Objave** (`obOtvori()`, `obNacrtaj()`,
`obLetak()`, `otvoriObjave(od, do)`); logika u **`objave.js`** (čiste
funkcije `slobodniTermini()`, `podaci()`, `tekstovi()`, `raspon()`,
`terminTekst()` + `nacrtaj()` na canvasu i `letakHtml()`). Katalog/tražilica
objekata je **odbijen** (`docs/odluke.md`, točka 19).

- Ništa se ne sprema — panel nema gumb `save…`, pa nema ni trake za spremanje.
- Jezici po planu = prvih `maxLanguages` iz `JZ.JEZICI` (kao vodič). Uvoz
  jezika u dashboardu je **`JZ`**, ne `L` (`L` je lokalna varijabla upita).
- Tekst je bez padeža imena i mjesta (zarez/zagrada), pa predložak vrijedi za
  svako ime. Sadržaj na stranom jeziku ide samo ako ga rječnik `jezici.js` zna;
  isti naziv na više jezika („Parking”) prepoznaje se po tome što ga rječnik
  prevodi na barem jedan jezik.
- Slika: fotografija s `crossOrigin='anonymous'` (Cloudinary šalje CORS); ako
  canvas ipak bude „zaprljan” (`getImageData` baci grešku), crta se ponovno bez
  fotografije i to piše ispod slike. Pisma se čekaju (`document.fonts.load`).
- Letak se otvara u novom prozoru **odmah na klik** (inače ga preglednik
  blokira), a sadržaj se upiše nakon QR-a. Skripta ispisa stoji **ispred**
  Google Fonts linka i ima rezervu od 4 s — spor ili blokiran font inače
  zaustavi skriptu i ispis se nikad ne otvori (dogodilo se u testu).
- Pregled: praznina ili slobodan termin u 3 tjedna → gumb „Napravi objavu”.
- **Izgledi** (`PREDLOSCI`): `foto`, `razglednica`, `luk`; naljepnica-sunce
  s cijenom; naslov u pismu Fraunces (dashboard ga već učitava zbog tema).
  Broj i jedinica vežu se tvrdim razmakom (`\u00a0`), a `prelomi()` lomi samo
  na običnom razmaku — inače „120 / m²” u dva reda.
- **Pokretna objava (video → MP4/GIF) je napravljena pa maknuta** na
  zahtjev vlasnika (1. 10. 2026.) — kod je u povijesti gita (commit `a9f5dcd`).
  Ako se vrati: iPhone ne učita `<video>` koji nije u DOM-u i nije pokrenut, a
  poruka stanja mora biti izvan skrivenog dijela.

## Male animacije (listopad 2026.)

`pokret.js` (`veselje(el)`, `kvacica(btn, tekst)`) + stilovi `.o-veselje`,
`.o-kv`, `o-pop`, `o-opruga` u `odmoria.css` (dashboard ima kopiju, jer ga ne
učitava). **Sve pod `prefers-reduced-motion: no-preference`**, a `veselje()`
sam provjeri postavku — testovi rade s `reducedMotion:'reduce'`, pa iskrica
tamo namjerno nema. `pokret.js` je u predmemoriji service workera (`sw.js`,
`VERZIJA` sada `odmoria-vodic-10`). Dashboard: svaki gumb čiji natpis počinje s
„Kopiraj” sam dobije kvačicu (jedan slušač na `document`); iskrice u
dashboardu nema.

## Izvoz kalendara, suradnici, preuzimanje sadržaja (2. 10. 2026.)

- **Izvoz kalendara** (`sql/add-ical-export.sql`, `api/kalendar.js`, Boravci →
  Sinkronizacija): `/kalendar/<token>.ics?za=booking|airbnb` (rewrite u
  `vercel.json`, token bez `.ics` u ruti). Ruta zove `kalendar_izvoz(token)`
  **javnim ključem** (SECURITY DEFINER, kao `raspored_ciscenja`) — vraća samo
  datume i izvor. `?za=booking` izostavlja `source='ical_booking'` (inače
  Booking uvozi vlastite rezervacije i nakon otkaza ostane zaključan). Uzastopne
  noći → jedan VEVENT, DTEND ekskluzivan. Aktivne rezervacije bez dana u
  `availability` dodaju se kao `rezervacija`. Baza ne odgovara → **503**, nikad
  prazan kalendar (to bi otvorilo sve dane na portalima). Isti broj funkcija
  (11): testni feed je u istoj datoteci.
- **Suradnici** (`sql/add-team-access.sql`, Linkovi i QR → Suradnici): tablica
  `property_members` (token pozivnice, `user_id` tko je prihvatio). Politike se
  samo **dodaju** (`"suradnik"` na svakoj tablici objekta) — postojeće vlasničke
  ostaju. `je_suradnik(id)` je SECURITY DEFINER (bez rekurzije RLS-a). Okidač
  `cuvaj_vlasnika_objekta` brani promjenu `properties.user_id`; brisanje objekta
  suradnik nema. Pozivnica: `/dashboard.html?pozivnica=<token>` → bez prijave
  token čeka u `localStorage` (`odm-pozivnica`), login kaže zašto, a
  `onboarding.html` vraća na dashboard dok pozivnica čeka.
  Dashboard: `PROPS` = vlastiti + dijeljeni (`__dijeljen`, oznaka „· dijeljeno”);
  **zaključan je samo vlastiti objekt iznad limita** (`zakljucan(p)`), nikad
  dijeljeni. Na dijeljenom objektu limiti su vlasnikovi: `plan_objekta()` →
  `PROP.__plan`; u kodu `planObjekta()` i `fotoLimit()` umjesto `USER_PLAN` /
  `PHOTO_LIMIT` gdje je riječ o objektu. `api/prevedi.js` (ručni prijevodi)
  pušta i suradnika.
- **Preuzmi sadržaj iz drugog objekta** (Objekt → Osnovno, `kopirajSadrzaj()`):
  dodaje, ne briše; isti naziv/tekst se preskače; upute iz `sections` pune samo
  prazna polja i **nikad** `door_code`, `wifi_name`, `wifi_pass`, `address`.
  Upis red po red — kad baza odbije (limit plana), ostatak vrste se preskoči.

## Engleski za domaćina (2. 10. 2026.)

`domacin-jezik.js` + `domacin-en.js`, učitani u `<head>` dashboarda, prijave,
registracije, nove lozinke, potvrde e-maila, postavljanja, dodavanja objekta i
računa. Stranice su i dalje **pisane na hrvatskom**; na engleskom skripta
prevodi tekst iz rječnika (ključ = hrvatski tekst, razmaci sažeti) i prati
izmjene (`MutationObserver`: paneli, toast, poruke; `confirm`/`alert` omotani).

- Zadano je **hrvatski** i tada se rječnik ni ne učitava. Izbor (prekidač HR · EN
  u bočnoj traci dashboarda i gore desno na prijavi) pamti se u
  `localStorage` `odm-jezik-domacina`.
- **Ne prevodi se**: vrijednost polja (podaci domaćina), `<script>`, `<style>`,
  `<code>`, `[translate="no"]`. `<option>` bez `value` dobije `value` =
  hrvatski tekst prije prijevoda — u bazu i dalje ide hrvatska vrijednost.
- Redoslijed: rječnik `T` → uzorci `P` (`{}` redom ili `{1}`, `{2}` kad engleski
  mijenja red; specifičniji uzorak prvi) → dijelovi spojeni s „ · ” → datumi
  (dani, mjeseci, kratice, samo u tekstu s brojkom).
- **Novi tekst u sučelju domaćina = red u `domacin-en.js`**, inače ostaje
  hrvatski (ne pukne). Neprevedeno se skuplja u `window.__NEPREVEDENO` (sa
  `__SKUPI_SVE=true` sve, inače samo što izgleda hrvatski) — tako je testom
  pronađen ostatak.
- Gumb čiji natpis počinje s „Kopiraj” **ili „Copy”** dobije kvačicu — zato se
  „Preuzmi sadržaj” na engleskom zove „Import content”, ne „Copy …”.
- Država u analitici: `Intl.DisplayNames` po `<html lang>` (`analitika.js`).

## Prijedlog mjesta i automatski e-mail gostu (2. 10. 2026.)

- **Mjesta u blizini** (`mjesta-osm.js`, Objekt → Vodič → „Predloži mjesta u
  blizini”): preglednik domaćina zove Nominatim (adresa/mjesto → koordinate)
  i Overpass (plaže, restorani, kafići, trgovine, ljekarna u 2,5 km; drugi
  Overpass poslužitelj kao rezerva). Polje „Gdje tražiti” unaprijed puni **samo
  `properties.location`** (Osnovno); `sections.address` tek kad lokacije nema —
  spajanje obje dalo je istu adresu dvaput.
  **Adresu traže Nominatim i Photon istodobno** (ruta i preglednik):
  Nominatim ima prednost, Photon pokriva skraćenice i tipfelere („Krušaka ul.
  1a”), ali vrijedi samo ako sadrži zadnji dio upita (mjesto) —
  `photonOdgovara()`, kopija u obje datoteke. „ul.” → „ulica” je dodatna
  varijanta. Kad nijedan servis ne odgovori, ruta vraća `nedostupno:true` i
  dijalog kaže „ne javlja se”, ne „adresa nije pronađena”. Besplatno, bez ključa i bez naše rute.
  Kategorije su hrvatske i postoje u `jezici.js` (`Plaže`, `Restorani`,
  `Kafići`, `Trgovine`, `Ljekarna`); udaljenost „N min pješice/autom” (vodič je
  prevodi). `maps_query` = **koordinate** „lat,lon” (Google ih uvijek pogodi;
  „naziv, mjesto” je vodilo na adresu objekta jer u `location` zna stajati
  cijela adresa). Upis kao ručni (`local_places`), isti naziv se preskače, limit
  plana provodi baza. **Javni Overpass zna visjeti bez odgovora** (domaćin je
  vidio samo „Tražim…”): svaki zahtjev ima rok (`sRokom`, AbortController —
  Nominatim 10 s, Overpass 8 s) i dva Overpass poslužitelja, a onda **rezerva
  bez Overpassa**: Nominatim „posebni izrazi” (`beach`, `restaurant`, `cafe`,
  `supermarket`, `pharmacy`) u okviru ~2,8 km (`viewbox` + `bounded=1`),
  redom s 1,1 s razmaka (pravilo Nominatima: 1 zahtjev/s). Kod domaćina
  (3. 10.) Overpass iz preglednika nije odgovorio nikako, a Nominatim jest —
  zato rezerva. **Zatim je pao i Nominatim iz preglednika** („Pretraga adrese se
  ne javlja”) — OSM traži User-Agent i 1 zahtjev/s, a preglednik UA ne smije
  postaviti. Zato je **prvi put `api/mjesta.js`** (s tokenom domaćina): isti
  tijek na poslužitelju s `User-Agent: Odmoria/1.0 …`, razmakom 1,1 s, Photon
  (komoot) kao rezerva za adresu, rok 24 s (`maxDuration: 30`); vraća sirove
  elemente, `odaberi()` ostaje u pregledniku. `varijante()`/`upitOverpass()`
  su kopija iz `mjesta-osm.js` — mijenjati zajedno. Ne odgovori li ruta,
  preglednik ide izravno kao prije. Poruka o grešci nosi razloge (`istek`, `HTTP 429`…); dijalog javlja
  korak (`napredak`), stariji odgovor se zanemaruje (`OSM_RED`). Adresa koja
  nije nađena skraćuje se (`varijante()`: bez kućnog broja, pa bez ulice, pa
  mjesto objekta), a rezultat razine države/županije (`place_rank < 12`) se
  odbija. Natpis „© OpenStreetMap suradnici” u prozoru je obavezan
  (ODbL). Iz okruženja za razvoj OSM nije dostupan — testirano lažnim
  odgovorima; pravi poziv provjeriti na Previewu.
- **Prijedlozi adrese dok se tipka** (`adresa-predlozi.js`, 3. 10. 2026.):
  `predloziAdresu(input, {vrsta, odabrano})` na `#prop-location`, `#ci-address` /
  `#address` i `#osm-upit` (vrsta `adresa`; `mjesto` = samo mjesta, trenutno
  nigdje — vlasnik 3. 10. želi i ulicu i broj u Lokaciji, s pribadačom na
  karti javne stranice) u dashboardu, postavljanju i dodavanju objekta.
  **Kućni broj**: Photon često zna ulicu bez broja — `kucniBroj(upit)` ga
  dopiše prijedlogu („Ulica krušaka 1, Zagreb”). Država ide kroz
  `Intl.DisplayNames` po `<html lang>` („Croatia” → „Hrvatska”).
  **Photon, ne Nominatim** — Nominatim zabranjuje „traži dok tipkaš”. 300 ms
  pauze, od 3 znaka, stariji zahtjev se prekida. Lokacija uređaja: ako je već
  dopuštena, prednost oko domaćina; inače red „Koristi moju trenutnu lokaciju”
  (tek tada preglednik pita) → Photon `/reverse`. Bez nje prednost ima
  Hrvatska. Odabir okida `input` + `change` (pregled, traka za spremanje).
  Popis je `position:fixed` (kartica s `overflow:hidden` ga je rezala) i
  otvara se prema gore kad dolje nema mjesta. Combobox s ARIA, strelice,
  Enter, Esc (zatvori popis, ne dijalog). Adrese `translate="no"`. **Na mobitelu
  (≤ 760 px ili dodir)** popis je u toku stranice ispod polja (`.odm-adr--tok`),
  a polje se jednom po fokusu pomakne prema vrhu — lebdeći popis je s
  tipkovnicom padao preko upisanog teksta (vlasnik, 4. 10.). U „Mjesta
  u blizini” odabrani prijedlog nosi koordinate (`OSM_CENTAR` → `predlozi(…,
  {centar})` → `/api/mjesta?…&lat=&lon=`) pa se adresa ne geokodira ponovno.
- **Karta s pribadačom** (3. 10. 2026.): `p.html` i vodič (`#dolazak`) karte
  više ne skrivaju iza „Prikaži kartu” — Google embed `maps?q=…&output=embed`
  (s adresom pokazuje pribadaču) puni se odmah, iframe je `loading=lazy`.
  Pregled `map` u analitici sada je klik na „Otvori u Google Maps”. Na `p.html`
  rečenica „točnu adresu dobivate kasnije” (`#adr-later`) skriva se kad
  Lokacija ima broj. Vodič slaže adresu kroz `punaAdresa(address, location)` —
  bez ponavljanja kad je u Lokaciji već cijela adresa.
- **Automatski e-mail gostu** (`sql/add-guest-emails.sql`): stupci
  `bookings.guest_email`, `guest_lang`, `email_dolazak_at`, `email_ocjena_at`
  i `properties.auto_email_gostu`. `posalji_emailove_gostima()` (pg_cron
  dnevno 8:05 UTC) šalje „dolazak” (0–3 dana prije, link na vodič) i
  „ocjena” (dan odlaska ili dan poslije, `#kuca/odlazak`), svaku jednom, na
  jeziku gosta, najviše 80 po izvođenju (Resend Free = 100/dan), reply_to =
  domaćin. Gostov e-mail se briše 30 dana nakon odlaska. **SQL se odbija
  pokrenuti dok anon može čitati `bookings`** (KORAK 2 iz
  `sections-security.sql`) i bez `add-inquiry-email.sql`; cijeli je u jednoj
  transakciji (greška = ništa promijenjeno). Dashboard: obrazac rezervacije
  sprema e-mail i jezik (pogođen po domeni, `jezikIzMaila`), „Prihvati” uzima
  e-mail iz upita, popis pokazuje stanje poruka, prekidač po objektu. Bez
  stupaca `napraviRezervaciju()` ponovi upis bez e-maila — rezervacija nikad
  ne propadne zbog ove značajke.
