-- ============================================================================
--  Odmoria — popusti na pretplate (tablica `plan_promotions`)
--  ---------------------------------------------------------------------------
--  Vlasnik u adminu (tab „Popusti”) postavi ponudu: postotak ili novu cijenu,
--  za jedan ili sve plaćene planove, mjesečno i/ili godišnje, od–do datuma,
--  za sve domaćine ili samo jednoga. Cijena se tada:
--    - PRIKAZUJE s popustom svugdje (naslovnica, Pomoć, Račun, dodavanje
--      objekta, Pretplata u dashboardu) — plans.js čita ovu tablicu,
--    - RAČUNA u bazi funkcijom `cijena_plana(plan, interval)` — to je jedino
--      mjesto koje buduća naplata (Stripe checkout) SMIJE koristiti, pa
--      prikazana i naplaćena cijena ne mogu se razići.
--  Kad rok istekne, ponuda sama prestaje vrijediti (nitko ništa ne gasi).
--
--  NAPLATA: Stripe još nije spojen (vidi CLAUDE.md), pa se danas ništa ne
--  naplaćuje. Kad se spoji, serverska funkcija za checkout pozove
--  `select public.cijena_plana('pro', 'month', <user_id>)` i naplati `cijena`.
--
--  Pokrenuti u Supabase SQL editoru. Idempotentno.
--  UID vlasnika isti je kao u sql/admin-access.sql.
-- ============================================================================

create table if not exists public.plan_promotions (
  id          uuid primary key default gen_random_uuid(),
  naziv       text not null check (char_length(btrim(naziv)) between 2 and 80),
  plan_id     text references public.plans(id) on delete cascade,    -- null = svi plaćeni planovi
  vrsta       text not null check (vrsta in ('posto', 'cijena')),     -- postotak popusta ili nova cijena u €
  vrijednost  numeric(10,2) not null check (vrijednost >= 0),
  razdoblje   text not null default 'oba' check (razdoblje in ('mjesec', 'godina', 'oba')),
  trajanje_mjeseci int check (trajanje_mjeseci is null or trajanje_mjeseci between 1 and 36),
                                                                      -- koliko dugo popust traje NAKON kupnje (null = dok traje pretplata); za Stripe kupon
  user_id     uuid,                                                   -- null = svi domaćini; inače osobni popust
  pocinje     timestamptz not null default now(),
  zavrsava    timestamptz,                                            -- null = bez isteka
  aktivan     boolean not null default true,                          -- „Zaustavi” u adminu
  created_at  timestamptz not null default now(),
  constraint plan_promotions_posto check (vrsta <> 'posto' or (vrijednost > 0 and vrijednost <= 100)),
  constraint plan_promotions_rok   check (zavrsava is null or zavrsava > pocinje),
  -- fiksna nova cijena vrijedi za JEDNO razdoblje (9,99 € mjesečno ≠ 9,99 € godišnje)
  constraint plan_promotions_cijena_razdoblje check (vrsta <> 'cijena' or razdoblje <> 'oba')
);

create index if not exists plan_promotions_plan on public.plan_promotions (plan_id, pocinje);

alter table public.plan_promotions enable row level security;

-- Svi vide samo ponude koje UPRAVO vrijede — općenite, i osobne samo svoje.
drop policy if exists "promocije: aktivne vide svi" on public.plan_promotions;
create policy "promocije: aktivne vide svi" on public.plan_promotions for select to anon, authenticated
  using (aktivan and pocinje <= now() and (zavrsava is null or zavrsava > now())
         and (user_id is null or user_id = auth.uid()));

-- Vlasnik platforme vidi i mijenja sve (zakazane, istekle, zaustavljene).
drop policy if exists "promocije: admin upravlja" on public.plan_promotions;
create policy "promocije: admin upravlja" on public.plan_promotions for all to authenticated
  using (auth.uid() = '56549320-2c02-405c-9936-770144bd9b49')
  with check (auth.uid() = '56549320-2c02-405c-9936-770144bd9b49');

revoke all on public.plan_promotions from anon;
grant select on public.plan_promotions to anon;
grant select, insert, update, delete on public.plan_promotions to authenticated;


-- ----------------------------------------------------------------------------
--  Cijena plana s popustom — JEDINI izvor iznosa za naplatu.
--  Ista logika kao `popustZa()` u plans.js: od svih ponuda koje vrijede za
--  plan, razdoblje i korisnika uzima se ona s najnižom cijenom.
-- ----------------------------------------------------------------------------
create or replace function public.cijena_plana(p_plan text, p_razdoblje text default 'mjesec', p_user uuid default auth.uid())
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  redovna  numeric;
  kandidat numeric;
  b_cijena numeric;
  b_id     uuid;
  b_naziv  text;
  b_do     timestamptz;
  b_traje  int;
  r        record;
begin
  select case when p_razdoblje = 'godina' then yearly_price_eur else monthly_price_eur end
    into redovna from public.plans where id = p_plan;
  if redovna is null then
    return jsonb_build_object('greska', 'nepoznat plan');
  end if;

  if redovna > 0 then
    for r in
      select * from public.plan_promotions
      where aktivan and pocinje <= now() and (zavrsava is null or zavrsava > now())
        and (plan_id is null or plan_id = p_plan)
        and (razdoblje = 'oba' or razdoblje = p_razdoblje)
        and (user_id is null or user_id = p_user)
    loop
      kandidat := case when r.vrsta = 'posto' then round(redovna * (1 - r.vrijednost / 100), 2)
                       else least(redovna, r.vrijednost) end;
      if b_cijena is null or kandidat < b_cijena then
        b_cijena := kandidat; b_id := r.id; b_naziv := r.naziv; b_do := r.zavrsava; b_traje := r.trajanje_mjeseci;
      end if;
    end loop;
  end if;

  return jsonb_build_object(
    'plan', p_plan, 'razdoblje', p_razdoblje, 'redovna', redovna,
    'cijena', coalesce(b_cijena, redovna),
    'ponuda', case when b_id is null then null
                   else jsonb_build_object('id', b_id, 'naziv', b_naziv, 'zavrsava', b_do, 'trajanje_mjeseci', b_traje) end);
end;
$$;

-- Tuđi osobni popust ne smije se moći „isprobati” tuđim user_id-em: za
-- anonimne i prijavljene funkcija uvijek računa za auth.uid(), a p_user
-- poštuje samo poslužiteljska uloga (service_role, buduća naplata).
create or replace function public.cijena_plana_za_mene(p_plan text, p_razdoblje text default 'mjesec')
returns jsonb language sql stable security definer set search_path = public, pg_temp
as $$ select public.cijena_plana(p_plan, p_razdoblje, auth.uid()) $$;

revoke all on function public.cijena_plana(text, text, uuid) from public, anon, authenticated;
revoke all on function public.cijena_plana_za_mene(text, text) from public;
grant execute on function public.cijena_plana_za_mene(text, text) to anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.cijena_plana(text, text, uuid) to service_role;
  end if;
end $$;
