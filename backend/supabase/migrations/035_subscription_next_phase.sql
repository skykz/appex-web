-- Next-phase pricing for two-phase subscriptions (the "1 Week" plan).
--
-- The 1-week plan is sold as one intro week at the weekly price, then converts to
-- the 4-week price via a Stripe Subscription Schedule. Until now the row only
-- stored the CURRENT phase price ($17.77/week), so Plan management showed that
-- number with no hint that $38.95 is charged at the end of the week. A customer
-- checking their own settings could not see what they'd actually be billed —
-- exactly the surprise the FTC disclosure promises to avoid.
--
-- These columns hold the upcoming phase so the UI can say
-- "$6.93 now, then $38.95 every 4 weeks starting Aug 4".

alter table public.subscriptions
  -- Amount of the next phase, in the subscription's currency (e.g. 38.95).
  add column if not exists next_phase_price numeric(10, 2),
  -- When the next phase starts billing (= end of the current intro phase).
  add column if not exists next_phase_starts_at timestamptz,
  -- Human-readable cadence of the next phase, e.g. "every 4 weeks".
  add column if not exists next_phase_cadence text;

comment on column public.subscriptions.next_phase_price is
  'Price charged once the scheduled phase change happens; null when the subscription has no upcoming phase change.';
