-- ============================================================================
--  Odmoria — automatski e-mail GOSTU (prije dolaska i nakon odlaska)
--  ---------------------------------------------------------------------------
--  Kad domaćin uz rezervaciju upiše gostov e-mail (obrazac rezervacije ili
--  prihvaćeni upit), baza jednom dnevno sama pošalje:
--    1. „dolazak” — do 3 dana prije dolaska: link na vodič (šifra i Wi-Fi se
--       otključaju sat prije prijave),
--    2. „ocjena”  — na dan odlaska (ili dan poslije): hvala + link na ocjenu
--       u vodiču (#kuca/odlazak).
--  Na jeziku koji domaćin odabere (hr, en, de, it, pl, cs). Svaka poruka ide
--  jednom (bookings.email_dolazak_at / email_ocjena_at). „Odgovori” ide
--  domaćinu (reply_to = e-mail objekta, inače e-mail računa).
--  Domaćin ih isključuje po objektu (properties.auto_email_gostu).
--  Gostov e-mail se briše 30 dana nakon odlaska (isti dnevni zadatak).
--
--  PREDUVJETI (redom):
--   1. sql/sections-security.sql KORAK 2 — rezervacije više nisu javno
--      čitljive. Bez toga bi gostov e-mail mogao pročitati bilo tko; ova
--      skripta se zato NEĆE pokrenuti dok anon može čitati bookings.
--   2. sql/add-inquiry-email.sql — Resend ključ, pošiljatelj i adresa u
--      Vaultu, funkcija _html_esc i pg_net. Dok su u Vaultu <ZAMJENSKI>
--      nazivi, ništa se ne šalje.
--  Trošak: Resend Free = 3.000 e-mailova mjesečno, najviše 100 na dan
--  (zajedno s e-mailovima o upitu); zato jedno izvođenje šalje najviše 80.
--
--  Pokrenuti u Supabase SQL editoru. Idempotentno.
--  Isključivanje: select cron.unschedule('odmoria-email-gostima');
-- ============================================================================

begin;   -- sve ili ništa: ako provjera dolje odbije, ne mijenja se ništa

do $$
begin
  if has_table_privilege('anon', 'public.bookings', 'SELECT') then
    raise exception 'Prvo pokrenite KORAK 2 iz sql/sections-security.sql — inače bi e-mail gosta bio javno čitljiv.';
  end if;
  if to_regprocedure('public._html_esc(text)') is null then
    raise exception 'Prvo pokrenite sql/add-inquiry-email.sql (Resend ključ u Vaultu, _html_esc).';
  end if;
end $$;

create extension if not exists pg_cron;
create extension if not exists pg_net;

alter table public.bookings
  add column if not exists guest_email text
    check (guest_email is null or (length(guest_email) <= 200 and guest_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  add column if not exists guest_lang text not null default 'hr'
    check (guest_lang in ('hr', 'en', 'de', 'it', 'pl', 'cs')),
  add column if not exists email_dolazak_at timestamptz,
  add column if not exists email_ocjena_at timestamptz;

alter table public.properties
  add column if not exists auto_email_gostu boolean not null default true;

-- Tekstovi po jeziku. {objekt} {od} {do} {ime} (", Ana" ili prazno); bez padeža imena.
create or replace function public._email_gostu_tekst(p_jezik text, p_vrsta text)
returns jsonb language sql immutable
as $$
  select coalesce(t -> coalesce(nullif(p_jezik, ''), 'hr'), t -> 'en') from (select (case p_vrsta
  when 'dolazak' then '{
    "hr": {"predmet": "{objekt}: sve za vaš dolazak", "pozdrav": "Dobar dan{ime}!", "tekst": "Veselimo se vašem dolasku ({od} – {do}). U vodiču su upute za dolazak, Wi-Fi, kućna pravila i preporuke. Šifra vrata i Wi-Fi pojavit će se u vodiču sat vremena prije prijave.", "gumb": "Otvori vodič"},
    "en": {"predmet": "{objekt}: everything for your arrival", "pozdrav": "Hello{ime}!", "tekst": "We look forward to welcoming you ({od} – {do}). Your guide has arrival instructions, Wi-Fi, house rules and tips. The door code and Wi-Fi appear in the guide one hour before check-in.", "gumb": "Open your guide"},
    "de": {"predmet": "{objekt}: alles für Ihre Anreise", "pozdrav": "Hallo{ime}!", "tekst": "Wir freuen uns auf Ihre Ankunft ({od} – {do}). Im Gästeführer finden Sie Anreise, WLAN, Hausregeln und Tipps. Türcode und WLAN erscheinen dort eine Stunde vor dem Check-in.", "gumb": "Gästeführer öffnen"},
    "it": {"predmet": "{objekt}: tutto per il vostro arrivo", "pozdrav": "Buongiorno{ime}!", "tekst": "Vi aspettiamo ({od} – {do}). Nella guida trovate le indicazioni per l''arrivo, il Wi-Fi, le regole della casa e i consigli. Il codice della porta e il Wi-Fi compaiono nella guida un''ora prima del check-in.", "gumb": "Apri la guida"},
    "pl": {"predmet": "{objekt}: wszystko na przyjazd", "pozdrav": "Dzień dobry{ime}!", "tekst": "Czekamy na Ciebie ({od} – {do}). W przewodniku znajdziesz wskazówki dojazdu, Wi-Fi, zasady domu i polecane miejsca. Kod do drzwi i Wi-Fi pojawią się w przewodniku godzinę przed zameldowaniem.", "gumb": "Otwórz przewodnik"},
    "cs": {"predmet": "{objekt}: vše pro váš příjezd", "pozdrav": "Dobrý den{ime}!", "tekst": "Těšíme se na váš příjezd ({od} – {do}). V průvodci najdete pokyny k příjezdu, Wi-Fi, domovní řád a tipy. Kód ke dveřím a Wi-Fi se v průvodci zobrazí hodinu před příjezdem.", "gumb": "Otevřít průvodce"}
  }'
  else '{
    "hr": {"predmet": "{objekt}: hvala na boravku", "pozdrav": "Dobar dan{ime}!", "tekst": "Hvala što ste boravili kod nas. Ako imate minutu, ocijenite boravak u vodiču — to nam puno znači. Dobrodošli ponovno; sljedeći put rezervirajte izravno, bez provizije.", "gumb": "Ocijeni boravak"},
    "en": {"predmet": "{objekt}: thank you for your stay", "pozdrav": "Hello{ime}!", "tekst": "Thank you for staying with us. If you have a minute, please rate your stay in the guide — it means a lot to us. You are always welcome back; next time book directly, with no fees.", "gumb": "Rate your stay"},
    "de": {"predmet": "{objekt}: danke für Ihren Aufenthalt", "pozdrav": "Hallo{ime}!", "tekst": "Danke, dass Sie bei uns waren. Wenn Sie eine Minute haben, bewerten Sie Ihren Aufenthalt im Gästeführer — das bedeutet uns viel. Sie sind jederzeit willkommen; buchen Sie nächstes Mal direkt, ohne Provision.", "gumb": "Aufenthalt bewerten"},
    "it": {"predmet": "{objekt}: grazie per il soggiorno", "pozdrav": "Buongiorno{ime}!", "tekst": "Grazie per essere stati da noi. Se avete un minuto, valutate il soggiorno nella guida — per noi è importante. Siete sempre i benvenuti; la prossima volta prenotate direttamente, senza commissioni.", "gumb": "Valuta il soggiorno"},
    "pl": {"predmet": "{objekt}: dziękujemy za pobyt", "pozdrav": "Dzień dobry{ime}!", "tekst": "Dziękujemy za pobyt u nas. Jeśli masz chwilę, oceń pobyt w przewodniku — to dla nas ważne. Zapraszamy ponownie; następnym razem zarezerwuj bezpośrednio, bez prowizji.", "gumb": "Oceń pobyt"},
    "cs": {"predmet": "{objekt}: děkujeme za pobyt", "pozdrav": "Dobrý den{ime}!", "tekst": "Děkujeme, že jste byli u nás. Pokud máte minutu, ohodnoťte pobyt v průvodci — hodně to pro nás znamená. Jste vždy vítáni; příště rezervujte přímo, bez provize.", "gumb": "Ohodnotit pobyt"}
  }' end)::jsonb as t) x
$$;
revoke all on function public._email_gostu_tekst(text, text) from public, anon, authenticated;

-- Jedno izvođenje: pošalje što je na redu (najviše 80), vrati broj poslanih.
create or replace function public.posalji_emailove_gostima()
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  kljuc text; od text; adresa text;
  danas date := (now() at time zone 'Europe/Zagreb')::date;
  b record; z record; t jsonb; vrsta text; n int := 0;
  zamjena jsonb; link text; predmet text; pozdrav text; tekst text; gumb text; html text; tijelo jsonb;
  f text;
begin
  -- čuvamo e-mail gosta samo dok treba: 30 dana nakon odlaska
  update public.bookings set guest_email = null
   where guest_email is not null and checkout_date < danas - 30;

  select decrypted_secret into kljuc  from vault.decrypted_secrets where name = 'odmoria_resend_key';
  select decrypted_secret into od     from vault.decrypted_secrets where name = 'odmoria_email_od';
  select decrypted_secret into adresa from vault.decrypted_secrets where name = 'odmoria_adresa';
  if coalesce(kljuc, '') = '' or kljuc like '<%' or coalesce(od, '') = '' or od like '<%' then
    return 0;                                  -- Resend nije postavljen → tiho ništa
  end if;
  if coalesce(adresa, '') = '' or adresa like '<%' then adresa := 'https://guestflow-gamma.vercel.app'; end if;
  adresa := rtrim(adresa, '/');

  for b in
    select bk.id, bk.token, bk.guest_name, bk.guest_email, bk.guest_lang, bk.checkin_date, bk.checkout_date,
           bk.email_dolazak_at, bk.email_ocjena_at,
           p.name as objekt, p.host_name,
           coalesce(nullif(btrim(p.email), ''), u.email) as domacin_email
      from public.bookings bk
      join public.properties p on p.id = bk.property_id
      left join auth.users u on u.id = p.user_id
     where bk.guest_email is not null
       and coalesce(bk.is_active, true)
       and coalesce(p.auto_email_gostu, true)
       and ((bk.email_dolazak_at is null and bk.checkin_date::date between danas and danas + 3)
         or (bk.email_ocjena_at  is null and bk.checkout_date::date between danas - 1 and danas))
     order by bk.checkin_date
     limit 80
  loop
    begin
      vrsta := case when b.email_dolazak_at is null and b.checkin_date::date between danas and danas + 3 then 'dolazak' else 'ocjena' end;
      t := public._email_gostu_tekst(b.guest_lang, vrsta);
      f := case b.guest_lang when 'hr' then 'FMDD. FMMM. YYYY.' when 'en' then 'DD/MM/YYYY' when 'it' then 'DD/MM/YYYY' else 'DD.MM.YYYY' end;
      link := adresa || '/h/' || b.token || case when vrsta = 'ocjena' then '#kuca/odlazak' else '' end;
      zamjena := jsonb_build_object(
        '{objekt}', coalesce(b.objekt, 'Odmoria'),
        '{od}', to_char(b.checkin_date, f),
        '{do}', to_char(b.checkout_date, f),
        '{ime}', case when coalesce(btrim(b.guest_name), '') = '' then '' else ', ' || split_part(btrim(b.guest_name), ' ', 1) end);
      predmet := t ->> 'predmet'; pozdrav := t ->> 'pozdrav'; tekst := t ->> 'tekst'; gumb := t ->> 'gumb';
      for z in select * from jsonb_each_text(zamjena) loop
        predmet := replace(predmet, z.key, z.value);
        pozdrav := replace(pozdrav, z.key, z.value);
        tekst   := replace(tekst,   z.key, z.value);
      end loop;

      html := '<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#103D4B;max-width:560px">'
        || '<p style="margin:0 0 4px;font-size:13px;color:#536D77">' || _html_esc(b.objekt) || '</p>'
        || '<h1 style="margin:0 0 16px;font-size:22px">' || _html_esc(pozdrav) || '</h1>'
        || '<p style="margin:0 0 20px">' || _html_esc(tekst) || '</p>'
        || '<p style="margin:0 0 20px"><a href="' || _html_esc(link) || '" style="display:inline-block;padding:12px 20px;background:#116D76;color:#fff;text-decoration:none;border-radius:7px;font-weight:bold">' || _html_esc(gumb) || '</a></p>'
        || case when coalesce(b.host_name, '') <> '' then '<p style="margin:0">' || _html_esc(b.host_name) || '</p>' else '' end
        || '</div>';

      tijelo := jsonb_build_object('from', od, 'to', jsonb_build_array(b.guest_email), 'subject', predmet, 'html', html,
        'text', pozdrav || E'\n\n' || tekst || E'\n\n' || gumb || ': ' || link || coalesce(E'\n\n' || nullif(b.host_name, ''), ''));
      if b.domacin_email is not null then tijelo := tijelo || jsonb_build_object('reply_to', b.domacin_email); end if;

      perform net.http_post(
        url := 'https://api.resend.com/emails',
        headers := jsonb_build_object('Authorization', 'Bearer ' || kljuc, 'Content-Type', 'application/json'),
        body := tijelo,
        timeout_milliseconds := 10000);

      if vrsta = 'dolazak' then
        update public.bookings set email_dolazak_at = now() where id = b.id;
      else
        update public.bookings set email_ocjena_at = now() where id = b.id;
      end if;
      n := n + 1;
    exception when others then
      raise warning 'Odmoria: e-mail gostu (rezervacija %) nije poslan: %', b.id, sqlerrm;
    end;
  end loop;
  return n;
end;
$$;
revoke all on function public.posalji_emailove_gostima() from public, anon, authenticated;

-- svaki dan u 8:05 UTC (10:05 ljeti / 9:05 zimi po Zagrebu)
select cron.unschedule(jobname) from cron.job where jobname = 'odmoria-email-gostima';
select cron.schedule('odmoria-email-gostima', '5 8 * * *', $$ select public.posalji_emailove_gostima(); $$);

commit;

-- PROVJERA:
-- a) rezervacija s vašim e-mailom kao gostovim, dolazak za 1–3 dana; zatim ručno:
--      select public.posalji_emailove_gostima();      -- vraća broj poslanih
-- b) odgovor Resenda: select status_code, content from net._http_response order by created desc limit 5;
-- c) zadatak:        select jobname, schedule, active from cron.job where jobname = 'odmoria-email-gostima';
