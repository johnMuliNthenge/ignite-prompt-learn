-- Drop existing policies on exam_attempts if they exist
DROP POLICY IF EXISTS "Users can view their own attempts" ON exam_attempts;
DROP POLICY IF EXISTS "Users can create their own attempts" ON exam_attempts;
DROP POLICY IF EXISTS "Users can update their own attempts" ON exam_attempts;

-- Create proper RLS policies for exam_attempts
CREATE POLICY "Users can view their own attempts" 
ON exam_attempts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own attempts" 
ON exam_attempts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attempts" 
ON exam_attempts 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow teachers/admins to view all attempts for their courses
CREATE POLICY "Teachers can view attempts for their courses" 
ON exam_attempts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM course_exams ce
    JOIN lms_courses c ON ce.course_id = c.id
    WHERE ce.id = exam_attempts.exam_id
    AND (c.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
  )
);