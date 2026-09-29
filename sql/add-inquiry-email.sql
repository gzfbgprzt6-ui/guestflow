-- ============================================================================
--  Odmoria — e-mail domaćinu kad stigne novi upit gosta
--  ---------------------------------------------------------------------------
--  Okidač na `inquiries` (sql/add-inquiries.sql mora biti pokrenut prije):
--  nakon svakog novog upita baza sama pošalje e-mail vlasniku objekta preko
--  Resenda (resend.com), iz pg_net-a — bez Vercelove funkcije, pa ga nijedan
--  put upisa ne može zaobići.
--
--  Kome ide: na e-mail RAČUNA vlasnika (auth.users), a ako ga nema, na
--  kontakt e-mail objekta. Ne šalje se ako je domaćin u Računu → Obavijesti
--  isključio „Važne obavijesti” (user_metadata.obavijesti.vazne = false).
--  „Odgovori” u e-mailu ide ravno gostu (reply_to), ako je gost ostavio e-mail.
--
--  Sigurnost: ključ je u Supabase Vaultu, ne u tekstu funkcije. Sve što je
--  gost upisao (ime, poruka, kontakt) prolazi kroz _html_esc prije HTML-a.
--  Ako slanje ne uspije (nema ključa, Resend ne odgovori), upit se SVEJEDNO
--  spremi — okidač grešku samo zabilježi (WARNING u logu).
--  Najviše 20 upita na sat po objektu (okidač iz add-inquiries.sql) = najviše
--  20 e-mailova na sat po objektu.
--
--  PRIJE POKRETANJA (docs/odluke.md, točka 18):
--   1. Račun na resend.com → Domains → dodati i potvrditi domenu (DNS zapisi
--      kod registrara domene). Bez potvrđene domene Resend šalje samo na
--      vašu vlastitu adresu.
--   2. Resend → API Keys → Create (dopuštenje „Sending access”) → `re_…`.
--   3. Niže zamijeniti:
--        <RESEND_KEY>  ključem `re_…`
--        <OD>          pošiljateljem na potvrđenoj domeni, npr.
--                      Odmoria <upiti@odmoria.com>
--        <ADRESA>      adresom aplikacije bez / na kraju, npr.
--                      https://odmoria.com ili https://guestflow-gamma.vercel.app
--
--  Pokrenuti u Supabase SQL editoru. Ponovno pokretanje samo ažurira
--  postavke i funkciju. Isključivanje: drop trigger email_o_upitu on public.inquiries;
-- ============================================================================

create extension if not exists pg_net;

-- postavke u Vaultu (ponovno pokretanje ih ažurira)
do $$
declare
  r record;
  postojeca uuid;
begin
  for r in select * from (values
      ('odmoria_resend_key', '<RESEND_KEY>', 'Odmoria: Resend API ključ (e-mail o upitu)'),
      ('odmoria_email_od',   '<OD>',         'Odmoria: pošiljatelj e-mailova'),
      ('odmoria_adresa',     '<ADRESA>',     'Odmoria: adresa aplikacije za linkove u e-mailu')
    ) v(ime, vrijednost, opis)
  loop
    select id into postojeca from vault.secrets where name = r.ime;
    if postojeca is null then
      perform vault.create_secret(r.vrijednost, r.ime, r.opis);
    else
      perform vault.update_secret(postojeca, r.vrijednost);
    end if;
  end loop;
end $$;

