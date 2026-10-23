-- =====================================================================
--  SIGURNOSNI TEST (21. 10. 2026.) — pokretati nakon svake veće promjene
--
--  Sve radi u jednoj transakciji i na kraju je PONIŠTAVA (rollback) —
--  u bazi ništa ne ostaje. Pokreće se kao vlasnik baze (Supabase SQL editor
--  ili konektor). Rezultat: tablica (test, prolazi, napomena).
--  Svaki red s prolazi = false je problem.
--
--  Što provjerava:
--   - stranac (anon i prijavljeni drugi korisnik) ne vidi privatne tablice
--   - šifra vrata ne izlazi iz baze prije vremena, a izlazi u pravom trenutku
--   - stari opći link nikad ne otključava šifre
--   - istekla / ugašena rezervacija ne otvara vodič
--   - recepcija ne vidi šifre, vlasnik objekta ne vidi goste
--   - raspored čistačice i izvoz kalendara ne nose šifre ni imena gostiju
--   - javna tablica objekata ne otkriva tajne stupce (anon, prijavljeni stranac, javni_objekt)
--   - dvije rezervacije za iste noći (v7) i plan gosta do odlaska (v7)
--   - čistačica ne može podmetnuti tuđu adresu slike
--
--  Testni podaci su izmišljeni (šifra TEST-SIF-7171) i nestaju s rollbackom.
-- =====================================================================

begin;

create temp table rez (rb serial, test text, prolazi boolean, napomena text);
grant all on rez to anon, authenticated;
grant usage on sequence rez_rb_seq to anon, authenticated;

do $$
declare
  pid uuid; vl uuid; drugi uuid; slug_ text; gtok text;
  danas date := (now() at time zone 'Europe/Zagreb')::date;
  t_bud text := 'testbuduci-' || substr(md5(random()::text), 1, 12);
  t_sad text := 'testsad-'    || substr(md5(random()::text), 1, 12);
  t_ist text := 'testist-'    || substr(md5(random()::text), 1, 12);
  t_ctok text := 'testcist' || substr(md5(random()::text), 1, 16);
  r jsonb; n int; tx text; ok boolean;
  tablica text;
  privatne text[] := array['sections','bookings','inquiries','guest_registrations','cleaner_links','calendar_exports',
                           'kalendar_sukobi','kalendar_promjene','cleaning_status','reviews'];
