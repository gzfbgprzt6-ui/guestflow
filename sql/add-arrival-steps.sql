-- =====================================================================
--  Upute za ulazak korak po korak, sa slikama (12. 10. 2026.)
--  Dashboard → Objekt → Dolazak i upute → „Kako ući — korak po korak”;
--  gost ih vidi SAMO u privatnom vodiču (/h/…), na stranici „Dolazak”.
--
--  Pokrenuti u Supabase SQL editoru JEDNOM (smije se i ponoviti).
--  Dodaje jedan stupac u `sections`; politike i funkcije se ne mijenjaju —
--  vodic_gosta() vraća cijeli red sections (to_jsonb), pa novi stupac
--  vodič dobije sam. Javna stranica (p.html) sections nikad ne čita.
--
--  Oblik: [{"naslov": "Ulaz u dvorište", "tekst": "…", "foto": "https://res.cloudinary.com/…"}, …]
--  Najviše 12 koraka; fotografija je samo adresa slike na Cloudinaryju.
-- =====================================================================

begin;

alter table public.sections
  add column if not exists ulazak_koraci jsonb not null default '[]'::jsonb;

-- ako je stupac već postojao s drukčijim sadržajem, ovo stane (ništa se ne mijenja)
do $$
begin
  if exists (select 1 from public.sections
              where ulazak_koraci is not null and jsonb_typeof(ulazak_koraci) <> 'array') then
    raise exception 'U sections.ulazak_koraci postoje vrijednosti koje nisu popis. Ništa nije promijenjeno.';
  end if;
end $$;

alter table public.sections drop constraint if exists sections_ulazak_koraci_check;
alter table public.sections
  add constraint sections_ulazak_koraci_check check (
    jsonb_typeof(ulazak_koraci) = 'array' and jsonb_array_length(ulazak_koraci) <= 12
    and length(ulazak_koraci::text) <= 40000
  );

comment on column public.sections.ulazak_koraci is
  'Upute za ulazak po koracima: [{naslov, tekst, foto}] — samo privatni vodič. Najviše 12.';

commit;
