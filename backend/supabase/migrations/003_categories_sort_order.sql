-- 003 — Rename categories."order" to sort_order (PostgREST / reserved-word ergonomics).
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
