-- ============================================================================
--  Odmoria — brisanje vlastitog računa (Račun → Brisanje računa)
--  ---------------------------------------------------------------------------
--  Funkcija `obrisi_moj_racun()` briše SVE podatke prijavljenog domaćina:
--  objekte i sve uz njih (upute, preporuke, kalendar, rezervacije, preglede,
--  upite, recenzije, podatke gostiju, link za čistačicu), pretplatu i sam
--  račun (auth.users). Radi samo za sebe — auth.uid(), bez parametara.
--
--  Ne briše ako postoji aktivna pretplata karticom (Stripe) — naplata bi se
--  nastavila bez računa; prvo otkaz u portalu. Fotografije na Cloudinaryju
--  ostaju (preglednik ih ne može obrisati) — vidi docs/odluke.md, točka 17.
--
--  Tablice koje još ne postoje (SQL nije pokrenut) se preskaču.
--  Pokrenuti u Supabase SQL editoru. Idempotentno.
-- ============================================================================

create or replace function public.obrisi_moj_racun()
returns jsonb language plpgsql volatile security definer set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  ids uuid[];
  t text;
  sub jsonb;
begin
  if uid is null then return jsonb_build_object('stanje', 'neprijavljen'); end if;

  if to_regclass('public.subscriptions') is not null then
    select to_jsonb(s) into sub from public.subscriptions s where s.user_id = uid limit 1;
    if sub is not null and coalesce(sub ->> 'stripe_subscription_id', '') <> ''
       and sub ->> 'status' in ('active', 'trialing', 'past_due') and coalesce(sub ->> 'plan', 'free') <> 'free' then
      return jsonb_build_object('stanje', 'pretplata');
    end if;
  end if;

  select coalesce(array_agg(id), '{}') into ids from public.properties where user_id = uid;

  -- redom: ono što pokazuje na rezervacije prije rezervacija
  foreach t in array array['guest_registrations', 'reviews', 'cleaner_links', 'inquiries', 'availability',
                           'bookings', 'sections', 'amenities', 'local_places', 'transport', 'attractions',
                           'house_rules', 'faq', 'page_views'] loop
    if to_regclass('public.' || t) is not null then
      execute format('delete from public.%I where property_id = any($1)', t) using ids;
    end if;
  end loop;

  delete from public.properties where user_id = uid;
  if to_regclass('public.plan_promotions') is not null then
    delete from public.plan_promotions where user_id = uid;   -- osobni popusti
  end if;
  if to_regclass('public.subscriptions') is not null then
    delete from public.subscriptions where user_id = uid;
  end if;
  delete from auth.users where id = uid;

  return jsonb_build_object('stanje', 'ok', 'objekata', coalesce(array_length(ids, 1), 0));
end;
$$;

revoke all on function public.obrisi_moj_racun() from public, anon;
grant execute on function public.obrisi_moj_racun() to authenticated;
