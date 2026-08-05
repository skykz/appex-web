-- Seeds the three products and their launch creatives, and attaches the existing
-- v1.0.0 flow to the Claude-automation product.
--
-- Idempotent throughout (on conflict do nothing / guarded updates), so it is safe
-- to re-run against a database where some of this already exists.

-- ── Products ────────────────────────────────────────────────────────────────
insert into public.quiz_products (slug, name, post_purchase_path, is_active) values
  ('claude_automation', 'Claude Learning & Automation', '/home', true),
  ('claude_office',     'Claude for Excel & Word',      '/home', true),
  -- The video studio is a different app surface, not another course inside the
  -- learner app, so its post-purchase path is expected to change once that
  -- surface exists. Left at /home rather than a guessed route: a wrong redirect
  -- here strands a paying customer.
  ('ai_video_studio',   'AI Video & Avatar Studio',     '/home', true)
on conflict (slug) do nothing;

-- ── Attach the existing flow to the automation product ──────────────────────
-- v1.0.0 (migration 039) is the flow currently in QuizOverlay.tsx. Claiming it
-- for claude_automation is what makes the legacy flow addressable as that
-- product's default instead of an unowned row.
update public.quiz_versions v
set product_id = p.id
from public.quiz_products p
where p.slug = 'claude_automation'
  and v.version = 'v1.0.0'
  and v.landing = 'usa'
  and v.product_id is null;

-- ── Launch creatives ────────────────────────────────────────────────────────
-- One per product to start. `slug` is what goes in the ad URL as `?c=`.
insert into public.quiz_funnels (slug, product_id, name, is_active, notes)
select c.slug, p.id, c.name, true, c.notes
from public.quiz_products p
join (values
  ('claude_main',  'claude_automation', 'Claude automation — main',
   'Current live flow: the quiz as it exists in QuizOverlay.tsx.'),
  ('excel_hook',   'claude_office',     'Claude for Excel/Word — spreadsheet hook',
   'Opens on an Excel/Word-specific first screen, then largely rejoins the shared questions.'),
  ('studio_hook',  'ai_video_studio',   'AI video studio — creator hook',
   'Fully separate flow: different questions and a different product after payment.')
) as c(slug, product_slug, name, notes)
  on c.product_slug = p.slug
on conflict (slug) do nothing;

-- ── Route claude_main at the existing flow ──────────────────────────────────
-- Single row, so all of this creative's traffic gets v1.0.0. A second row with a
-- different version and weight is what turns this into an A/B test later.
insert into public.quiz_funnel_flows (funnel_id, version_id, weight, bucket, is_active)
select f.id, v.id, 1, 'control', true
from public.quiz_funnels f
join public.quiz_products p on p.id = f.product_id and p.slug = 'claude_automation'
join public.quiz_versions v on v.product_id = p.id and v.version = 'v1.0.0'
where f.slug = 'claude_main'
on conflict (funnel_id, version_id) do nothing;

-- Make v1.0.0 the product default too, so traffic with no `?c=` still resolves.
-- The partial unique index from 042 permits exactly one per (landing, product).
update public.quiz_versions v
set is_active = true
from public.quiz_products p
where p.slug = 'claude_automation'
  and v.product_id = p.id
  and v.version = 'v1.0.0'
  and not exists (
    select 1 from public.quiz_versions other
    where other.landing = v.landing
      and other.product_id = v.product_id
      and other.is_active
      and other.id <> v.id
  );

-- excel_hook and studio_hook intentionally have NO quiz_funnel_flows rows yet:
-- their flows don't exist. Until one is added they fall back to their product's
-- default flow, and since those products have no active version either, the
-- client falls back to its bundled flow. A creative pointed at nothing must
-- degrade to a working quiz, never to a blank screen.
