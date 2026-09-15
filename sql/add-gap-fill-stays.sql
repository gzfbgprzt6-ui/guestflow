-- ============================================================
-- Dopuna minimalnog boravka: "popuni prazninu" iznimka
-- Pokreni jednom u Supabase -> SQL Editor.
-- Kad je uključeno, gost smije rezervirati kraći boravak od
-- properties.min_stay ako odabrani raspon u cijelosti popunjava
-- slobodnu prazninu između dvije postojeće rezervacije.
-- ============================================================

alter table properties
  add column if not exists allow_gap_fill_stays boolean not null default false;
