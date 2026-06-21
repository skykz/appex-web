-- ============================================
-- One-time landing-checkout account claim
-- ============================================
-- completeLandingCheckoutAccount() previously let anyone holding a Stripe
-- session_id set the account password — repeatedly — which means a leaked
-- session_id (URL history, referrer, shared link) could be used to RESET the
-- password and seize an already-set-up account.
--
-- We record when the account was first claimed (password set) and refuse any
-- further completion against the same session, so the password can be set
-- exactly once through this funnel. Later password changes must go through the
-- normal authenticated change-password / reset-by-email flow.

alter table public.landing_checkout_provisions
  add column if not exists account_completed_at timestamptz;
