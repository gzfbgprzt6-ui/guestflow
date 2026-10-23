-- =====================================================================
-- Provjeren domaćin — ručna provjera (P1-3, vlasnik 23. 10. 2026.)
--
-- Samo plaćeni planovi (mogućnost „provjera” u plans.mogucnosti; Free je nema).
-- Domaćin u Postavkama → Sigurnost pošalje zahtjev: ime i prezime, OIB (ili
-- OIB obrta i naziv). Baza uz zahtjev sama zapiše IBAN i primatelja iz računa
-- (user_metadata) i registracijske brojeve njegovih objekata — to je ono što
-- vlasnik platforme provjerava. (Prijava u dva koraka namjerno NIJE uvjet —
-- vlasnik, 23. 10.: domaćinima je nejasna; štiti zaključani IBAN, vidi niže.)
--
-- Vlasnik platforme u adminu (tab Provjere) klikne Provjeren / Odbij.
-- Oznaka „Provjeren domaćin” na javnoj stranici vrijedi dok:
--   • je stanje „provjeren”,
--   • plan još ima mogućnost „provjera”,
--   • su IBAN i primatelj u računu ISTI kao u trenutku provjere.
-- Promjena IBAN-a ili primatelja = oznaka nestaje dok se ne pošalje nova
-- provjera (zaključan račun za uplatu: nitko ga ne može tiho zamijeniti).
--
-- Domaćin tablicu samo čita (svoj red); piše se isključivo kroz funkcije.
-- Pokrenuti jednom; ponavljanje ne mijenja ništa.
-- =====================================================================

create table if not exists public.provjere_domacina (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  stanje         text not null default 'ceka' check (stanje in ('ceka', 'provjeren', 'odbijen')),
  ime            text not null check (length(ime) between 2 and 120),
  oib            text not null check (oib ~ '^[0-9]{11}$'),
  obrt           text check (obrt is null or length(obrt) <= 160),
  napomena       text check (napomena is null or length(napomena) <= 600),
  iban           text not null check (length(iban) between 15 and 40),
  primatelj      text not null check (length(primatelj) between 2 and 120),
  objekti        jsonb not null default '[]'::jsonb,
  poslano_at     timestamptz not null default now(),
  provjereno_at  timestamptz,
  razlog         text check (razlog is null or length(razlog) <= 400)
);

alter table public.provjere_domacina enable row level security;
revoke all on public.provjere_domacina from anon, authenticated;
grant select on public.provjere_domacina to authenticated;
drop policy if exists "domacin cita svoju provjeru" on public.provjere_domacina;
create policy "domacin cita svoju provjeru" on public.provjere_domacina
  for select to authenticated using (user_id = auth.uid());

-- plaćeni planovi dobivaju mogućnost „provjera” (Free ne)
update public.plans set mogucnosti = mogucnosti || '["provjera"]'::jsonb
 where id in ('pro', 'business') and not (mogucnosti ? 'provjera');

-- IBAN bez razmaka, velikim slovima (dashboard sprema „HR12 3456 …”)
create or replace function public._iban_norm(t text)
 returns text language sql immutable as $$
  select nullif(regexp_replace(upper(coalesce(t, '')), '[^A-Z0-9]', '', 'g'), '')
$$;

-- OIB: 11 znamenaka + kontrolna znamenka (ISO 7064, MOD 11,10)
create or replace function public._oib_ispravan(o text)
 returns boolean language plpgsql immutable as $$
declare
  a int := 10;
  i int;
begin
  if o is null or o !~ '^[0-9]{11}$' then return false; end if;
  for i in 1..10 loop
    a := (a + substr(o, i, 1)::int) % 10;
    if a = 0 then a := 10; end if;
    a := (a * 2) % 11;
  end loop;
  return (11 - a) % 10 = substr(o, 11, 1)::int;
end;
$$;

create or replace function public._plan_ima(p_user uuid, p_kljuc text)
 returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select pl.mogucnosti ? p_kljuc from public.plans pl
                    where pl.id = public.current_plan_id(p_user)), false)
$$;
revoke all on function public._plan_ima(uuid, text) from public, anon, authenticated;

-- vrijedi li oznaka (stanje + plan + isti račun za uplatu)
create or replace function public.provjeren_domacin(p_user uuid)
 returns boolean language sql stable security definer set search_path = public, auth, pg_temp as $$
  select exists (
    select 1 from public.provjere_domacina v join auth.users u on u.id = v.user_id
     where v.user_id = p_user and v.stanje = 'provjeren'
       and public._iban_norm(u.raw_user_meta_data ->> 'iban') = public._iban_norm(v.iban)
       and btrim(coalesce(u.raw_user_meta_data ->> 'primatelj', '')) = btrim(v.primatelj))
   and public._plan_ima(p_user, 'provjera')
