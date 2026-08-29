# Odmoria

Digitalni vodiči za goste kratkoročnih najma. Javna stranica za marketing, privatni link za potvrđene goste. Bez provizije po rezervaciji.

**Live:** [odmoria.com](https://odmoria.com) · **Staging:** [guestflow-gamma.vercel.app](https://guestflow-gamma.vercel.app)

---

## Struktura projekta

```
odmoria/
├── index.html              # Landing page (marketing)
├── register.html           # Registracija
├── login.html              # Prijava
├── dashboard.html          # Host dashboard (Supabase connected)
├── p.html                  # Javna stranica objekta (/p/[slug])
├── h.html                  # Privatni gostinski hub (/h/[slug]-[token])
├── reset-password.html     # Reset lozinke
├── terms.html              # Uvjeti korištenja
├── privacy.html            # Pravila privatnosti
├── 404.html                # Stranica nije pronađena
├── vercel.json             # Routing i sigurnosni headeri
├── plans.js                # Plan limiti (Free/Pro/Business) — frontend
├── billing.js              # Stripe checkout/portal — frontend
├── api/
│   ├── _lib.js             # Zajednički Stripe + Supabase helpers
│   ├── create-checkout-session.js
│   ├── create-portal-session.js
│   ├── stripe-webhook.js
│   └── track-event.js
└── README.md
```

## Tech stack

- **Frontend:** HTML/CSS/JavaScript (bez frameworka)
- **Backend/baza:** [Supabase](https://supabase.com) (PostgreSQL + Auth + Storage)
- **Hosting:** [Vercel](https://vercel.com) (Hobby plan)
- **Plaćanje:** [Stripe](https://stripe.com) (TODO: tjedan 4)

## Supabase setup

1. Stvori projekt na [supabase.com](https://supabase.com)
2. Pokreni `guestflow-supabase-schema.sql` u SQL Editoru
3. Pokreni `odmoria-migration-001.sql` (plan limiti)
4. Kopiraj Project URL i publishable key u HTML datoteke

## Vercel setup

1. Poveži GitHub repo s Vercelom
2. Svaki push na `main` automatski deploya

## Planovi

| Plan     | Objekti | Cijena       |
|----------|---------|--------------|
| Free     | 1       | €0 zauvijek  |
| Pro      | 5       | €15/mj       |
| Business | 15      | €49/mj       |

## Razvoj po tjednima

- ✅ **Tjedan 1:** Infrastruktura (Supabase, GitHub, Vercel, landing page, auth)
- 🔄 **Tjedan 2:** Dashboard koji sprema podatke u bazu
- ⬜ **Tjedan 3:** Javna i gostinska stranica iz baze, QR kod
- ⬜ **Tjedan 4:** Stripe naplata
- ⬜ **Tjedan 5:** Prvi korisnici (20 iznajmljivača direktno)

## Kontakt

podrska@odmoria.com
