-- ============================================================
-- Admin pristup (vefraj@gmail.com) za admin.html
-- Pokreni jednom u Supabase -> SQL Editor.
-- Dodaje SAMO dodatne read/update politike scope-ane na tvoj email,
-- postojece politike (vlasnik vidi svoje) ostaju netaknute.
-- ============================================================

drop policy if exists "Admin reads all properties" on properties;
create policy "Admin reads all properties"
on properties for select
using (auth.jwt() ->> 'email' = 'vefraj@gmail.com');

drop policy if exists "Admin reads all subscriptions" on subscriptions;
create policy "Admin reads all subscriptions"
on subscriptions for select
using (auth.jwt() ->> 'email' = 'vefraj@gmail.com');

drop policy if exists "Admin updates subscriptions" on subscriptions;
create policy "Admin updates subscriptions"
on subscriptions for update
using (auth.jwt() ->> 'email' = 'vefraj@gmail.com');

drop policy if exists "Admin reads all bookings" on bookings;
create policy "Admin reads all bookings"
on bookings for select
using (auth.jwt() ->> 'email' = 'vefraj@gmail.com');

-- page_views tablica nikad nije bila kreirana iako je dashboard graf
-- ocekivao da postoji (zato je graf pregleda uvijek bio prazan)
create table if not exists page_views (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  view_type text not null,
  timestamp timestamptz not null default now()
);
alter table page_views enable row level security;

drop policy if exists "Anyone can log a page view" on page_views;
create policy "Anyone can log a page view"
on page_views for insert
with check (true);

drop policy if exists "Owner reads own page views" on page_views;
create policy "Owner reads own page views"
on page_views for select
using (exists (select 1 from properties p where p.id = page_views.property_id and p.user_id = auth.uid()));

drop policy if exists "Admin reads all page_views" on page_views;
create policy "Admin reads all page_views"
on page_views for select
using (auth.jwt() ->> 'email' = 'vefraj@gmail.com');
