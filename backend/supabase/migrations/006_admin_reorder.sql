-- Atomic reorder RPCs for admin (dense 0..n-1 `order` columns).

CREATE OR REPLACE FUNCTION public.admin_reorder_courses(p_course_ids int[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expected int;
BEGIN
  SELECT count(*)::int INTO expected FROM public.skills;
  IF expected = 0 THEN
    RETURN;
  END IF;
  IF expected != coalesce(cardinality(p_course_ids), 0) THEN
    RAISE EXCEPTION 'course id list must list every course exactly once';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(p_course_ids) AS u(x)
    WHERE NOT EXISTS (SELECT 1 FROM public.skills s WHERE s.id = u.x)
  ) THEN
    RAISE EXCEPTION 'unknown course id in list';
  END IF;
  IF (SELECT count(DISTINCT x) FROM unnest(p_course_ids) AS t(x)) != cardinality(p_course_ids) THEN
    RAISE EXCEPTION 'duplicate course id';
  END IF;

  UPDATE public.skills s
  SET "order" = v.ord - 1
  FROM (
    SELECT id, ord::int
    FROM unnest(p_course_ids) WITH ORDINALITY AS t(id, ord)
  ) AS v
  WHERE s.id = v.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reorder_modules(p_skill_id int, p_module_ids int[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expected int;
BEGIN
  SELECT count(*)::int INTO expected FROM public.modules WHERE skill_id = p_skill_id;
  IF expected = 0 THEN
    RETURN;
  END IF;
  IF expected != coalesce(cardinality(p_module_ids), 0) THEN
    RAISE EXCEPTION 'module id list must list every module in this course exactly once';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(p_module_ids) AS u(x)
    WHERE NOT EXISTS (SELECT 1 FROM public.modules m WHERE m.id = u.x AND m.skill_id = p_skill_id)
  ) THEN
    RAISE EXCEPTION 'unknown or wrong-course module id';
  END IF;
  IF (SELECT count(DISTINCT x) FROM unnest(p_module_ids) AS t(x)) != cardinality(p_module_ids) THEN
    RAISE EXCEPTION 'duplicate module id';
  END IF;

  UPDATE public.modules m
  SET "order" = v.ord - 1
  FROM (
    SELECT id, ord::int
    FROM unnest(p_module_ids) WITH ORDINALITY AS t(id, ord)
  ) AS v
  WHERE m.id = v.id AND m.skill_id = p_skill_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reorder_lessons(p_module_id int, p_lesson_ids int[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expected int;
BEGIN
  SELECT count(*)::int INTO expected FROM public.lessons WHERE module_id = p_module_id;
  IF expected = 0 THEN
    RETURN;
  END IF;
  IF expected != coalesce(cardinality(p_lesson_ids), 0) THEN
    RAISE EXCEPTION 'lesson id list must list every lesson in this module exactly once';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(p_lesson_ids) AS u(x)
    WHERE NOT EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = u.x AND l.module_id = p_module_id)
  ) THEN
    RAISE EXCEPTION 'unknown or wrong-module lesson id';
  END IF;
  IF (SELECT count(DISTINCT x) FROM unnest(p_lesson_ids) AS t(x)) != cardinality(p_lesson_ids) THEN
    RAISE EXCEPTION 'duplicate lesson id';
  END IF;

  UPDATE public.lessons l
  SET "order" = v.ord - 1
  FROM (
    SELECT id, ord::int
    FROM unnest(p_lesson_ids) WITH ORDINALITY AS t(id, ord)
  ) AS v
  WHERE l.id = v.id AND l.module_id = p_module_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reorder_courses(int[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_reorder_modules(int, int[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_reorder_lessons(int, int[]) TO service_role;
