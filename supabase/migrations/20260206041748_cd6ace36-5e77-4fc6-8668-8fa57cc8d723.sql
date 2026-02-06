-- Add score column to student_poe_submissions for admin to award marks
ALTER TABLE public.student_poe_submissions 
ADD COLUMN IF NOT EXISTS score numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS max_score numeric DEFAULT 100;

-- Add RLS policy for students to view their own submissions
DROP POLICY IF EXISTS "Students can view own POE submissions" ON public.student_poe_submissions;
CREATE POLICY "Students can view own POE submissions"
ON public.student_poe_submissions
FOR SELECT
TO authenticated
USING (
  student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
);

-- Add RLS policy for students to create their own submissions
DROP POLICY IF EXISTS "Students can create own POE submissions" ON public.student_poe_submissions;
CREATE POLICY "Students can create own POE submissions"
ON public.student_poe_submissions
FOR INSERT
TO authenticated
WITH CHECK (
  student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
);

-- Add RLS policy for students to update their own pending submissions
DROP POLICY IF EXISTS "Students can update own pending POE submissions" ON public.student_poe_submissions;
CREATE POLICY "Students can update own pending POE submissions"
ON public.student_poe_submissions
FOR UPDATE
TO authenticated
USING (
  student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  AND status IN ('draft', 'submitted')
);

-- Add RLS policy for admins/teachers to view all submissions
DROP POLICY IF EXISTS "Admins can view all POE submissions" ON public.student_poe_submissions;
CREATE POLICY "Admins can view all POE submissions"
ON public.student_poe_submissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'teacher')
  )
);

-- Add RLS policy for admins/teachers to update all submissions (for review)
DROP POLICY IF EXISTS "Admins can update all POE submissions" ON public.student_poe_submissions;
CREATE POLICY "Admins can update all POE submissions"
ON public.student_poe_submissions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'teacher')
  )
);

-- Create finance_settings table for storing prepayment account mappings
CREATE TABLE IF NOT EXISTS public.finance_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on finance_settings
ALTER TABLE public.finance_settings ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage finance settings
DROP POLICY IF EXISTS "Admins can manage finance settings" ON public.finance_settings;
CREATE POLICY "Admins can manage finance settings"
ON public.finance_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Add RLS policy for academic_marks so students can view their own marks
DROP POLICY IF EXISTS "Students can view own marks" ON public.academic_marks;
CREATE POLICY "Students can view own marks"
ON public.academic_marks
FOR SELECT
TO authenticated
USING (
  student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
);