-- Contact messages: category + read tracking for admin inbox
ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general';

ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS read_at timestamptz NULL;

-- Student work tied to lessons
CREATE TABLE IF NOT EXISTS public.lesson_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lesson_id int NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  message text,
  attachment_url text,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed')),
  admin_feedback text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lesson_submissions_lesson_id ON public.lesson_submissions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_submissions_user_id ON public.lesson_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_submissions_created ON public.lesson_submissions(created_at DESC);

-- Quiz attempts (analytics / audit)
CREATE TABLE IF NOT EXISTS public.lesson_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lesson_id int NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  step_index int NOT NULL,
  block_index int NOT NULL,
  selected_indices int[] NOT NULL,
  is_correct boolean NOT NULL,
  open_response text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lesson_quiz_attempts_lesson ON public.lesson_quiz_attempts(lesson_id);
