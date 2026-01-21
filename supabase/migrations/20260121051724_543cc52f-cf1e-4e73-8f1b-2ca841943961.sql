-- Allow admins and teachers to enroll students in courses
CREATE POLICY "Admins and teachers can enroll students"
ON public.lms_enrollments
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role)
);

-- Allow admins and teachers to delete enrollments
CREATE POLICY "Admins and teachers can delete enrollments"
ON public.lms_enrollments
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role)
);