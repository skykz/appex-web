-- Durable record of every state-changing action taken through the admin panel.
--
-- Why this exists: before this table, the only admin action that recorded *who*
-- did it was refund processing (`refund_requests.processed_by`, migration 020).
-- Course/lesson/category deletes, submission grading, and contact-message
-- handling were all anonymous. With more than one operator holding an admin
-- account, "who changed this and when" was unanswerable — and the user-mutating
-- actions coming next (credit adjustments, suspensions, comped subscriptions,
-- role grants) make that gap untenable: those touch money and access.
--
-- Design notes:
--   * Rows are append-only. Nothing in the app should ever update or delete them;
--     an audit trail that can be rewritten by the thing it audits is not an audit
--     trail. Enforced by trigger below rather than by convention.
--   * `actor_id` is `set null` (not `cascade`): deleting an admin account must not
--     erase the history of what that account did. `actor_email` keeps the row
--     human-readable after the user row is gone.
--   * `target_id` is text, not uuid: admin targets span both uuid keys (users,
--     subscriptions, submissions) and bigint keys (skills, modules, lessons).

create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),

  -- Who acted. Denormalized email survives actor deletion.
  actor_id uuid references public.users(id) on delete set null,
  actor_email text not null,

  -- Machine-readable verb, e.g. 'user.credits_adjusted', 'course.deleted',
  -- 'subscription.canceled', 'refund.processed', 'user.role_changed'.
  action text not null,

  -- What was acted on. `target_type` is the logical entity ('user', 'skill',
  -- 'lesson', 'subscription', 'contact_message', ...); `target_id` is its key
  -- as text since key types differ across tables.
  target_type text not null,
  target_id text,

  -- Free-form context: before/after values, reason codes, Stripe ids, the
  -- request body that drove the change. Keep PII to what the action requires.
  metadata jsonb not null default '{}'::jsonb,

  -- Set when the action failed, so attempted-but-rejected changes are visible
  -- too (a failed suspension attempt is security-relevant).
  error text,

  created_at timestamptz not null default now()
);

-- Primary read pattern: the global activity feed, newest first.
create index if not exists idx_admin_actions_created_at
  on public.admin_actions(created_at desc);

-- "What has been done to this record?" — used by the per-entity history panel.
create index if not exists idx_admin_actions_target
  on public.admin_actions(target_type, target_id, created_at desc);

-- "What has this operator done?" — used when reviewing a specific admin.
create index if not exists idx_admin_actions_actor
  on public.admin_actions(actor_id, created_at desc);

-- Filter the feed by verb.
create index if not exists idx_admin_actions_action
  on public.admin_actions(action, created_at desc);

-- Append-only enforcement: block UPDATE and DELETE for everyone, including the
-- service role. If a row ever genuinely must be removed (e.g. a GDPR erasure
-- request covering audit metadata), drop this trigger deliberately, do the
-- surgery, and recreate it — that friction is the point.
create or replace function public.admin_actions_block_mutations()
returns trigger
language plpgsql
as $$
begin
  raise exception 'admin_actions is append-only (attempted %)', tg_op;
end;
$$;

drop trigger if exists trg_admin_actions_no_update on public.admin_actions;
create trigger trg_admin_actions_no_update
  before update on public.admin_actions
  for each row execute function public.admin_actions_block_mutations();

drop trigger if exists trg_admin_actions_no_delete on public.admin_actions;
create trigger trg_admin_actions_no_delete
  before delete on public.admin_actions
  for each row execute function public.admin_actions_block_mutations();

-- Row-level triggers never fire for TRUNCATE, so without this a single
-- `truncate admin_actions` would empty the whole trail despite the guards above.
-- TRUNCATE triggers must be statement-level.
drop trigger if exists trg_admin_actions_no_truncate on public.admin_actions;
create trigger trg_admin_actions_no_truncate
  before truncate on public.admin_actions
  for each statement execute function public.admin_actions_block_mutations();

-- Service-role only: written by admin controllers, read by admin tooling.
-- No policies are defined, so RLS denies all anon/authenticated access.
alter table public.admin_actions enable row level security;
