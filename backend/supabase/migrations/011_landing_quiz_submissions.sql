-- Marketing quiz submissions from landings (USA funnel, extensible to other landings).

create table if not exists public.landing_quiz_submissions (
  id             uuid primary key default gen_random_uuid(),
  email          text not null,
  name           text,
  landing        text not null default 'usa',
  answers        jsonb not null default '{}'::jsonb,
  selected_plan  text check (selected_plan is null or selected_plan in ('week_1', 'week_4', 'week_12')),
  utm_source     text,
  utm_campaign   text,
  utm_medium     text,
  session_id     text,
  user_id        uuid references public.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (email, landing)
);

create index if not exists idx_landing_quiz_submissions_landing
  on public.landing_quiz_submissions(landing);

create index if not exists idx_landing_quiz_submissions_created
  on public.landing_quiz_submissions(created_at desc);

create index if not exists idx_landing_quiz_submissions_user
  on public.landing_quiz_submissions(user_id)
  where user_id is not null;

-- RLS: quiz leads contain email + PII. The USA landing writes via the Express API
-- using the service role (bypasses RLS). No policies for anon/authenticated —
-- clients cannot read or write this table through Supabase keys directly.
alter table public.landing_quiz_submissions enable row level security;