$$;
revoke all on function public.provjeren_domacin(uuid) from public, anon, authenticated;

-- stanje za domaćina (Postavke → Sigurnost, Cijene → IBAN)
create or replace function public.moja_provjera()
 returns jsonb language plpgsql stable security definer set search_path = public, auth, pg_temp as $$
declare
  uid uuid := auth.uid();
  v public.provjere_domacina%rowtype;
  m jsonb;
begin
  if uid is null then return jsonb_build_object('stanje', 'prijava'); end if;
  select raw_user_meta_data into m from auth.users where id = uid;
  select * into v from public.provjere_domacina where user_id = uid;
  return jsonb_build_object(
    'smije',     public._plan_ima(uid, 'provjera'),
    'stanje',    case when v.user_id is null then 'nema' else v.stanje end,
    'vrijedi',   public.provjeren_domacin(uid),
    'racun_isti', v.user_id is not null
                  and public._iban_norm(m ->> 'iban') is not distinct from public._iban_norm(v.iban)
                  and btrim(coalesce(m ->> 'primatelj', '')) = btrim(v.primatelj),
    'ime', v.ime, 'obrt', v.obrt, 'iban', v.iban, 'primatelj', v.primatelj,
    'poslano_at', v.poslano_at, 'provjereno_at', v.provjereno_at, 'razlog', v.razlog);
end;
$$;
revoke all on function public.moja_provjera() from public, anon;
grant execute on function public.moja_provjera() to authenticated;

create or replace function public.zatrazi_provjeru(p_ime text, p_oib text, p_obrt text default null, p_napomena text default null)
 returns jsonb language plpgsql volatile security definer set search_path = public, auth, pg_temp as $$
declare
  uid uuid := auth.uid();
  m jsonb;
  ib text;
  pr text;
  ob jsonb;
  ime text := left(btrim(coalesce(p_ime, '')), 120);
  oib text := regexp_replace(coalesce(p_oib, ''), '\s', '', 'g');
begin
  if uid is null then return jsonb_build_object('stanje', 'prijava'); end if;
  if not public._plan_ima(uid, 'provjera') then return jsonb_build_object('stanje', 'plan'); end if;
  if length(ime) < 2 then return jsonb_build_object('stanje', 'ime'); end if;
  if not public._oib_ispravan(oib) then return jsonb_build_object('stanje', 'oib'); end if;
  select raw_user_meta_data into m from auth.users where id = uid;
  ib := btrim(coalesce(m ->> 'iban', ''));
  pr := left(btrim(coalesce(m ->> 'primatelj', '')), 120);
  if length(public._iban_norm(ib)) < 15 or length(pr) < 2 then
    return jsonb_build_object('stanje', 'iban');
  end if;
  if exists (select 1 from public.provjere_domacina where user_id = uid and stanje = 'ceka'
              and poslano_at > now() - interval '1 minute') then
    return jsonb_build_object('stanje', 'prebrzo');
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'naziv', p.name, 'slug', p.slug,
                                               'registracijski_broj', p.registracijski_broj) order by p.created_at), '[]'::jsonb)
    into ob from public.properties p where p.user_id = uid;
  insert into public.provjere_domacina (user_id, stanje, ime, oib, obrt, napomena, iban, primatelj, objekti, poslano_at, provjereno_at, razlog)
  values (uid, 'ceka', ime, oib, nullif(left(btrim(coalesce(p_obrt, '')), 160), ''),
          nullif(left(btrim(coalesce(p_napomena, '')), 600), ''), left(ib, 40), pr, ob, now(), null, null)
  on conflict (user_id) do update set stanje = 'ceka', ime = excluded.ime, oib = excluded.oib, obrt = excluded.obrt,
    napomena = excluded.napomena, iban = excluded.iban, primatelj = excluded.primatelj, objekti = excluded.objekti,
    poslano_at = now(), provjereno_at = null, razlog = null;
  return jsonb_build_object('stanje', 'ok');
end;
$$;
revoke all on function public.zatrazi_provjeru(text, text, text, text) from public, anon;
grant execute on function public.zatrazi_provjeru(text, text, text, text) to authenticated;

