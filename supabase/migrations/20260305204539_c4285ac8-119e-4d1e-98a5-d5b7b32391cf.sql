CREATE POLICY "Students can view subjects for their registrations"
ON public.subjects
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM class_subject_registrations csr
    JOIN students s ON s.class_id = csr.class_id
    WHERE s.user_id = auth.uid()
      AND csr.subject_id = subjects.id
  )
  OR
  user_has_permission(auth.uid(), 'academics.subjects', 'view')
);