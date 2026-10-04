-- =====================================================================
--  Brisanje jednog objekta (4. 10. 2026.) — dashboard → Objekt → Osnovno
--  → „Obriši objekt”.
--
--  Pokrenuti u Supabase SQL editoru JEDNOM. Ne mijenja tablice ni politike,
--  samo dodaje funkciju obrisi_objekt(id).
--
--  Zašto funkcija, a ne brisanje iz preglednika: objekt ima podatke u
--  petnaestak tablica (rezervacije, kalendar, pregledi, prijevodi…), a
--  domaćin preko RLS-a ne smije brisati sve (npr. page_views,
--  prijevodi_rucni). Funkcija provjeri da je pozivatelj VLASNIK (suradnik ne
--  smije brisati), pa sve obriše u jednoj transakciji — ili ništa.
--  Isti redoslijed kao obrisi_moj_racun() (sql/delete-account.sql).
-- =====================================================================

create or replace function public.obrisi_objekt(p_objekt uuid)
returns jsonb language plpgsql volatile security definer set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  vlasnik uuid;
  t text;
begin
  if uid is null then return jsonb_build_object('stanje', 'neprijavljen'); end if;
  select user_id into vlasnik from public.properties where id = p_objekt;
  if vlasnik is null then return jsonb_build_object('stanje', 'nema'); end if;
  if vlasnik <> uid then return jsonb_build_object('stanje', 'nije_vlasnik'); end if;

  -- redom: ono što pokazuje na rezervacije prije rezervacija
  foreach t in array array['guest_registrations', 'reviews', 'cleaner_links', 'calendar_exports', 'property_members',
                           'inquiries', 'availability', 'bookings', 'sections', 'amenities', 'local_places',
                           'transport', 'attractions', 'house_rules', 'faq', 'page_views', 'prijevodi_rucni'] loop
    if to_regclass('public.' || t) is not null then
      execute format('delete from public.%I where property_id = $1', t) using p_objekt;
    end if;
  end loop;

  delete from public.properties where id = p_objekt and user_id = uid;
  return jsonb_build_object('stanje', 'ok');
end;
$$;

revoke all on function public.obrisi_objekt(uuid) from public, anon;
grant execute on function public.obrisi_objekt(uuid) to authenticated;
