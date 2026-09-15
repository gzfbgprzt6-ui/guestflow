-- ============================================================
-- FIX: nedostajuci stupac 'source' na availability
-- Pokreni jednom u Supabase -> SQL Editor.
-- Bez ovoga: svaki upis u availability (ručno označavanje dostupnosti,
-- kreiranje rezervacije) tiho ne uspijeva jer stupac ne postoji,
-- iako je oduvijek dio koda i dokumentirane sheme.
-- ============================================================

alter table availability add column if not exists source text default 'manual';
