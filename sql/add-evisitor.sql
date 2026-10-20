-- =====================================================================
--  eVisitor iz dashboarda (20. 10. 2026. — odluke, točka 40)
--
--  guest_registrations.evisitor = { nacin: test|live, poslano_at,
--    osobe: [{ ime, ok, poruka }] } — što je zadnji put poslano u eVisitor.
--  Upisuje api/_evisitor.js KORISNIKOVIM tokenom (ne poslužiteljskim
--  ključem), pa ga RLS pušta samo onome tko smije i čitati prijavu.
--  Lozinka za eVisitor se nigdje ne sprema.
--
--  Pokrenuti NAKON add-guest-registration.sql. Bez brisanja. Ponovljivo.
-- =====================================================================

begin;

alter table public.guest_registrations add column if not exists evisitor jsonb;

-- vlasnik (i suradnik po politici „suradnik”) smije mijenjati SAMO ovaj stupac
grant update (evisitor) on public.guest_registrations to authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'guest_registrations' and policyname = 'prijave: vlasnik označava eVisitor') then
    create policy "prijave: vlasnik označava eVisitor" on public.guest_registrations for update to authenticated
      using (exists (select 1 from public.properties p where p.id = property_id and p.user_id = auth.uid()))
      with check (exists (select 1 from public.properties p where p.id = property_id and p.user_id = auth.uid()));
  end if;
end $$;

commit;
