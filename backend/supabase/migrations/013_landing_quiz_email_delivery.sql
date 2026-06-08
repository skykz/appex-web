-- Mailgun delivery audit fields for quiz welcome emails.

alter table public.landing_quiz_submissions
  add column if not exists welcome_email_mailgun_id text,
  add column if not exists welcome_email_error text;

create index if not exists idx_landing_quiz_submissions_welcome_mailgun_id
  on public.landing_quiz_submissions(welcome_email_mailgun_id)
  where welcome_email_mailgun_id is not null;
