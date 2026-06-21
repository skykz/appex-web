-- ============================================
-- Idempotent lifecycle email sends
-- ============================================
-- Renewal-reminder / lifecycle emails dedup with a non-atomic check-then-insert
-- (hasSentEmail then logEmailSent). Two concurrent cron runs can both pass the
-- check and double-send. A unique index lets the INSERT itself be the claim:
-- the second concurrent insert fails, so only one cron sends.
--
-- The dedup identity is (user_id, email_type, period_end, reference_id). Some
-- emails key on period_end (renewal/access_locked), some on reference_id
-- (payment_confirmed → invoice id), some on neither (welcome — once per user).
-- COALESCE the nullable parts to a sentinel so NULLs collapse to one row
-- (Postgres treats NULLs as distinct in unique indexes otherwise).

create unique index if not exists uq_user_email_log_idem
  on public.user_email_log (
    user_id,
    email_type,
    coalesce(period_end, ''),
    coalesce(reference_id, '')
  );
