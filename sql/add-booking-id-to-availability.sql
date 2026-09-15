-- ============================================================
-- Poveži availability retke s rezervacijom koja ih je zauzela
-- Pokreni jednom u Supabase -> SQL Editor.
-- Omogućuje da se pri brisanju rezervacije točno oslobode samo
-- dani te rezervacije (bez diranja ručno blokiranih dana).
-- ============================================================

alter table availability
  add column if not exists booking_id uuid references bookings(id) on delete set null;
