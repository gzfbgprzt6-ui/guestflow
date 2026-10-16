-- =====================================================================
--  Preporuči domaćina (16. 10. 2026.)
--  Svaki domaćin ima svoj link /register.html?preporuka=<kod> (kod = prvih
--  8 znakova njegovog id-ja, bez crtica). Kad se netko registrira preko
--  njega, u user_metadata novog računa upiše se `preporucio: <kod>`.
--  Ova funkcija domaćinu kaže koliko ih se registriralo i koliko ih je već
--  postavilo objekt. NAGRADU (npr. mjesec Pro) zasad odobrava vlasnik
--  Odmorije ručno u adminu (Domaćini → pretplata) — ništa se ne dodjeljuje
--  automatski, pa lažni računi ne donose besplatne mjesece.
--
--  Pokrenuti u Supabase SQL editoru JEDNOM (smije se ponoviti).
--  Ne mijenja tablice ni politike; čita auth.users samo unutar funkcije.
-- =====================================================================

create or replace function public.moje_preporuke()
returns jsonb language sql stable security definer set search_path = public, auth, pg_temp
as $$
  with kod as (select left(replace(auth.uid()::text, '-', ''), 8) as k)
  select case when auth.uid() is null then jsonb_build_object('stanje', 'neprijavljen') else
    jsonb_build_object(
      'stanje', 'ok',
      'kod', (select k from kod),
      'registrirano', (select count(*) from auth.users u, kod
                        where u.raw_user_meta_data ->> 'preporucio' = kod.k and u.id <> auth.uid()),
      's_objektom', (select count(*) from auth.users u, kod
                      where u.raw_user_meta_data ->> 'preporucio' = kod.k and u.id <> auth.uid()
                        and exists (select 1 from public.properties p where p.user_id = u.id)))
  end
$$;

revoke all on function public.moje_preporuke() from public, anon;
grant execute on function public.moje_preporuke() to authenticated;

-- za admina (isti UID kao sql/admin-upgrades.sql): tko je koga preporučio — samo vlasnik Odmorije
create or replace function public.admin_preporuke()
returns table (preporucio text, korisnik uuid, email text, registriran timestamptz, ima_objekt boolean)
language plpgsql stable security definer set search_path = public, auth, pg_temp
as $$
begin
  if auth.uid() is distinct from '56549320-2c02-405c-9936-770144bd9b49'::uuid then
    return;   -- isti vlasnički račun kao admin_korisnici() (sql/admin-upgrades.sql)
  end if;
  return query
    select u.raw_user_meta_data ->> 'preporucio', u.id, u.email::text, u.created_at,
           exists (select 1 from public.properties p where p.user_id = u.id)
      from auth.users u
     where coalesce(u.raw_user_meta_data ->> 'preporucio', '') <> ''
     order by u.created_at desc;
end;
$$;
revoke all on function public.admin_preporuke() from public, anon;
grant execute on function public.admin_preporuke() to authenticated;
