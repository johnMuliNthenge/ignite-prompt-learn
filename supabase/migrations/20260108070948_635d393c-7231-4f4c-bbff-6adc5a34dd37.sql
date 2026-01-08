-- Fix infinite recursion in RLS policies

-- Drop problematic policies
DROP POLICY IF EXISTS "Enrolled users can view their courses" ON public.lms_courses;
DROP POLICY IF EXISTS "Teachers can view enrollments in their courses" ON public.lms_enrollments;
DROP POLICY IF EXISTS "Teachers can manage enrollments in their courses" ON public.lms_enrollments;

-- Recreate policies without circular references

-- Users can view courses they're enrolled in (simplified - no nested query to lms_courses)
CREATE POLICY "Enrolled users can view their courses"
ON public.lms_courses FOR SELECT
USING (
  id IN (
    SELECT course_id FROM public.lms_enrollments
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Teachers can view enrollments (use created_by directly, not via join)
CREATE POLICY "Teachers can view enrollments in their courses"
ON public.lms_enrollments FOR SELECT
USING (
  course_id IN (
    SELECT id FROM public.lms_courses WHERE created_by = auth.uid()
  )
);

-- Teachers can manage enrollments in their courses
CREATE POLICY "Teachers can manage enrollments in their courses"
ON public.lms_enrollments FOR ALL
USING (
  course_id IN (
    SELECT id FROM public.lms_courses WHERE created_by = auth.uid()
  )
);