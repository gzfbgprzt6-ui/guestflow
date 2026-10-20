-- =====================================================================
--  Mogućnosti po planu (19. 10. 2026., prijedlog v4 — odluke, točka 34)
--
--  plans.mogucnosti = popis mogućnosti koje plan otključava. Izvor istine
--  ostaje tablica plans: promjena = UPDATE ovdje, bez diranja koda.
--
--    koraci     — „Kako ući” sa slikama, ekran korak po korak, obavijest „Ušli smo”
--    preporuke  — preporuke u blizini (i „Predloži mjesta u blizini”)
--    ocjena     — ocjena gosta na odlasku
--    evisitor   — prijava gostiju za eVisitor
--    stilovi    — 8 stilova javne stranice
--    cistacica  — link za čistačicu
--    promocija  — objave, letak, Facebook grupe
--    email      — automatski e-mail gostu
--    izravno    — sezonske cijene, ponuda s kaparom, povratni gosti (add-direct-bookings.sql)
--    agencija   — svi objekti, predložak za više objekata, izvještaj vlasniku (add-per-object-plans.sql)
--
--  Free nema ništa od toga: šifra i Wi-Fi s otključavanjem, kuća, pravila,
--  odlazak, domaćin, javna stranica s kalendarom i upitima. Broj objekata,
--  fotografija, jezika i dana analitike i dalje su stupci max_* / analytics_days.
--
--  mogucnosti_vodica(token, slug): vodič pita što smije pokazati. Vraća samo
--  popis mogućnosti i oznaku „pokreće Odmoria” — nikad podatke objekta.
--  Bez ove datoteke vodič i dashboard pokazuju sve, kao prije.
--
--  Usput ispravlja razlike plana i koda (odluke, točka 32/9): jezika ima 6,
--  suradnika najviše 3 (add-team-access.sql).
--
--  Pokrenuti JEDNOM u Supabase SQL editoru (smije se ponoviti).
-- =====================================================================

begin;

alter table public.plans add column if not exists mogucnosti jsonb not null default '[]'::jsonb;

update public.plans set mogucnosti = '[]'::jsonb where id = 'free';
update public.plans set mogucnosti = '["koraci","preporuke","ocjena","evisitor","stilovi","cistacica"]'::jsonb where id = 'pro';
update public.plans set mogucnosti = '["koraci","preporuke","ocjena","evisitor","stilovi","cistacica","promocija","email"]'::jsonb where id = 'business';

update public.plans set max_languages = 6 where max_languages > 6;
update public.plans set max_team_members = 3 where max_team_members > 3;

create or replace function public.mogucnosti_vodica(p_token text, p_slug text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  vlasnik uuid;
  pl public.plans%rowtype;
begin
  if p_token is null or length(p_token) < 6 or length(p_token) > 128 then
    return jsonb_build_object('stanje', 'invalid');
  end if;
  select p.user_id into vlasnik
    from public.bookings b join public.properties p on p.id = b.property_id
   where b.token = p_token and coalesce(b.is_active, false)
     and (b.token_expires_at is null or b.token_expires_at >= now())
   limit 1;
  if vlasnik is null and p_slug is not null then
    select user_id into vlasnik from public.properties
     where slug = p_slug and guest_token is not null and guest_token = p_token limit 1;
  end if;
  if vlasnik is null then return jsonb_build_object('stanje', 'invalid'); end if;
  select * into pl from public.plans where id = public.current_plan_id(vlasnik);
  if not found then select * into pl from public.plans where id = 'free'; end if;
  return jsonb_build_object('stanje', 'ok', 'plan', pl.id,
    'mogucnosti', coalesce(pl.mogucnosti, '[]'::jsonb),
    'oznaka', not coalesce(pl.can_remove_branding, false));
end;
$$;
revoke all on function public.mogucnosti_vodica(text, text) from public;
grant execute on function public.mogucnosti_vodica(text, text) to anon, authenticated;

commit;

-- provjera:
-- select id, mogucnosti, max_languages, max_team_members from public.plans order by sort_order;
