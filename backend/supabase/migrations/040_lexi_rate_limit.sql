-- Lexi: atomic daily message quota.
--
-- The cap used to be enforced as read-then-check in the controller: count today's
-- rows, compare to the cap, then insert. That is a TOCTOU race — N concurrent
-- requests all read the same pre-insert count, all pass the check, and all call
-- OpenAI. A free-tier account could fire 1000 parallel requests past a 30/day cap
-- and bill us for every one of them.
--
-- This replaces the count with a per-user/per-day counter row incremented inside
-- a single statement, so Postgres row locking serialises concurrent claims.

-- Idempotent so it is safe to paste into the SQL editor twice.
create table if not exists public.lexi_usage_daily (
  user_id   uuid not null references public.users(id) on delete cascade,
  -- UTC day, matching the window the controller previously counted over.
  usage_day date not null,
  -- Number of user messages successfully claimed on this day.
  used      int  not null default 0,
  primary key (user_id, usage_day)
);

alter table public.lexi_usage_daily enable row level security;
-- Intentionally NO policies: with RLS enabled and no policy, Postgres denies all
-- access to anon/authenticated. Every read and write goes through the backend's
-- service-role client, which bypasses RLS, and the backend scopes by user_id.
-- Do not "fix" this by adding a permissive policy.

-- Claims one message against the caller's daily quota.
--
-- Returns the usage count AFTER a successful claim, or NULL when the cap is
-- already reached. Callers must treat NULL as "quota exhausted" (HTTP 429).
--
-- Atomicity: the INSERT ... ON CONFLICT DO UPDATE takes a row lock on the
-- (user_id, usage_day) row, so parallel callers queue behind each other and each
-- sees the previous claim's increment. The WHERE clause on the UPDATE makes the
-- statement return zero rows once the cap is hit, which is what produces NULL.
create or replace function public.lexi_claim_daily_quota(
  p_user_id uuid,
  p_cap     int
)
returns int
language sql
security definer
set search_path = public
as $$
  insert into public.lexi_usage_daily as u (user_id, usage_day, used)
  values (p_user_id, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, usage_day) do update
    set used = u.used + 1
    where u.used < p_cap
  returning used;
$$;

-- Releases a previously claimed message.
--
-- Used when the turn fails before the learner got anything usable, so a failed
-- request does not silently burn quota. Floors at zero; never creates a row.
create or replace function public.lexi_release_daily_quota(p_user_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.lexi_usage_daily
     set used = greatest(used - 1, 0)
   where user_id = p_user_id
     and usage_day = (now() at time zone 'utc')::date;
$$;

-- Only the service role should be able to move the quota. Guarded because the
-- anon/authenticated roles are Supabase-specific: a plain Postgres (local test
-- DB, CI) has no such roles and a bare REVOKE would abort the whole migration.
revoke all on function public.lexi_claim_daily_quota(uuid, int) from public;
revoke all on function public.lexi_release_daily_quota(uuid) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.lexi_claim_daily_quota(uuid, int) from anon;
    revoke all on function public.lexi_release_daily_quota(uuid) from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on function public.lexi_claim_daily_quota(uuid, int) from authenticated;
    revoke all on function public.lexi_release_daily_quota(uuid) from authenticated;
  end if;
end $$;

-- Backfill so the switch-over doesn't hand every existing learner a fresh quota
-- mid-day: seed today's counter from the rows the old count would have seen.
insert into public.lexi_usage_daily (user_id, usage_day, used)
select t.user_id, (now() at time zone 'utc')::date, count(*)
  from public.lexi_messages m
  join public.lexi_threads t on t.id = m.thread_id
 where m.role = 'user'
   and m.created_at >= (now() at time zone 'utc')::date
 group by t.user_id
on conflict (user_id, usage_day) do nothing;
