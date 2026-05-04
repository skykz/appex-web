-- Personal prompt library: each user owns rows; category acts as a simple catalog/folder label.
--everything

create table public.user_prompts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  title       text not null,
  category    text not null default 'General',
  content     text not null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_user_prompts_user_id on public.user_prompts(user_id);
create index idx_user_prompts_user_category on public.user_prompts(user_id, category);

alter table public.user_prompts enable row level security;

create policy "Users select own prompts"
  on public.user_prompts for select
  using (auth.uid() = user_id);

create policy "Users insert own prompts"
  on public.user_prompts for insert
  with check (auth.uid() = user_id);

create policy "Users update own prompts"
  on public.user_prompts for update
  using (auth.uid() = user_id);

create policy "Users delete own prompts"
  on public.user_prompts for delete
  using (auth.uid() = user_id);
