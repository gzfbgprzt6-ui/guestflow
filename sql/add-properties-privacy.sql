-- =====================================================================
--  Tajni stupci objekta više nisu javni (21. 10. 2026. — odluke, točka 45)
--
--  Problem: politika public_read_by_slug (using true, za SVE uloge) i puno
--  pravo čitanja tablice properties značili su da svatko s javnim ključem,
--  i bez prijave, čita SVE objekte sa SVIM stupcima — guest_token (stari
--  opći link vodiča) i ical_booking_url / ical_airbnb_url (tajne adrese
--  kalendara platformi).
--
--  KORAK A (sigurno odmah): javni_objekt(slug, pod) — SECURITY DEFINER, vraća
--  red objekta BEZ tajnih stupaca. p.html i api/stranica.js čitaju preko nje
--  (rezerva: stari select dok funkcije nema).
--
--  KORAK B (TEK kad je nova p.html / stranica.js objavljena):
--   - anon smije čitati samo netajne stupce (stupčana prava; id i user_id
--     ostaju jer ih trebaju politike drugih tablica u podupitima);
--   - politika public_read_by_slug vrijedi samo za anon — prijavljeni drugi
--     domaćin više ne vidi tuđe objekte (vlasnik, suradnik i admin imaju
--     svoje politike i dalje čitaju sve stupce).
--  NOVI STUPAC u properties nakon ovoga anon NE vidi dok ga se ne doda
--  (javna stranica ga i tako dobiva kroz javni_objekt).
--
--  Bez brisanja. Ponovljivo.
-- =====================================================================

-- KORAK A ---------------------------------------------------------------
begin;

create or replace function public.javni_objekt(p_slug text default null, p_pod text default null)
returns jsonb language sql stable security definer set search_path = public, pg_temp
as $$
  select to_jsonb(p) - 'guest_token' - 'ical_booking_url' - 'ical_airbnb_url'
    from public.properties p
   where (p_slug is not null and p.slug = p_slug)
      or (p_slug is null and p_pod is not null and p.poddomena = p_pod and p.poddomena_do > now())
   limit 1
$$;
revoke all on function public.javni_objekt(text, text) from public;
grant execute on function public.javni_objekt(text, text) to anon, authenticated;

commit;

-- KORAK B ---------------------------------------------------------------
begin;

do $$
declare stupci text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into stupci
    from information_schema.columns
   where table_schema = 'public' and table_name = 'properties'
     and column_name not in ('guest_token', 'ical_booking_url', 'ical_airbnb_url');
  execute 'revoke select on public.properties from anon';
  execute format('grant select (%s) on public.properties to anon', stupci);
end $$;

alter policy "public_read_by_slug" on public.properties to anon;

commit;

-- provjera: sql/test-sigurnost.sql („anon ne čita tajne stupce objekta”)
