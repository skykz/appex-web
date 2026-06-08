-- Tracks when the quiz welcome email was sent so we do not duplicate on re-submits.

alter table public.landing_quiz_submissions
  add column if not exists welcome_email_sent_at timestamptz;
