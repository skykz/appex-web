-- Per-course certificate content (admin-defined) and snapshots on issued credentials.

alter table public.skills
  add column if not exists cert_title text,
  add column if not exists cert_description text,
  add column if not exists cert_tags jsonb not null default '[]'::jsonb;

alter table public.certificates
  add column if not exists cert_description text not null default '',
  add column if not exists cert_tags jsonb not null default '[]'::jsonb;

comment on column public.skills.cert_title is
  'Display title on the completion certificate. Newline separates lines. Falls back to skills.title when empty.';
comment on column public.skills.cert_description is
  'Description body printed on the certificate. Newline separates lines.';
comment on column public.skills.cert_tags is
  'Skill tags shown as pills on the certificate (JSON string array).';

comment on column public.certificates.cert_description is
  'Description snapshotted at issuance so later admin edits never mutate issued credentials.';
comment on column public.certificates.cert_tags is
  'Skill tags snapshotted at issuance (JSON string array).';

-- Seed sensible defaults for existing Claude-style courses (admin can edit later).
update public.skills
set
  cert_title = 'MASTER THE' || E'\n' || 'CLAUDE',
  cert_description =
    'Awarded for successfully completing the Appex "Claude from Zero to Income" program –' || E'\n' ||
    'validating practical, professional skills in applying Claude to real-world work.',
  cert_tags = '["Prompt Engineering","AI Automation","AI Research","Claude Workflows","AI Productivity"]'::jsonb
where cert_title is null
  and (title ilike '%claude%' or title ilike '%master%');

-- Back-fill snapshots on certificates issued before this migration.
update public.certificates c
set
  cert_description = coalesce(
    nullif(c.cert_description, ''),
    s.cert_description,
    ''
  ),
  cert_tags = case
    when c.cert_tags = '[]'::jsonb and s.cert_tags is not null then s.cert_tags
    else c.cert_tags
  end,
  course_title = coalesce(
    nullif(c.course_title, ''),
    nullif(s.cert_title, ''),
    s.title
  )
from public.skills s
where s.id = c.skill_id;
