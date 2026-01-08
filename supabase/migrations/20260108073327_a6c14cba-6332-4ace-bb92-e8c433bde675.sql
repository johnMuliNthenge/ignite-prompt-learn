
-- Drop all existing policies on lms_courses to fix infinite recursion
DROP POLICY IF EXISTS "Admins can manage all courses" ON lms_courses;
DROP POLICY IF EXISTS "Anyone can view published public courses" ON lms_courses;
DROP POLICY IF EXISTS "Enrolled users can view their courses" ON lms_courses;
DROP POLICY IF EXISTS "Teachers can manage their own courses" ON lms_courses;

-- Create simple, non-recursive policies for lms_courses
CREATE POLICY "Admins can manage all courses" 
ON lms_courses FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view published public courses" 
ON lms_courses FOR SELECT 
USING (status = 'published' AND is_public = true);

CREATE POLICY "Teachers can manage their own courses" 
ON lms_courses FOR ALL 
USING (created_by = auth.uid() AND has_role(auth.uid(), 'teacher'::app_role));

-- For enrolled users - use a security definer function to avoid recursion
CREATE OR REPLACE FUNCTION public.user_enrolled_course_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT course_id FROM lms_enrollments 
  WHERE user_id = _user_id AND status = 'active'
$$;

CREATE POLICY "Enrolled users can view their courses" 
ON lms_courses FOR SELECT 
USING (id IN (SELECT public.user_enrolled_course_ids(auth.uid())));
