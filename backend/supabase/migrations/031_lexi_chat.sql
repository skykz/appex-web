-- Lexi: in-course AI mentor threads and messages.
-- One thread per student (linked to a course/skill).
-- Messages store the full turn history + optional 👍/👎 feedback.

create table public.lexi_threads (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  -- NULL means the thread is not tied to a specific course (skills.id is serial/int)
  course_id  int references public.skills(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.lexi_messages (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references public.lexi_threads(id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  -- 1 = thumbs up, -1 = thumbs down, NULL = no feedback given
  feedback   smallint check (feedback in (-1, 1)),
  created_at timestamptz not null default now()
);

-- Fast message lookup in thread order
create index lexi_messages_thread_created_idx on public.lexi_messages (thread_id, created_at);

-- Fast daily-cap count: user's messages today
create index lexi_messages_thread_role_idx on public.lexi_messages (thread_id, role, created_at);

alter table public.lexi_threads enable row level security;
alter table public.lexi_messages enable row level security;
