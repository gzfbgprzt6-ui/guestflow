-- ============================================================================
--  Odmoria — admin: stvaranje pretplate, popis računa, zapisnik promjena
--  ---------------------------------------------------------------------------
--  1. Admin smije STVORITI red u `subscriptions` (dosad samo mijenjati
--     postojeći) — domaćinu bez reda sad se može postaviti plan.
--  2. `admin_korisnici()` — svi računi (e-mail računa, registracija, zadnja
--     prijava) iz auth.users; samo za vlasnika platforme.
--  3. `admin_log` — zapisnik: tko je, kada i što promijenio u pretplatama i
--     popustima. Upisuju ga okidači (i za promjene iz admina i za Stripe);
--     „tko” je prazan kad je promjena došla s poslužitelja (Stripe webhook).
--
--  UID vlasnika isti je kao u sql/admin-access.sql.
--  Pokrenuti u Supabase SQL editoru. Idempotentno.
-- ============================================================================

-- 1. ---------------------------------------------------------------------------
drop policy if exists "Admin creates subscriptions" on public.subscriptions;
create policy "Admin creates subscriptions" on public.subscriptions for insert
  with check (auth.uid() = '56549320-2c02-405c-9936-770144bd9b49');

-- 2. ---------------------------------------------------------------------------
create or replace function public.admin_korisnici()
returns table (id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = public, auth, pg_temp
as $$
begin
  if auth.uid() is distinct from '56549320-2c02-405c-9936-770144bd9b49'::uuid then
    return;   -- nitko drugi ne dobiva ništa
  end if;
  return query select u.id, u.email::text, u.created_at, u.last_sign_in_at from auth.users u order by u.created_at;
end;
$$;
revoke all on function public.admin_korisnici() from public, anon;
grant execute on function public.admin_korisnici() to authenticated;

-- 3. ---------------------------------------------------------------------------
create table if not exists public.admin_log (
  id           bigserial primary key,
  created_at   timestamptz not null default now(),
  tko          uuid,            -- auth.uid() onoga tko je promijenio; null = poslužitelj (Stripe)
  tablica      text not null,
  radnja       text not null,   -- INSERT | UPDATE | DELETE
  za_korisnika uuid,
  prije        jsonb,
  poslije      jsonb
);
create index if not exists admin_log_vrijeme on public.admin_log (created_at desc);

alter table public.admin_log enable row level security;
drop policy if exists "zapisnik: admin čita" on public.admin_log;
create policy "zapisnik: admin čita" on public.admin_log for select to authenticated
  using (auth.uid() = '56549320-2c02-405c-9936-770144bd9b49');
revoke all on public.admin_log from anon, authenticated;
grant select on public.admin_log to authenticated;

create or replace function public._zapisi_promjenu()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  staro jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  novo  jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
begin
  if tg_op = 'UPDATE' and staro is not distinct from novo then return new; end if;
  insert into public.admin_log (tko, tablica, radnja, za_korisnika, prije, poslije)
  values (auth.uid(), tg_table_name, tg_op,
          nullif(coalesce(novo ->> 'user_id', staro ->> 'user_id'), '')::uuid, staro, novo);
  return coalesce(new, old);
end;
$$;

drop trigger if exists zapisnik on public.subscriptions;
create trigger zapisnik after insert or update or delete on public.subscriptions
  for each row execute function public._zapisi_promjenu();

do $$ begin
  if to_regclass('public.plan_promotions') is not null then
    drop trigger if exists zapisnik on public.plan_promotions;
    create trigger zapisnik after insert or update or delete on public.plan_promotions
      for each row execute function public._zapisi_promjenu();
  end if;
end $$;
