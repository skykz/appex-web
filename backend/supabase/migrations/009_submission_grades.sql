-- Optional staff grade shown to learners together with reviewed submission feedback.
ALTER TABLE public.lesson_submissions
  ADD COLUMN IF NOT EXISTS grade text;
