-- Lead email confirmation (double opt-in) for funnel leads.
--
-- Until now a quiz lead's address was never verified: anyone could type any email
-- and we would treat it as a real contact. That inflates the lead list with typos
-- and other people's addresses, and it means marketing mail goes to inboxes that
-- never opted in.
--
-- Confirmation lives on landing_quiz_submissions rather than in a new table
-- because the lead IS that row — one row per (email, landing), created at the
-- quiz's email step, and there is no account to hang this off yet.

alter table public.landing_quiz_submissions
  -- Single-use token from the emailed "Confirm Email" link. Cleared on use so a
  -- forwarded or logged link cannot be replayed later.
  add column if not exists confirm_token text,
  add column if not exists confirm_token_expires_at timestamptz,
  -- Set once, on first successful confirmation. This — not user_id — is what
  -- "confirmed" means for a lead; user_id only tells you whether they paid.
  add column if not exists confirmed_at timestamptz,
  -- When the confirmation email was last sent, so a re-send can be rate limited
  -- separately from the guidebook/welcome send tracked by welcome_email_sent_at.
  add column if not exists confirm_email_sent_at timestamptz;

-- Token lookup is the hot path of the public confirm endpoint: it arrives with
-- only a token and must find the row without scanning. Partial, because the
-- column is NULL for every already-confirmed and never-emailed lead.
create unique index if not exists idx_landing_quiz_submissions_confirm_token
  on public.landing_quiz_submissions (confirm_token)
  where confirm_token is not null;

-- Admin list filters on this to split confirmed from unconfirmed.
create index if not exists idx_landing_quiz_submissions_confirmed_at
  on public.landing_quiz_submissions (confirmed_at);

comment on column public.landing_quiz_submissions.confirmed_at is
  'When the lead clicked the emailed confirmation link. NULL = unconfirmed. Distinct from user_id, which indicates a paid account.';
