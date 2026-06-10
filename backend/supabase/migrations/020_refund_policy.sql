-- Refund policy: lesson open audit trail, user flags, refund decision log.

alter table public.users
  add column if not exists courtesy_refund_used boolean not null default false,
  add column if not exists is_eu_resident boolean not null default false,
  add column if not exists country_code text;

alter table public.lesson_progress
  add column if not exists opened_at timestamptz;

-- Every lesson open is logged (including repeat opens on the same lesson).
create table if not exists public.lesson_open_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  lesson_id  int not null references public.lessons(id) on delete cascade,
  opened_at  timestamptz not null default now()
);

create index if not exists idx_lesson_open_events_user_opened
  on public.lesson_open_events (user_id, opened_at desc);

create index if not exists idx_lesson_open_events_user_lesson
  on public.lesson_open_events (user_id, lesson_id);

create table if not exists public.refund_requests (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users(id) on delete cascade,
  billing_history_id  uuid references public.billing_history(id) on delete set null,
  decision            text not null check (decision in ('approved', 'denied')),
  reason_code         text not null,
  reason_detail       text,
  days_since_purchase int,
  lessons_opened      int not null default 0,
  lessons_completed   int not null default 0,
  is_renewal_charge   boolean not null default false,
  courtesy_applied    boolean not null default false,
  stripe_refund_id    text,
  processed_by        uuid references public.users(id) on delete set null,
  created_at          timestamptz not null default now()
);

create index if not exists idx_refund_requests_user
  on public.refund_requests (user_id, created_at desc);

alter table public.lesson_open_events enable row level security;
alter table public.refund_requests enable row level security;
