-- Allow students to read their own student record
CREATE POLICY "Students can view their own record"
ON public.students
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow students to view their own fee payments
CREATE POLICY "Students can view their own payments"
ON public.fee_payments
FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT id FROM public.students WHERE user_id = auth.uid()
  )
);