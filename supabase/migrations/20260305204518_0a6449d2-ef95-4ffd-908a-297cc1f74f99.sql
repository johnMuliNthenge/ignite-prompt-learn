CREATE POLICY "Students can view their class subject registrations"
ON public.class_subject_registrations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM students s
    WHERE s.user_id = auth.uid()
      AND s.class_id = class_subject_registrations.class_id
  )
);