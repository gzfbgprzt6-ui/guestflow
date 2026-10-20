-- =====================================================================
--  Vlastita adresa ime.odmoria.hr — plaćeni dodatak po objektu
--  (v5, 20. 10. 2026. — odluke, točka 38)
--
--  properties.poddomena     „vila-maslina” → vila-maslina.odmoria.hr
--                           (domaćin je bira u dashboardu, jedinstvena)
--  properties.poddomena_do  do kada je plaćena — upisuje SAMO
--                           api/stripe-webhook.js (poslužiteljski ključ);
--                           okidač ne pušta preglednik da je mijenja
--  dodaci                   cjenik dodataka; cijena se mijenja ovdje
--                           (UPDATE, bez koda): cijena_god = godišnje po objektu
--
--  Adresa radi samo dok je poddomena_do u budućnosti (api/stranica.js).
--  Bez riječi za brisanje — smije se pokrenuti konektorom. Ponovljivo.
-- =====================================================================

begin;

create table if not exists public.dodaci (
  id          text primary key,
  naziv       text not null,
  opis        text,
  cijena_god  numeric(10,2) not null check (cijena_god >= 0),
  aktivan     boolean not null default true
);
alter table public.dodaci enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'dodaci' and policyname = 'dodaci: svi čitaju') then
    create policy "dodaci: svi čitaju" on public.dodaci for select to anon, authenticated using (true);
  end if;
end $$;
grant select on public.dodaci to anon, authenticated;

insert into public.dodaci (id, naziv, opis, cijena_god)
values ('poddomena', 'Vlastita adresa', 'Javna stranica na adresi ime.odmoria.hr', 19)
on conflict (id) do nothing;

alter table public.properties add column if not exists poddomena text;
alter table public.properties add column if not exists poddomena_do timestamptz;

do $$ begin
  alter table public.properties add constraint properties_poddomena_chk check (
    poddomena is null or (
      poddomena ~ '^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])$'
      and poddomena not like '%--%'
      and poddomena not in ('www','app','api','admin','mail','smtp','ftp','dashboard','odmoria','pomoc','help',
                            'login','register','status','blog','static','cdn','test','demo','h','p','c')));
exception when duplicate_object then null; end $$;
create unique index if not exists properties_poddomena_jedinstvena on public.properties (poddomena) where poddomena is not null;

-- poddomena_do smije mijenjati samo poslužitelj (webhook nakon plaćanja)
create or replace function public.cuvaj_poddomenu()
returns trigger language plpgsql set search_path = public, pg_temp   -- namjerno BEZ security definer: current_user = tko piše
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.poddomena_do := null;
    elsif new.poddomena_do is distinct from old.poddomena_do then
      raise exception 'Rok vlastite adrese mijenja se samo plaćanjem.' using errcode = '42501';
    end if;
    -- dok je adresa plaćena, ime se ne mijenja (Stripe pretplata nosi to ime)
    if tg_op = 'UPDATE' and old.poddomena_do is not null and old.poddomena_do > now()
       and new.poddomena is distinct from old.poddomena then
      raise exception 'Plaćena adresa se ne može preimenovati — javite se podršci.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create or replace trigger trg_cuvaj_poddomenu before insert or update of poddomena, poddomena_do on public.properties
  for each row execute function public.cuvaj_poddomenu();

-- je li ime slobodno (za provjeru dok domaćin tipka)
create or replace function public.poddomena_slobodna(p_ime text, p_objekt uuid default null)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$
  select p_ime ~ '^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])$'
     and p_ime not like '%--%'
     and p_ime not in ('www','app','api','admin','mail','smtp','ftp','dashboard','odmoria','pomoc','help',
                       'login','register','status','blog','static','cdn','test','demo','h','p','c')
     and not exists (select 1 from public.properties where poddomena = p_ime and id is distinct from p_objekt)
$$;
revoke all on function public.poddomena_slobodna(text, uuid) from public;
grant execute on function public.poddomena_slobodna(text, uuid) to authenticated;

commit;

-- cijena: update public.dodaci set cijena_god = 29 where id = 'poddomena';
