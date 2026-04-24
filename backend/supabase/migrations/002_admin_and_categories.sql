-- 002 — Admin role + categories table
-- Adds admin role support and moves category enum to a proper table.

-- 1. Role column on users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));

CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);

-- 2. Categories table (replaces the old hardcoded enum on skills.category)
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  "order" INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default categories (idempotent)
INSERT INTO categories (slug, label, "order") VALUES
  ('ai_automations', 'AI Automations', 0),
  ('freelancing',   'Freelancing',    1),
  ('marketing',     'Marketing',      2),
  ('ai_content',    'AI Content',     3)
ON CONFLICT (slug) DO NOTHING;

-- 3. Relax the CHECK on skills.category so admins can add new categories.
-- Drop the old CHECK constraint if it exists (name may vary across Supabase projects).
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

-- 4. RLS: categories are public-read, admin-only writes.
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories are viewable by everyone" ON categories;
CREATE POLICY "categories are viewable by everyone"
  ON categories FOR SELECT
  USING (true);

-- Writes go through service role (backend), which bypasses RLS.
