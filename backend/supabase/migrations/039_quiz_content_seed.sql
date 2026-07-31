-- Seeds quiz version v1.0.0 from the hardcoded flow in QuizOverlay.tsx.
--
-- Content only: the app keeps rendering from code until it is switched over to
-- the API. Seeding first means the DB and the live quiz can be compared
-- side-by-side before anything user-facing changes.
--
-- Question text is copied verbatim from the components, so answers recorded
-- against these steps carry the wording visitors actually saw. Two screens use a
-- dynamic heading (it depends on a previous answer); their text is left null
-- rather than guessed at.

insert into public.quiz_versions (version, landing, is_active, notes)
values ('v1.0.0', 'usa', false, 'Imported from QuizOverlay.tsx')
on conflict (version) do nothing;

insert into public.quiz_steps
  (version_id, step_id, step_order, step_type, section, question_text, answer_key, options, input_type)
select v.id, s.step_id, s.step_order, s.step_type, s.section, s.question_text, s.answer_key, s.options, s.input_type
from public.quiz_versions v
cross join (values
  ('experience_with_claude', 1, 'question', 'intro', null, null, '[]'::jsonb, 'none'),
  ('info_2', 2, 'info', 'value', null, null, '[]'::jsonb, 'none'),
  ('learning_intent', 3, 'question', 'goals', 'I want to learn Claude for…', 'learning_intent', '[{"value": "work", "label": "Work tasks"}, {"value": "personal", "label": "Personal use"}, {"value": "growth", "label": "Growth — I love learning in-demand skills"}]'::jsonb, 'single'),
  ('work_status', 4, 'question', 'profile', 'What''s your current work status?', 'work_status', '[{"value": "employee", "label": "Full-time employee"}, {"value": "freelancer", "label": "Freelancer / Self-employed"}, {"value": "owner", "label": "Business owner"}, {"value": "switcher", "label": "Between jobs / Career switcher"}, {"value": "exploring", "label": "Exploring options"}]'::jsonb, 'single'),
  ('age_band', 5, 'question', 'profile', 'How old are you?', 'age_band', '[{"value": "18-24", "label": "18-24"}, {"value": "25-34", "label": "25-34"}, {"value": "35-44", "label": "35-44"}, {"value": "45-54", "label": "45-54"}, {"value": "55+", "label": "55+"}]'::jsonb, 'single'),
  ('gender', 6, 'question', 'profile', 'What is your gender identity?', 'gender', '[{"value": "female", "label": "Female"}, {"value": "male", "label": "Male"}, {"value": "skip", "label": "I''d rather skip this one"}]'::jsonb, 'single'),
  ('main_goal', 7, 'question', 'goals', 'How would learning Claude benefit you?', 'main_goal', '[{"value": "promotion", "label": "Get a promotion or a better job"}, {"value": "faster", "label": "Work faster"}, {"value": "confidence", "label": "Feel more confident with AI"}, {"value": "business", "label": "Start my own business"}, {"value": "earn_more", "label": "Earn more"}]'::jsonb, 'single'),
  ('recap_profile', 8, 'info', 'plan', 'Did we get everything right?', null, '[]'::jsonb, 'none'),
  ('ai_experience_rating', 9, 'question', 'pain', 'How would you rate your experience with AI so far?', 'ai_experience_rating', '[{"value": "great", "label": "Great - AI already helps me a lot"}, {"value": "good", "label": "Good - but I still have a lot to learn"}, {"value": "frustrating", "label": "Frustrating - I can''t get it to do what I want"}, {"value": "untried", "label": "I haven''t really tried yet"}]'::jsonb, 'single'),
  ('primary_fear', 10, 'question', 'pain', 'What scares you most about AI and your career?', 'primary_fear', '[{"value": "replaced", "label": "Being replaced by someone who uses AI better"}, {"value": "behind", "label": "Falling behind as others move faster"}, {"value": "opportunities", "label": "Losing opportunities without AI on my resume"}, {"value": "none", "label": "Nothing — I see AI as an opportunity, not a threat"}]'::jsonb, 'single'),
  ('info_11', 11, 'info', 'value', 'There is nothing to worry about', null, '[]'::jsonb, 'none'),
  ('time_lost_files', 12, 'question', 'pain', 'How much time do you lose on repetitive file & document tasks?', 'time_lost_files', '[{"value": "30m-1h", "label": "30 minutes - 1 hour/day"}, {"value": "1-3h", "label": "1-3 hours/day"}, {"value": "3h+", "label": "More than 3 hours/day"}]'::jsonb, 'single'),
  ('ai_rework_experience', 13, 'question', 'pain', 'Have you ever used AI to write something and then spent just as long fixing it?', 'ai_rework_experience', '[{"value": "every_time", "label": "Yes, every time - it''s barely faster"}, {"value": "sometimes", "label": "Sometimes - it needs a lot of editing"}, {"value": "works_well", "label": "No - AI works well for me"}, {"value": "untried", "label": "I haven''t tried using AI for writing"}]'::jsonb, 'single'),
  ('info_14', 14, 'info', 'value', 'Create polished content 4x faster', null, '[]'::jsonb, 'none'),
  ('had_unbuilt_idea', 15, 'question', 'pain', 'Have you ever had an idea for an app, website, or tool — but couldn''t build it?', 'had_unbuilt_idea', '[{"value": "yes", "label": "Yes"}, {"value": "no", "label": "No"}]'::jsonb, 'single'),
  ('belief_no_code', 16, 'question', 'pain', 'Do you believe you could build a real working app with no coding experience?', 'belief_no_code', '[{"value": "unlikely", "label": "No, that seems unlikely"}, {"value": "skeptical", "label": "Maybe with AI, but I''m skeptical"}, {"value": "seen_it", "label": "Yes — I''ve seen people do it"}]'::jsonb, 'single'),
  ('info_17', 17, 'info', 'value', 'Building an app has never been this easy.', null, '[]'::jsonb, 'none'),
  ('learning_pace', 18, 'question', 'goals', 'How do you prefer to learn?', 'learning_pace', '[{"value": "own_pace", "label": "At my own pace"}, {"value": "deadlines", "label": "With set deadlines"}]'::jsonb, 'single'),
  ('daily_time_commitment', 19, 'question', 'goals', 'How much time you want to dedicate to achieve your goal?', 'daily_time_commitment', '[{"value": "10min", "label": "10 min/day"}, {"value": "20min", "label": "20 min/day"}, {"value": "30min", "label": "30 min/day"}, {"value": "1hour", "label": "1 hour/day"}]'::jsonb, 'single'),
  ('learning_approach', 20, 'question', 'goals', 'What approach works best for you?', 'learning_approach', '[{"value": "theory_practice", "label": "80% theory + 20% practice"}, {"value": "practice_theory", "label": "80% practice + 20% theory"}]'::jsonb, 'single'),
  ('include_portfolio', 21, 'question', 'goals', 'Would you like to include your projects to a portfolio site we built for you?', 'include_portfolio', '[{"value": "yes", "label": "Yes"}, {"value": "no", "label": "No"}]'::jsonb, 'single'),
  ('wants_mentor', 22, 'question', 'goals', 'Would you like an AI mentor to guide you as you learn?', 'wants_mentor', '[{"value": "yes", "label": "Yes"}, {"value": "no", "label": "No"}]'::jsonb, 'single'),
  ('info_23', 23, 'info', 'value', 'Your guided step-by-step plan is almost ready!', null, '[]'::jsonb, 'none'),
  ('certification_value', 24, 'question', 'goals', 'Would an official AI certification give you an advantage in your career?', 'certification_value', '[{"value": "definitely", "label": "Definitely - it would set me apart"}, {"value": "probably", "label": "Probably - it''s a growing field"}, {"value": "no", "label": "I don''t think certifications matter for me"}]'::jsonb, 'single'),
  ('info_25', 25, 'info', 'value', 'Become a certified Claude master with Appex', null, '[]'::jsonb, 'none'),
  ('career_goal', 26, 'question', 'goals', 'What do you want Claude to help you achieve?', 'career_goal', '[{"value": "In the next 30 days", "label": "In the next 30 days"}, {"value": "1–3 months", "label": "1–3 months"}, {"value": "3–6 months", "label": "3–6 months"}, {"value": "I''m just exploring", "label": "I''m just exploring"}]'::jsonb, 'single'),
  ('time_horizon', 27, 'question', 'goals', 'How soon do you want to see results?', 'time_horizon', '[]'::jsonb, 'none'),
  ('goal_card', 28, 'info', 'plan', 'Your Personal AI Skill Growth Plan', null, '[]'::jsonb, 'none'),
  ('loading_roadmap', 29, 'loader', 'plan', null, null, '[{"value": "Land a new job", "label": "Land a new job"}, {"value": "Get promoted in my current role", "label": "Get promoted in my current role"}, {"value": "Start freelancing", "label": "Start freelancing"}, {"value": "Work from home / remote", "label": "Work from home / remote"}, {"value": "Future-proof my skills before AI changes my job", "label": "Future-proof my skills before AI changes my job"}, {"value": "Build my own business", "label": "Build my own business"}]'::jsonb, 'single'),
  ('commit_gate', 30, 'question', 'signup', 'Here''s your AI profile', null, '[]'::jsonb, 'none'),
  ('email_capture', 31, 'milestone', 'signup', 'Enter your email to get your personal Claude Mastery Plan', null, '[]'::jsonb, 'email'),
  ('name_capture', 32, 'milestone', 'signup', 'What is your name?', null, '[]'::jsonb, 'text'),
  ('plan_reveal', 33, 'milestone', 'plan', null, null, '[]'::jsonb, 'none')
) as s(step_id, step_order, step_type, section, question_text, answer_key, options, input_type)
where v.version = 'v1.0.0'
on conflict (version_id, step_id) do nothing;
