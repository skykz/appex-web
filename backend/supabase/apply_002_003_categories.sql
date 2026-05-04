-- =============================================================================
-- Run once in Supabase → Dashboard → SQL Editor → New query → Run
-- Fixes: PGRST205 "Could not find the table public.categories"
--
-- Prerequisites: public.users and public.skills already exist (see migrations/001).
-- After Run: wait ~30s or refresh; PostgREST picks up new tables automatically.
--
-- Keep in sync with: migrations/002_admin_and_categories.sql + 003_categories_sort_order.sql
-- =============================================================================

-- 002 — Admin role + categories table
-- 1. Role column on users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));

CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);

-- 2. Categories table
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  "order" INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO categories (slug, label, "order") VALUES
  ('ai_automations', 'AI Automations', 0),
  ('freelancing',   'Freelancing',    1),
  ('marketing',     'Marketing',      2),
  ('ai_content',    'AI Content',     3)
ON CONFLICT (slug) DO NOTHING;

-- 3. Relax CHECK on skills.category (admins can add new category slugs)
DO $$
DECLARE con RECORD;
BEGIN
  FOR con IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.skills'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%category%'
  LOOP
    EXECUTE format('ALTER TABLE skills DROP CONSTRAINT %I', con.conname);
  END LOOP;
END $$;

-- 4. RLS on categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories are viewable by everyone" ON categories;
CREATE POLICY "categories are viewable by everyone"
  ON categories FOR SELECT
  USING (true);

-- 003 — rename order → sort_order (matches backend categories.controller.ts)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'categories'
      AND column_name = 'order'
  ) THEN
    ALTER TABLE public.categories RENAME COLUMN "order" TO sort_order;
  END IF;
END $$;
