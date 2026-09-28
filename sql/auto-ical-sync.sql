-- ============================================================================
--  Odmoria — automatska iCal sinkronizacija svakih 30 minuta (Supabase pg_cron)
--  ---------------------------------------------------------------------------
--  Bez ovoga se kalendari s Bookinga i Airbnba sinkroniziraju:
--    - na klik u dashboardu („Sinkroniziraj”), i
--    - jednom dnevno (Vercel Cron → api/keepalive.js), ako je u Vercelu
--      postavljen SUPABASE_SERVICE_ROLE_KEY.
--  S ovim Supabase svakih 30 minuta pozove /api/sync-all, koja obradi
--  objekte kojima je zadnja sinkronizacija starija od 20 minuta.
--  Isti raspored svaku noć briše stare podatke gostiju (eVisitor, 30 dana
--  nakon odlaska — sql/add-guest-registration.sql).
--
--  PRIJE POKRETANJA:
--   1. U Vercelu postaviti CRON_SECRET (dug nasumičan niz, npr. 40 znakova)
--      i SUPABASE_SERVICE_ROLE_KEY (vidi docs/odluke.md, točka 16) → Redeploy.
--   2. Niže zamijeniti <ADRESA> adresom produkcije (npr. https://odmoria.com
--      ili https://guestflow-gamma.vercel.app) i <CRON_SECRET> istom tajnom.
--  Tajna se sprema u Supabase Vault, ne u tekst zadatka.
--
--  Pokrenuti u Supabase SQL editoru. Ponovno pokretanje zamijeni zadatke.
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- tajna u Vaultu (ponovno pokretanje je samo ažurira)
do $$
declare postojeca uuid;
begin
  select id into postojeca from vault.secrets where name = 'odmoria_cron_secret';
  if postojeca is null then
    perform vault.create_secret('<CRON_SECRET>', 'odmoria_cron_secret', 'Odmoria: /api/sync-all');
  else
    perform vault.update_secret(postojeca, '<CRON_SECRET>');
  end if;
end $$;

-- stari zadaci istog imena (ako postoje) se miču
select cron.unschedule(jobname) from cron.job where jobname in ('odmoria-ical-sync', 'odmoria-pocisti-prijave');

-- svakih 30 minuta: /api/sync-all
select cron.schedule('odmoria-ical-sync', '*/30 * * * *', $$
  select net.http_post(
    url := '<ADRESA>/api/sync-all',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'odmoria_cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000);
$$);

-- svake noći u 3:15 (UTC): brisanje podataka gostiju 30 dana nakon odlaska
select cron.schedule('odmoria-pocisti-prijave', '15 3 * * *', $$ select public.pocisti_prijave(); $$);

-- provjera: zadaci i zadnja izvođenja
select jobname, schedule, active from cron.job where jobname like 'odmoria-%';
-- select * from cron.job_run_details order by start_time desc limit 10;
-- select * from net._http_response order by created desc limit 5;   -- odgovori /api/sync-all
