-- Allow students to view exams for their class
CREATE POLICY "Students can view exams for their class"
ON public.academic_exams
FOR SELECT
TO authenticated
USING (
  class_id IN (
    SELECT class_id FROM students WHERE user_id = auth.uid()
  )
);

-- Also allow students to view sessions (needed for the result slip session dropdown)
-- Check if sessions has RLS
