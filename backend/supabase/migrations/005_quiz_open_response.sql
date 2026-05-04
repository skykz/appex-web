-- Adds open-ended quiz text when `lesson_quiz_attempts` already exists without this column.
-- Prerequisite: run 004_lesson_engagement.sql first (creates `lesson_quiz_attempts`).
-- If you create the DB from an updated 004 that already includes `open_response`, this is a no-op.

ALTER TABLE public.lesson_quiz_attempts
  ADD COLUMN IF NOT EXISTS open_response text NULL;
