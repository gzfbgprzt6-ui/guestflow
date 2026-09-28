-- ============================================================================
--  Odmoria — država posjetitelja uz svaki pregled (analitika „po državama”)
--  ---------------------------------------------------------------------------
--  Državu upisuje /api/track iz Vercelova zaglavlja `x-vercel-ip-country`
--  (ISO 3166-1 alpha-2, npr. HR, DE, AT). IP adresa se NE sprema.
--  Dok ovo nije pokrenuto, /api/track piše red bez države i analitika
--  pokazuje napomenu umjesto popisa država — ništa se ne ruši.
--
--  Pokrenuti u Supabase SQL editoru. Idempotentno.
-- ============================================================================

-- 0. PROVJERA (samo čita): postoji li stupac već i što je u njemu.
--    `add column if not exists` tiho preskoči postojeći stupac (vidi CLAUDE.md),
--    pa ako ovo vrati redak, pogledati vrijednosti prije koraka 1.
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'page_views';

-- 1. Stupac i provjera oblika (dvoslovna oznaka ili prazno)
alter table public.page_views add column if not exists country text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'page_views_country_iso') then
    alter table public.page_views
      add constraint page_views_country_iso check (country is null or country ~ '^[A-Z]{2}$');
  end if;
end $$;

-- 2. Indeks za analitiku (dashboard i admin čitaju po objektu i vremenu).
--    Nije nužan za rad; ubrzava kad pregleda bude puno.
create index if not exists page_views_property_ts on public.page_views (property_id, "timestamp");

-- Pravila (RLS) se ne mijenjaju: upis i dalje ide pravilom
-- „Anyone can log a page view”, čitanje pravilima vlasnika i admina.