-- admin: popis zahtjeva (isti vlasnički račun kao admin_korisnici())
create or replace function public.admin_provjere()
 returns jsonb language plpgsql stable security definer set search_path = public, auth, pg_temp as $$
begin
  if auth.uid() is distinct from '56549320-2c02-405c-9936-770144bd9b49'::uuid then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'user_id', v.user_id, 'email', u.email, 'stanje', v.stanje, 'ime', v.ime, 'oib', v.oib, 'obrt', v.obrt,
      'napomena', v.napomena, 'iban', v.iban, 'primatelj', v.primatelj, 'objekti', v.objekti,
      'poslano_at', v.poslano_at, 'provjereno_at', v.provjereno_at, 'razlog', v.razlog,
      'plan', public.current_plan_id(v.user_id), 'vrijedi', public.provjeren_domacin(v.user_id),
      'racun_isti', public._iban_norm(u.raw_user_meta_data ->> 'iban') is not distinct from public._iban_norm(v.iban)
                    and btrim(coalesce(u.raw_user_meta_data ->> 'primatelj', '')) = btrim(v.primatelj))
      order by (v.stanje = 'ceka') desc, v.poslano_at desc)
    from public.provjere_domacina v join auth.users u on u.id = v.user_id), '[]'::jsonb);
end;
$$;
revoke all on function public.admin_provjere() from public, anon;
grant execute on function public.admin_provjere() to authenticated;

create or replace function public.admin_odluci_provjeru(p_user uuid, p_odluka text, p_razlog text default null)
 returns jsonb language plpgsql volatile security definer set search_path = public, auth, pg_temp as $$
declare
  n int;
begin
  if auth.uid() is distinct from '56549320-2c02-405c-9936-770144bd9b49'::uuid then
    return jsonb_build_object('stanje', 'zabranjeno');
  end if;
  if p_odluka not in ('provjeren', 'odbijen') then return jsonb_build_object('stanje', 'neispravno'); end if;
  update public.provjere_domacina
     set stanje = p_odluka, provjereno_at = now(),
         razlog = case when p_odluka = 'odbijen' then nullif(left(btrim(coalesce(p_razlog, '')), 400), '') end
   where user_id = p_user;
  get diagnostics n = row_count;
  return jsonb_build_object('stanje', case when n = 1 then 'ok' else 'nema' end);
end;
$$;
revoke all on function public.admin_odluci_provjeru(uuid, text, text) from public, anon;
grant execute on function public.admin_odluci_provjeru(uuid, text, text) to authenticated;

-- javna stranica: oznaka i ime primatelja (gost ga uspoređuje s imenom u banci)
create or replace function public.javno_o_objektu(p_slug text)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  p public.properties%rowtype;
  bez_oznake boolean := false;
  prov boolean := false;
  pv public.provjere_domacina%rowtype;
begin
  select * into p from public.properties where slug = p_slug limit 1;
  if not found then return jsonb_build_object('stanje', 'missing'); end if;
  begin
    select coalesce(pl.can_remove_branding, false) into bez_oznake
      from public.plans pl where pl.id = public.current_plan_id(p.user_id);
  exception when others then bez_oznake := false;   -- bez planova: oznaka se vidi
  end;
  prov := public.provjeren_domacin(p.user_id);
  if prov then select * into pv from public.provjere_domacina where user_id = p.user_id; end if;
  return jsonb_build_object(
    'stanje', 'ok',
    'oznaka', not coalesce(bez_oznake, false),
    'provjera', case when prov then jsonb_build_object('primatelj', pv.primatelj,
                  'od', (pv.provjereno_at at time zone 'Europe/Zagreb')::date) end,
    'prosjek', (select round(avg(ocjena)::numeric, 1) from public.reviews
                 where property_id = p.id and javno and not skriveno),
    'broj', (select count(*) from public.reviews where property_id = p.id and javno and not skriveno),
    'kategorije', (select jsonb_object_agg(k, pr) from (
        select e.key k, round(avg((e.value)::text::numeric), 1) pr
          from public.reviews r, jsonb_each(r.ocjene) e
         where r.property_id = p.id and r.javno and not r.skriveno and r.ocjene is not null
         group by e.key) x),
    'recenzije', coalesce((select jsonb_agg(x order by x.created_at desc) from (
        select ocjena, ocjene, tekst, ime, created_at from public.reviews
         where property_id = p.id and javno and not skriveno
         order by created_at desc limit 20) x), '[]'::jsonb));
end;
$function$;

-- Provjera nakon pokretanja:
-- select id, mogucnosti ? 'provjera' from public.plans order by sort_order;
