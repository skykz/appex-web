-- Admin-controlled catalog visibility.
-- Hidden parents hide their whole subtree from learner-facing APIs.

alter table public.categories
  add column if not exists is_visible boolean not null default true;
alter table public.categories
  alter column is_visible set default false;

alter table public.skills
  add column if not exists is_visible boolean not null default true;
alter table public.skills
  alter column is_visible set default false;

alter table public.modules
  add column if not exists is_visible boolean not null default true;
alter table public.modules
  alter column is_visible set default false;

alter table public.lessons
  add column if not exists is_visible boolean not null default true;
alter table public.lessons
  alter column is_visible set default false;

create index if not exists idx_categories_visible_order
  on public.categories(is_visible, sort_order);

create index if not exists idx_skills_visible_category_order
  on public.skills(is_visible, category, "order");

create index if not exists idx_modules_visible_skill_order
  on public.modules(is_visible, skill_id, "order");

create index if not exists idx_lessons_visible_module_order
  on public.lessons(is_visible, module_id, "order");
