-- Course completion certificates.
--
-- A certificate is "minted" once, on the backend, the moment a learner completes
-- every lesson of a course (skill_progress.status -> 'completed'). The row is the
-- single source of truth: it carries a unique, human-readable credential code
-- (e.g. APX-2026-000142) that is printed on the downloadable certificate and is
-- resolvable on a public verify page (/verify/:code).
--
-- The code is branded + sequential: APX-<issue-year>-<zero-padded sequence>.
-- The sequence guarantees uniqueness without races; the row's UNIQUE(user_id,
-- skill_id) makes minting idempotent (re-completing never issues a second cert).

create sequence if not exists public.certificate_seq start with 1;

create table if not exists public.certificates (
  id           uuid primary key default gen_random_uuid(),
  -- Public credential code, printed on the cert and used by the verify page.
  cert_code    text unique not null,
  user_id      uuid not null references public.users(id) on delete cascade,
  -- Name is snapshotted at issuance so a later profile rename never alters an
  -- already-issued certificate.
  user_name    text not null,
  skill_id     int not null references public.skills(id) on delete cascade,
  -- Course title snapshotted at issuance for the same reason.
  course_title text not null,
  issued_at    timestamptz not null default now(),
  -- One certificate per learner per course.
  unique (user_id, skill_id)
);

create index if not exists idx_certificates_user
  on public.certificates (user_id, issued_at desc);

-- Atomically reserves the next sequential certificate number. Exposed as an RPC
-- so the application (supabase-js) can pull a value without raw SQL access.
-- Returns `int` (not bigint) so PostgREST serializes it as a JSON number rather
-- than a string. The sequence will never realistically exceed int range.
create or replace function public.next_certificate_seq()
returns int
language sql
volatile
as $$
  select nextval('public.certificate_seq')::int;
$$;
