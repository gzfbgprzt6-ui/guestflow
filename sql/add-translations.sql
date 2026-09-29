-- ============================================================================
--  Odmoria — spremljeni prijevodi sadržaja domaćina (tablica `prijevodi`)
--  ---------------------------------------------------------------------------
--  /api/prevedi prevede tekstove koje je domaćin upisao (riječ dobrodošlice,
--  upute, pravila, pitanja, preporuke) na jezik gosta i spremi ih ovdje, pa se
--  isti tekst prevodi (i plaća) samo jednom. Ključ je sažetak (sha256) teksta
--  + jezik: promijenjeni tekst dobije novi red, stari ostaje (malen je).
--
--  Pristup: SAMO poslužitelj (service role u api/prevedi.js). Preglednik ne
--  smije ni čitati ni pisati — inače bi netko mogao podmetnuti „prijevod”.
--  Šifre (door_code, wifi_pass) ruta nikad ne šalje na prijevod, pa ih ovdje
--  nema.
--
--  Pokrenuti u Supabase SQL editoru. Idempotentno.
-- ============================================================================

create table if not exists public.prijevodi (
  hash       text not null check (hash ~ '^[0-9a-f]{40}$'),
  jezik      text not null check (jezik in ('en', 'de', 'it', 'pl', 'cs')),
  izvor      text not null,
  prijevod   text not null,
  created_at timestamptz not null default now(),
  primary key (hash, jezik)
);

alter table public.prijevodi enable row level security;
-- namjerno bez ijedne politike: anon i authenticated ne vide ništa
revoke all on public.prijevodi from anon, authenticated;

-- Brisanje svih prijevoda (npr. nakon promjene modela ili upute):
--   truncate public.prijevodi;
-- Koliko je prevedeno po jeziku:
--   select jezik, count(*), sum(char_length(izvor)) as znakova from public.prijevodi group by 1;
