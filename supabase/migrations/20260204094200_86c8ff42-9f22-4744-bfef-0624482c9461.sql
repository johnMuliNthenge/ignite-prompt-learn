-- Create student POE submissions table
CREATE TABLE public.student_poe_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_name TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  feedback TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_poe_submissions ENABLE ROW LEVEL SECURITY;

-- Students can view their own submissions
CREATE POLICY "Students can view own submissions"
ON public.student_poe_submissions FOR SELECT
USING (
  student_id IN (
    SELECT id FROM public.students WHERE email = auth.jwt() ->> 'email'
  )
);

-- Students can insert their own submissions
CREATE POLICY "Students can insert own submissions"
ON public.student_poe_submissions FOR INSERT
WITH CHECK (
  student_id IN (
    SELECT id FROM public.students WHERE email = auth.jwt() ->> 'email'
  )
);

-- Admin and teachers can view all submissions
CREATE POLICY "Admin can view all submissions"
ON public.student_poe_submissions FOR SELECT
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

-- Admin and teachers can update submissions (for feedback)
CREATE POLICY "Admin can update submissions"
ON public.student_poe_submissions FOR UPDATE
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

-- Create trigger for updated_at
CREATE TRIGGER update_student_poe_submissions_updated_at
  BEFORE UPDATE ON public.student_poe_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();