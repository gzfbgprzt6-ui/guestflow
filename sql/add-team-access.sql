-- ============================================================================
--  Odmoria — timski pristup: SURADNIK na objektu
--  ---------------------------------------------------------------------------
--  Vlasnik u dashboardu (Linkovi i QR → Suradnici) napravi pozivnicu i link
--  pošalje suvlasniku, članu obitelji ili agenciji. Suradnik se prijavi
--  (ili registrira) i otvori link → prihvati_pozivnicu(token).
--
--  Suradnik smije SVE što treba za vođenje objekta: sadržaj, fotografije,
--  kalendar i sinkronizacija, rezervacije, upiti, recenzije, podaci gostiju,
--  linkovi za čistačicu i kalendar.
--  Suradnik NE smije: obrisati objekt, prenijeti ga na sebe (user_id),
--  mijenjati pretplatu ni upravljati suradnicima. Limiti plana su i dalje
--  limiti VLASNIKA (sql/plan-limits.sql gleda properties.user_id).
--
--  Postojeće politike se NE mijenjaju — dodaju se nove, a Postgres politike
--  istog naredbenog tipa spaja s OR. Tablica koja ne postoji se preskoči.
--  Pokrenuti u Supabase SQL editoru. Idempotentno.
-- ============================================================================

create table if not exists public.property_members (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  token       text not null unique check (token ~ '^[a-z0-9]{16,64}$'),
  ime         text check (ime is null or length(ime) <= 80),   -- oznaka koju upiše vlasnik
  user_id     uuid,                                            -- tko je prihvatio
  email       text,                                            -- e-mail računa koji je prihvatio
  created_at  timestamptz not null default now(),
  accepted_at timestamptz,
  unique (property_id, user_id)
);
create index if not exists property_members_user on public.property_members(user_id);

alter table public.property_members enable row level security;

-- Je li prijavljeni korisnik prihvaćeni suradnik na objektu?
create or replace function public.je_suradnik(p_property uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (select 1 from public.property_members m
                  where m.property_id = p_property and m.user_id = auth.uid() and m.accepted_at is not null)
$$;
revoke all on function public.je_suradnik(uuid) from public;
grant execute on function public.je_suradnik(uuid) to authenticated;

drop policy if exists "suradnici: vlasnik upravlja" on public.property_members;
create policy "suradnici: vlasnik upravlja" on public.property_members for all to authenticated
  using (exists (select 1 from public.properties p where p.id = property_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.properties p where p.id = property_id and p.user_id = auth.uid()));
drop policy if exists "suradnici: vidi i napusti svoje" on public.property_members;
create policy "suradnici: vidi i napusti svoje" on public.property_members for select to authenticated
  using (user_id = auth.uid());
drop policy if exists "suradnici: napusti" on public.property_members;
create policy "suradnici: napusti" on public.property_members for delete to authenticated
  using (user_id = auth.uid());

revoke all on public.property_members from anon;
grant select, insert, update, delete on public.property_members to authenticated;

-- ── Objekt: suradnik čita i mijenja, ali ne briše i ne preuzima ──────────────
drop policy if exists "suradnik čita objekt" on public.properties;
create policy "suradnik čita objekt" on public.properties for select to authenticated
  using (public.je_suradnik(id));
drop policy if exists "suradnik mijenja objekt" on public.properties;
create policy "suradnik mijenja objekt" on public.properties for update to authenticated
  using (public.je_suradnik(id)) with check (public.je_suradnik(id));

-- Nitko osim vlasnika ne smije promijeniti vlasnika objekta.
create or replace function public.cuvaj_vlasnika_objekta()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if new.user_id is distinct from old.user_id and auth.uid() is not null and auth.uid() is distinct from old.user_id then
    raise exception 'Samo vlasnik može promijeniti vlasnika objekta.' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_cuvaj_vlasnika on public.properties;
create trigger trg_cuvaj_vlasnika before update of user_id on public.properties
  for each row execute function public.cuvaj_vlasnika_objekta();

-- ── Sve tablice objekta (property_id) ───────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['sections','amenities','local_places','transport','attractions','house_rules','faq',
                           'availability','bookings','inquiries','reviews','guest_registrations',
                           'cleaner_links','calendar_exports'] loop
    if to_regclass('public.' || t) is null then
      raise notice 'preskačem % (tablica ne postoji)', t; continue;
    end if;
    execute format('drop policy if exists "suradnik" on public.%I', t);
    execute format('create policy "suradnik" on public.%I for all to authenticated
                    using (public.je_suradnik(property_id)) with check (public.je_suradnik(property_id))', t);
  end loop;
  if to_regclass('public.page_views') is not null then
    execute 'drop policy if exists "suradnik čita" on public.page_views';
    execute 'create policy "suradnik čita" on public.page_views for select to authenticated using (public.je_suradnik(property_id))';
  end if;
end $$;

-- ── Pozivnica ───────────────────────────────────────────────────────────────
-- { stanje: ok | invalid | vlastiti | iskoristeno | prijava, property_id, objekt }
create or replace function public.prihvati_pozivnicu(p_token text)
returns jsonb language plpgsql volatile security definer set search_path = public, pg_temp
as $$
declare
  m public.property_members%rowtype;
  p public.properties%rowtype;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then return jsonb_build_object('stanje', 'prijava'); end if;
  if p_token is null or p_token !~ '^[a-z0-9]{16,64}$' then return jsonb_build_object('stanje', 'invalid'); end if;
  select * into m from public.property_members where token = p_token for update;
  if not found then return jsonb_build_object('stanje', 'invalid'); end if;
  select * into p from public.properties where id = m.property_id;
  if not found then return jsonb_build_object('stanje', 'invalid'); end if;
  if p.user_id = v_uid then return jsonb_build_object('stanje', 'vlastiti', 'property_id', p.id, 'objekt', p.name); end if;
  if m.user_id is not null and m.user_id <> v_uid then return jsonb_build_object('stanje', 'iskoristeno'); end if;
  if m.user_id is null then
    -- isti korisnik već ima drugu pozivnicu za ovaj objekt → ova je višak
    if exists (select 1 from public.property_members x where x.property_id = m.property_id and x.user_id = v_uid) then
      delete from public.property_members where id = m.id;
    else
      update public.property_members
         set user_id = v_uid, accepted_at = now(),
             email = (select u.email from auth.users u where u.id = v_uid)
       where id = m.id;
    end if;
  end if;
  return jsonb_build_object('stanje', 'ok', 'property_id', p.id, 'objekt', p.name);
end;
$$;
revoke all on function public.prihvati_pozivnicu(text) from public;
grant execute on function public.prihvati_pozivnicu(text) to authenticated;

-- Plan objekta (vlasnikov) — da sučelje suradnika pokaže iste limite koje
-- provodi baza. Samo za vlasnika i suradnika; inače null.
create or replace function public.plan_objekta(p_property uuid)
returns text language sql stable security definer set search_path = public, pg_temp
as $$
  select public.current_plan_id(p.user_id) from public.properties p
   where p.id = p_property and (p.user_id = auth.uid() or public.je_suradnik(p.id))
$$;
revoke all on function public.plan_objekta(uuid) from public;
grant execute on function public.plan_objekta(uuid) to authenticated;
