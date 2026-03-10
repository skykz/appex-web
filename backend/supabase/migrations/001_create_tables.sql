-- ============================================
-- AppEx Database Schema
-- ============================================

-- 1. USERS
create table public.users (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  name       text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. SKILLS
create table public.skills (
  id          serial primary key,
  title       text not null,
  description text not null,
  about       text not null,
  emoji       text not null,
  category    text not null check (category in ('ai_automations','freelancing','marketing','ai_content')),
  duration    text not null,
  "order"     int not null default 0,
  created_at  timestamptz not null default now()
);

-- 3. MODULES
create table public.modules (
  id       serial primary key,
  skill_id int not null references public.skills(id) on delete cascade,
  title    text not null,
  "order"  int not null default 0
);

-- 4. LESSONS
create table public.lessons (
  id        serial primary key,
  module_id int not null references public.modules(id) on delete cascade,
  label     text not null,
  title     text not null,
  emoji     text not null,
  content   jsonb not null default '[]'::jsonb,
  "order"   int not null default 0
);

-- 5. SKILL_PROGRESS
create table public.skill_progress (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  skill_id   int not null references public.skills(id) on delete cascade,
  progress   int not null default 0 check (progress >= 0 and progress <= 100),
  status     text not null default 'not_started' check (status in ('not_started','in_progress','completed')),
  updated_at timestamptz not null default now(),
  unique (user_id, skill_id)
);

-- 6. LESSON_PROGRESS
create table public.lesson_progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  lesson_id    int not null references public.lessons(id) on delete cascade,
  step_index   int not null default 0,
  completed    boolean not null default false,
  rating       int check (rating >= 1 and rating <= 5),
  feedback     text,
  completed_at timestamptz,
  unique (user_id, lesson_id)
);

-- 7. STREAKS
create table public.streaks (
  user_id          uuid primary key references public.users(id) on delete cascade,
  current          int not null default 0,
  best             int not null default 0,
  milestone        int not null default 28,
  last_active_date date,
  updated_at       timestamptz not null default now()
);

-- 8. STREAK_DAYS
create table public.streak_days (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  date    date not null,
  unique (user_id, date)
);

-- 9. CHAT_SESSIONS
create table public.chat_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  title      text not null,
  model_id   text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 10. CHAT_MESSAGES
create table public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  role       text not null check (role in ('user','assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);

-- 11. USER_CREDITS
create table public.user_credits (
  user_id    uuid primary key references public.users(id) on delete cascade,
  balance    int not null default 5 check (balance >= 0),
  updated_at timestamptz not null default now()
);

-- 12. PROMPTS
create table public.prompts (
  id       serial primary key,
  title    text not null,
  category text not null,
  content  text not null,
  "order"  int not null default 0
);

-- 13. SUBSCRIPTIONS
create table public.subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid unique not null references public.users(id) on delete cascade,
  plan_name    text not null,
  status       text not null default 'active' check (status in ('active','paused','cancelled')),
  intro_price  numeric(10,2),
  price        numeric(10,2) not null,
  renewal_date date not null,
  paused_at    timestamptz,
  created_at   timestamptz not null default now()
);

-- 14. BILLING_HISTORY
create table public.billing_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  amount      numeric(10,2) not null,
  description text not null,
  paid_at     timestamptz not null,
  created_at  timestamptz not null default now()
);

-- 15. CONTACT_MESSAGES
create table public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  subject    text not null,
  message    text not null,
  created_at timestamptz not null default now()
);

-- ============================================
-- INDEXES
-- ============================================
create index idx_modules_skill_id on public.modules(skill_id);
create index idx_lessons_module_id on public.lessons(module_id);
create index idx_skill_progress_user_id on public.skill_progress(user_id);
create index idx_lesson_progress_user_id on public.lesson_progress(user_id);
create index idx_streak_days_user_id on public.streak_days(user_id);
create index idx_chat_sessions_user_id on public.chat_sessions(user_id);
create index idx_chat_messages_session_id on public.chat_messages(session_id);
create index idx_billing_history_user_id on public.billing_history(user_id);
create index idx_contact_messages_user_id on public.contact_messages(user_id);
create index idx_prompts_category on public.prompts(category);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table public.users enable row level security;
alter table public.skills enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.skill_progress enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.streaks enable row level security;
alter table public.streak_days enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.user_credits enable row level security;
alter table public.prompts enable row level security;
alter table public.subscriptions enable row level security;
alter table public.billing_history enable row level security;
alter table public.contact_messages enable row level security;

-- Public read for catalog tables
create policy "Anyone can read skills" on public.skills for select using (true);
create policy "Anyone can read modules" on public.modules for select using (true);
create policy "Anyone can read lessons" on public.lessons for select using (true);
create policy "Anyone can read prompts" on public.prompts for select using (true);

-- Users can read/update own profile
create policy "Users can read own profile" on public.users for select using (auth.uid() = id);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);

-- Service role can insert users (signup)
create policy "Service can insert users" on public.users for insert with check (true);

-- User-specific data: own rows only
create policy "Users own skill_progress" on public.skill_progress for all using (auth.uid() = user_id);
create policy "Users own lesson_progress" on public.lesson_progress for all using (auth.uid() = user_id);
create policy "Users own streaks" on public.streaks for all using (auth.uid() = user_id);
create policy "Users own streak_days" on public.streak_days for all using (auth.uid() = user_id);
create policy "Users own chat_sessions" on public.chat_sessions for all using (auth.uid() = user_id);
create policy "Users own chat_messages" on public.chat_messages for all using (
  session_id in (select id from public.chat_sessions where user_id = auth.uid())
);
create policy "Users own user_credits" on public.user_credits for all using (auth.uid() = user_id);
create policy "Users own subscriptions" on public.subscriptions for all using (auth.uid() = user_id);
create policy "Users own billing_history" on public.billing_history for all using (auth.uid() = user_id);
create policy "Users own contact_messages" on public.contact_messages for all using (auth.uid() = user_id);