-- HTML-escape za sve što je upisao gost
create or replace function public._html_esc(t text)
returns text language sql immutable
as $$
  select replace(replace(replace(replace(replace(coalesce(t, ''),
         '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;'), '''', '&#39;')
$$;
revoke all on function public._html_esc(text) from public, anon, authenticated;

create or replace function public._email_o_upitu()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  kljuc text; od text; adresa text;
  objekt record;
  korisnik record;
  primatelj text;
  n int;
  termin text := '';
  gosti text := '';
  predmet text;
  link text;
  html text;
  tekst text;
  tijelo jsonb;
begin
  begin
    select decrypted_secret into kljuc  from vault.decrypted_secrets where name = 'odmoria_resend_key';
    select decrypted_secret into od     from vault.decrypted_secrets where name = 'odmoria_email_od';
    select decrypted_secret into adresa from vault.decrypted_secrets where name = 'odmoria_adresa';
    -- nije postavljeno (ili su ostali <ZAMJENSKI> nazivi) → tiho ništa
    if coalesce(kljuc, '') = '' or kljuc like '<%' or coalesce(od, '') = '' or od like '<%' then
      return new;
    end if;
    if coalesce(adresa, '') = '' or adresa like '<%' then adresa := 'https://guestflow-gamma.vercel.app'; end if;
    adresa := rtrim(adresa, '/');

    select p.id, p.name, p.user_id, p.email into objekt from public.properties p where p.id = new.property_id;
    if objekt.id is null then return new; end if;

    select u.email, u.raw_user_meta_data into korisnik from auth.users u where u.id = objekt.user_id;
    if coalesce(korisnik.raw_user_meta_data -> 'obavijesti' ->> 'vazne', 'true') = 'false' then
      return new;                                   -- domaćin je isključio obavijesti
    end if;
    primatelj := coalesce(nullif(btrim(korisnik.email), ''), nullif(btrim(objekt.email), ''));
    if primatelj is null then return new; end if;

    if new.checkin_date is not null and new.checkout_date is not null then
      n := new.checkout_date - new.checkin_date;
      termin := to_char(new.checkin_date, 'FMDD. FMMM.') || ' – ' || to_char(new.checkout_date, 'FMDD. FMMM. YYYY.')
             || ' (' || n || ' ' || case when n % 10 = 1 and n % 100 <> 11 then 'noć' else 'noći' end || ')';
    end if;
    if new.guests is not null then
      gosti := new.guests || ' ' || case
        when new.guests % 10 = 1 and new.guests % 100 <> 11 then 'gost'
        when new.guests % 10 between 2 and 4 and (new.guests % 100 < 12 or new.guests % 100 > 14) then 'gosta'
        else 'gostiju' end;
    end if;

    predmet := 'Novi upit: ' || coalesce(objekt.name, 'vaš objekt')
            || case when termin <> '' then ' · ' || split_part(termin, ' (', 1) else '' end;
    link := adresa || '/dashboard.html?otvori=upiti&objekt=' || objekt.id;

    html := '<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#103D4B;max-width:560px">'
      || '<p style="margin:0 0 4px;font-size:13px;color:#536D77">Odmoria · novi upit</p>'
      || '<h1 style="margin:0 0 16px;font-size:22px">' || _html_esc(new.guest_name) || ' pita za ' || _html_esc(objekt.name) || '</h1>'
      || case when termin <> '' or gosti <> '' then
           '<p style="margin:0 0 12px"><b>' || _html_esc(concat_ws(' · ', nullif(termin, ''), nullif(gosti, ''))) || '</b></p>' else '' end
      || case when coalesce(new.message, '') <> '' then
           '<div style="margin:0 0 16px;padding:12px 14px;background:#EDF5F6;border-radius:10px;white-space:pre-wrap">' || _html_esc(new.message) || '</div>' else '' end
      || '<p style="margin:0 0 4px">Kontakt gosta:</p><ul style="margin:0 0 20px;padding-left:20px">'
      || case when new.guest_email is not null then
           '<li>E-mail: <a href="mailto:' || _html_esc(new.guest_email) || '">' || _html_esc(new.guest_email) || '</a></li>' else '' end
      || case when new.guest_phone is not null then
           '<li>Telefon: <a href="tel:' || _html_esc(regexp_replace(new.guest_phone, '[^0-9+]', '', 'g')) || '">' || _html_esc(new.guest_phone) || '</a></li>' else '' end
      || '</ul>'
      || '<p style="margin:0 0 20px"><a href="' || _html_esc(link) || '" style="display:inline-block;padding:12px 20px;background:#116D76;color:#fff;text-decoration:none;border-radius:7px;font-weight:bold">Otvori upit u Odmoriji</a></p>'
      || '<p style="margin:0 0 8px;font-size:14px;color:#536D77">Tamo ga jednim klikom prihvatite: nastane rezervacija i privatni link za gosta.'
      || case when new.guest_email is not null then ' Na ovaj e-mail možete i samo odgovoriti — odgovor ide gostu.' else '' end || '</p>'
      || '<p style="margin:16px 0 0;font-size:12px;color:#536D77">Ove obavijesti isključujete u Odmoriji: Račun → Obavijesti → Važne obavijesti.</p>'
      || '</div>';

    tekst := new.guest_name || ' pita za ' || coalesce(objekt.name, 'vaš objekt') || E'\n'
      || case when termin <> '' or gosti <> '' then concat_ws(' · ', nullif(termin, ''), nullif(gosti, '')) || E'\n' else '' end
      || case when coalesce(new.message, '') <> '' then E'\n' || new.message || E'\n' else '' end
      || E'\nKontakt gosta:'
      || case when new.guest_email is not null then E'\nE-mail: ' || new.guest_email else '' end
      || case when new.guest_phone is not null then E'\nTelefon: ' || new.guest_phone else '' end
      || E'\n\nOtvori upit u Odmoriji: ' || link
      || E'\n\nOve obavijesti isključujete u Odmoriji: Račun → Obavijesti.';

    tijelo := jsonb_build_object('from', od, 'to', jsonb_build_array(primatelj),
                                 'subject', predmet, 'html', html, 'text', tekst);
    if new.guest_email is not null then tijelo := tijelo || jsonb_build_object('reply_to', new.guest_email); end if;

    perform net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object('Authorization', 'Bearer ' || kljuc, 'Content-Type', 'application/json'),
      body := tijelo,
      timeout_milliseconds := 10000);
  exception when others then
    raise warning 'Odmoria: e-mail o upitu nije poslan: %', sqlerrm;
  end;
  return new;
end;
$$;
revoke all on function public._email_o_upitu() from public, anon, authenticated;

drop trigger if exists email_o_upitu on public.inquiries;
create trigger email_o_upitu after insert on public.inquiries
  for each row execute function public._email_o_upitu();

-- PROVJERA:
-- a) pošaljite upit s javne stranice svog objekta; e-mail stiže za nekoliko sekundi
-- b) odgovor Resenda (200 = poslano; 401/403 = ključ ili domena):
--    select status_code, content from net._http_response order by created desc limit 5;
