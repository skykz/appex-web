-- Admin read tracking for the submissions queue (same pattern as contact_messages.read_at).
ALTER TABLE public.lesson_submissions
  ADD COLUMN IF NOT EXISTS read_at timestamptz NULL;