begin
  -- objekt za test i drugi korisnik (za uloge)
  select p.id, p.user_id, p.slug, p.guest_token into pid, vl, slug_, gtok
    from public.properties p join public.sections s on s.property_id = p.id
   where p.slug is not null order by p.created_at limit 1;
  if pid is null then insert into rez(test, prolazi, napomena) values ('priprema', false, 'nema objekta s uputama'); return; end if;
  select id into drugi from auth.users where id <> vl limit 1;

  -- izmišljeni podaci
  update public.sections set door_code = 'TEST-SIF-7171', wifi_pass = 'TEST-WIFI-7171', checkin_time = '00:00' where property_id = pid;
  update public.bookings set is_active = false where property_id = pid;
  insert into public.bookings(property_id, guest_name, checkin_date, checkout_date, token, is_active)
  values (pid, 'Testni Gost Buduci', danas + 5, danas + 8, t_bud, true),
         (pid, 'Testni Gost Sad',    danas,     danas + 2, t_sad, true),
         (pid, 'Testni Gost Istekao', danas - 9, danas - 6, t_ist, true);
  if gtok is null then gtok := 'testopci-' || substr(md5(random()::text), 1, 12); update public.properties set guest_token = gtok where id = pid; end if;
  insert into public.cleaner_links(property_id, token) values (pid, t_ctok)
    on conflict (property_id) do update set token = excluded.token;

  -- 1) anon ne vidi privatne tablice
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  foreach tablica in array privatne loop
    begin
      execute format('select count(*) from public.%I where property_id = $1', tablica) into n using pid;
      insert into rez(test, prolazi, napomena) values ('anon ne vidi ' || tablica, n = 0, n || ' redova');
    exception when insufficient_privilege then insert into rez(test, prolazi, napomena) values ('anon ne vidi ' || tablica, true, 'zabranjeno');
              when undefined_table then insert into rez(test, prolazi, napomena) values ('anon ne vidi ' || tablica, true, 'tablica ne postoji');
    end;
  end loop;
  begin
    insert into public.bookings(property_id, guest_name, checkin_date, checkout_date, token, is_active) values (pid, 'Uljez', danas + 30, danas + 31, 'uljez0000000000001', true);
    insert into rez(test, prolazi, napomena) values ('anon ne upisuje rezervaciju', false, 'upis je prošao');
  exception when others then insert into rez(test, prolazi, napomena) values ('anon ne upisuje rezervaciju', true, 'odbijeno');
  end;
  -- javna tablica objekata: tajni stupci
  begin
    execute 'select count(*) from public.properties where id = $1 and (guest_token is not null or ical_booking_url is not null or ical_airbnb_url is not null)' into n using pid;
    insert into rez(test, prolazi, napomena) values ('anon ne čita tajne stupce objekta (guest_token, iCal)', n = 0, case when n > 0 then 'ČITLJIVO — vidi odluke 44/45 (sql/add-properties-privacy.sql, KORAK B)' else 'skriveno' end);
  exception when insufficient_privilege then insert into rez(test, prolazi, napomena) values ('anon ne čita tajne stupce objekta (guest_token, iCal)', true, 'zabranjeno');
  end;

  -- 2) šifre kroz vodič
  r := public.vodic_gosta(t_bud, null);
  insert into rez(test, prolazi, napomena) values ('prije vremena: nema šifre vrata ni Wi-Fi lozinke',
    r->>'stanje' = 'ok' and not (r->'section' ? 'door_code') and not (r->'section' ? 'wifi_pass') and (r->'section'->>'ima_door_code')::boolean,
    'stanje ' || coalesce(r->>'stanje', '?'));
  insert into rez(test, prolazi, napomena) values ('vodič ne vraća tajne stupce objekta',
    not (r->'property' ? 'guest_token') and not (r->'property' ? 'ical_booking_url') and not (r->'property' ? 'user_id'), '');
  r := public.vodic_gosta(t_sad, null);
  insert into rez(test, prolazi, napomena) values ('u pravom trenutku: šifra izlazi', r->'section'->>'door_code' = 'TEST-SIF-7171', coalesce(r->>'otvoreno', '?'));
  r := public.vodic_gosta(gtok, slug_);
  insert into rez(test, prolazi, napomena) values ('stari opći link nikad ne otključava', coalesce(r->>'stanje', '') <> 'ok' or not (r->'section' ? 'door_code'), coalesce(r->>'stanje', '?'));
  r := public.vodic_gosta(t_ist, null);
  insert into rez(test, prolazi, napomena) values ('istekla rezervacija ne otvara vodič', coalesce(r->>'stanje', '') <> 'ok', coalesce(r->>'stanje', '?'));
  r := public.vodic_gosta('nepostojeci-token-123', null);
  insert into rez(test, prolazi, napomena) values ('izmišljeni token ne otvara vodič', coalesce(r->>'stanje', '') <> 'ok', coalesce(r->>'stanje', '?'));

  -- 3) raspored čistačice i izvoz kalendara
  r := public.raspored_ciscenja(t_ctok);
  tx := r::text;
  insert into rez(test, prolazi, napomena) values ('raspored čistačice bez šifri i imena gostiju',
    r->>'stanje' = 'ok' and position('TEST-SIF-7171' in tx) = 0 and position('TEST-WIFI' in tx) = 0 and position('Testni Gost' in tx) = 0, '');
  begin
    r := public.ciscenje_popis(t_ctok, danas, '[]', '["https://evil.example/x.jpg"]');
    insert into rez(test, prolazi, napomena) values ('čistačica ne podmeće tuđu sliku', coalesce(jsonb_array_length(r->'fotke'), 0) = 0, '');
  exception when undefined_function then insert into rez(test, prolazi, napomena) values ('čistačica ne podmeće tuđu sliku', true, 'funkcija ne postoji');
  end;
  perform set_config('role', 'postgres', true);

  -- 4) prijavljeni stranac
  perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  foreach tablica in array privatne loop
    begin
      execute format('select count(*) from public.%I where property_id = $1', tablica) into n using pid;
      insert into rez(test, prolazi, napomena) values ('stranac ne vidi ' || tablica, n = 0, n || ' redova');
    exception when insufficient_privilege then insert into rez(test, prolazi, napomena) values ('stranac ne vidi ' || tablica, true, 'zabranjeno');
              when undefined_table then insert into rez(test, prolazi, napomena) values ('stranac ne vidi ' || tablica, true, 'tablica ne postoji');
    end;
  end loop;
  -- provjere domaćina (sql/add-host-verification.sql): stranac ne vidi OIB/IBAN drugih ni kroz admin funkciju
  begin
    select count(*) into n from public.provjere_domacina;
    insert into rez(test, prolazi, napomena) values ('stranac ne vidi provjere domaćina', n = 0, n || ' redova');
    select jsonb_array_length(public.admin_provjere()) into n;
    insert into rez(test, prolazi, napomena) values ('stranac ne čita admin_provjere()', n = 0, n || ' redova');
  exception when insufficient_privilege then insert into rez(test, prolazi, napomena) values ('stranac ne vidi provjere domaćina', true, 'zabranjeno');
            when undefined_table or undefined_function then insert into rez(test, prolazi, napomena) values ('stranac ne vidi provjere domaćina', true, 'nije pokrenuto');
  end;
  update public.properties set name = 'Preuzeto' where id = pid;
  get diagnostics n = row_count;
  insert into rez(test, prolazi, napomena) values ('stranac ne mijenja tuđi objekt', n = 0, n || ' redova');
  select count(*) into n from public.properties where id = pid;
  insert into rez(test, prolazi, napomena) values ('prijavljeni stranac ne čita tuđi objekt iz tablice', n = 0, n || ' redova');
  begin
    r := public.javni_objekt(slug_, null);
    insert into rez(test, prolazi, napomena) values ('javna stranica (javni_objekt) bez tajnih stupaca',
      r->>'slug' = slug_ and not (r ? 'guest_token') and not (r ? 'ical_booking_url') and not (r ? 'ical_airbnb_url'), '');
  exception when undefined_function then insert into rez(test, prolazi, napomena) values ('javna stranica (javni_objekt) bez tajnih stupaca', false, 'funkcija ne postoji');
  end;
  perform set_config('role', 'postgres', true);

  -- 5) uloge u timu
  if drugi is not null and to_regclass('public.property_members') is not null then
    begin
      insert into public.property_members(property_id, user_id, uloga, accepted_at, token)
      values (pid, drugi, 'recepcija', now(), 'testpoz' || substr(md5(random()::text), 1, 20));
    exception when others then
      insert into public.property_members(property_id, user_id, uloga, accepted_at)
      values (pid, drugi, 'recepcija', now());
    end;
    perform set_config('request.jwt.claims', json_build_object('sub', drugi, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);
    select count(*) into n from public.sections where property_id = pid;
    insert into rez(test, prolazi, napomena) values ('recepcija ne vidi šifre (sections)', n = 0, n || ' redova');
    select count(*) into n from public.bookings where property_id = pid;
    insert into rez(test, prolazi, napomena) values ('recepcija vidi rezervacije', n > 0, n || ' redova');
    update public.properties set name = 'Recepcija mijenja' where id = pid;
    get diagnostics n = row_count;
    insert into rez(test, prolazi, napomena) values ('recepcija ne mijenja objekt', n = 0, n || ' redova');
    perform set_config('role', 'postgres', true);
    update public.property_members set uloga = 'vlasnik' where property_id = pid and user_id = drugi;
    perform set_config('role', 'authenticated', true);
    select count(*) into n from public.bookings where property_id = pid;
    insert into rez(test, prolazi, napomena) values ('vlasnik objekta (uloga) ne vidi goste', n = 0, n || ' redova');
    perform set_config('role', 'postgres', true);
  else
    insert into rez(test, prolazi, napomena) values ('uloge u timu', null, 'nema drugog korisnika — preskočeno');
  end if;

  -- 6) v7: dvije rezervacije za iste noći
  begin
    insert into public.bookings(property_id, guest_name, checkin_date, checkout_date, token, is_active)
    values (pid, 'Testni Preklop', danas + 6, danas + 7, 'testpreklop' || substr(md5(random()::text), 1, 10), true);
    insert into rez(test, prolazi, napomena) values ('baza odbija drugu rezervaciju za iste noći', false, 'prošlo — v7 nije pokrenut?');
  exception when exclusion_violation then insert into rez(test, prolazi, napomena) values ('baza odbija drugu rezervaciju za iste noći', true, sqlerrm);
  end;
  begin
    insert into public.bookings(property_id, guest_name, checkin_date, checkout_date, token, is_active)
    values (pid, 'Testni Susjed', danas + 8, danas + 10, 'testsusjed' || substr(md5(random()::text), 1, 10), true);
    insert into rez(test, prolazi, napomena) values ('dan odlaska = dan dolaska je dopušten', true, '');
  exception when others then insert into rez(test, prolazi, napomena) values ('dan odlaska = dan dolaska je dopušten', false, sqlerrm);
  end;

  -- 7) v7: gost zadržava vodič do odlaska kad domaćin padne na Free
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'bookings' and column_name = 'plan_pri_izradi') then
    insert into public.subscriptions(user_id, plan, status, period_end) values (vl, 'pro', 'active', now() + interval '1 year')
      on conflict (user_id) do update set plan = 'pro', status = 'active', period_end = now() + interval '1 year';
    insert into public.bookings(property_id, guest_name, checkin_date, checkout_date, token, is_active)
    values (pid, 'Testni Plan', danas + 20, danas + 22, 'testplan' || substr(md5(random()::text), 1, 12), true)
    returning token into tx;
    update public.subscriptions set plan = 'free' where user_id = vl;
    r := public.mogucnosti_vodica(tx, null);
    insert into rez(test, prolazi, napomena) values ('pad na Free: gost zadržava vodič do odlaska', r->>'plan' = 'pro', 'plan ' || coalesce(r->>'plan', '?'));
  else
    insert into rez(test, prolazi, napomena) values ('pad na Free: gost zadržava vodič do odlaska', false, 'v7 nije pokrenut');
  end if;
end $$;

select test, prolazi, napomena from rez order by rb;

rollback;
