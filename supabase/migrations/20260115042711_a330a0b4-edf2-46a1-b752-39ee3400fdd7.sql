-- Create grading scales table for flexible curriculum support
CREATE TABLE public.grading_scales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  scale_type TEXT NOT NULL DEFAULT 'percentage', -- percentage, letter, points, competency
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Grading scale levels (e.g., A=90-100, B=80-89, etc.)
CREATE TABLE public.grading_scale_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scale_id UUID NOT NULL REFERENCES public.grading_scales(id) ON DELETE CASCADE,
  label TEXT NOT NULL, -- A, B, C or Excellent, Good, etc.
  min_value NUMERIC NOT NULL,
  max_value NUMERIC NOT NULL,
  points NUMERIC, -- optional point value
  description TEXT,
  color TEXT, -- for UI display
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- POE assignments created by teachers
CREATE TABLE public.poe_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  max_score NUMERIC DEFAULT 100,
  grading_scale_id UUID REFERENCES public.grading_scales(id),
  allowed_file_types TEXT[] DEFAULT ARRAY['image/*', 'video/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  max_file_size_mb INTEGER DEFAULT 50,
  max_files INTEGER DEFAULT 5,
  is_published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- POE submissions from students
CREATE TABLE public.poe_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.poe_assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'draft', -- draft, submitted, under_review, approved, rejected, needs_revision
  submission_text TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  score NUMERIC,
  grade_label TEXT, -- The grade from scale (A, B, Excellent, etc.)
  feedback TEXT,
  revision_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(assignment_id, user_id)
);

-- POE submission files
CREATE TABLE public.poe_submission_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES public.poe_submissions(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.grading_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_scale_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poe_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poe_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poe_submission_files ENABLE ROW LEVEL SECURITY;

-- Grading scales policies
CREATE POLICY "Anyone can view grading scales" ON public.grading_scales FOR SELECT USING (true);
CREATE POLICY "Admins can manage grading scales" ON public.grading_scales FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can create grading scales" ON public.grading_scales FOR INSERT WITH CHECK (has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can update their grading scales" ON public.grading_scales FOR UPDATE USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'));

-- Grading scale levels policies
CREATE POLICY "Anyone can view scale levels" ON public.grading_scale_levels FOR SELECT USING (true);
CREATE POLICY "Scale creators can manage levels" ON public.grading_scale_levels FOR ALL 
  USING (EXISTS (SELECT 1 FROM grading_scales gs WHERE gs.id = grading_scale_levels.scale_id AND (gs.created_by = auth.uid() OR has_role(auth.uid(), 'admin'))));

-- POE assignments policies
CREATE POLICY "Students can view published assignments in enrolled courses" ON public.poe_assignments FOR SELECT
  USING (is_published = true AND EXISTS (
    SELECT 1 FROM lms_enrollments e WHERE e.course_id = poe_assignments.course_id AND e.user_id = auth.uid() AND e.status = 'active'
  ));
CREATE POLICY "Teachers can manage assignments in their courses" ON public.poe_assignments FOR ALL
  USING (EXISTS (SELECT 1 FROM lms_courses c WHERE c.id = poe_assignments.course_id AND c.created_by = auth.uid()));
CREATE POLICY "Admins can manage all assignments" ON public.poe_assignments FOR ALL USING (has_role(auth.uid(), 'admin'));

-- POE submissions policies
CREATE POLICY "Students can manage their own submissions" ON public.poe_submissions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Teachers can view and grade submissions in their courses" ON public.poe_submissions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM poe_assignments pa JOIN lms_courses c ON c.id = pa.course_id 
    WHERE pa.id = poe_submissions.assignment_id AND c.created_by = auth.uid()
  ));
CREATE POLICY "Admins can manage all submissions" ON public.poe_submissions FOR ALL USING (has_role(auth.uid(), 'admin'));

-- POE submission files policies
CREATE POLICY "Users can manage their own submission files" ON public.poe_submission_files FOR ALL
  USING (EXISTS (SELECT 1 FROM poe_submissions ps WHERE ps.id = poe_submission_files.submission_id AND ps.user_id = auth.uid()));
CREATE POLICY "Teachers can view files in their courses" ON public.poe_submission_files FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM poe_submissions ps 
    JOIN poe_assignments pa ON pa.id = ps.assignment_id 
    JOIN lms_courses c ON c.id = pa.course_id 
    WHERE ps.id = poe_submission_files.submission_id AND c.created_by = auth.uid()
  ));
CREATE POLICY "Admins can view all files" ON public.poe_submission_files FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Create storage bucket for POE files
INSERT INTO storage.buckets (id, name, public, file_size_limit) VALUES ('poe-files', 'poe-files', false, 52428800);

-- Storage policies
CREATE POLICY "Users can upload their own POE files" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'poe-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own POE files" ON storage.objects FOR SELECT
  USING (bucket_id = 'poe-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Teachers can view POE files in their courses" ON storage.objects FOR SELECT
  USING (bucket_id = 'poe-files' AND (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher')
  ));

CREATE POLICY "Users can delete their own POE files" ON storage.objects FOR DELETE
  USING (bucket_id = 'poe-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Insert default grading scales
INSERT INTO public.grading_scales (name, description, scale_type, is_default) VALUES
  ('Percentage (0-100)', 'Standard percentage grading', 'percentage', true),
  ('Letter Grade (A-F)', 'Traditional letter grading system', 'letter', false),
  ('Competency Based', 'Competency-based assessment', 'competency', false);

-- Insert default percentage scale levels
INSERT INTO public.grading_scale_levels (scale_id, label, min_value, max_value, description, color, sort_order)
SELECT id, 'A+', 90, 100, 'Exceptional', '#22c55e', 1 FROM grading_scales WHERE name = 'Percentage (0-100)'
UNION ALL
SELECT id, 'A', 80, 89, 'Excellent', '#84cc16', 2 FROM grading_scales WHERE name = 'Percentage (0-100)'
UNION ALL
SELECT id, 'B', 70, 79, 'Good', '#eab308', 3 FROM grading_scales WHERE name = 'Percentage (0-100)'
UNION ALL
SELECT id, 'C', 60, 69, 'Satisfactory', '#f97316', 4 FROM grading_scales WHERE name = 'Percentage (0-100)'
UNION ALL
SELECT id, 'D', 50, 59, 'Pass', '#ef4444', 5 FROM grading_scales WHERE name = 'Percentage (0-100)'
UNION ALL
SELECT id, 'F', 0, 49, 'Fail', '#dc2626', 6 FROM grading_scales WHERE name = 'Percentage (0-100)';

-- Insert letter grade scale levels
INSERT INTO public.grading_scale_levels (scale_id, label, min_value, max_value, points, description, color, sort_order)
SELECT id, 'A', 90, 100, 4.0, 'Excellent', '#22c55e', 1 FROM grading_scales WHERE name = 'Letter Grade (A-F)'
UNION ALL
SELECT id, 'B', 80, 89, 3.0, 'Good', '#84cc16', 2 FROM grading_scales WHERE name = 'Letter Grade (A-F)'
UNION ALL
SELECT id, 'C', 70, 79, 2.0, 'Satisfactory', '#eab308', 3 FROM grading_scales WHERE name = 'Letter Grade (A-F)'
UNION ALL
SELECT id, 'D', 60, 69, 1.0, 'Passing', '#f97316', 4 FROM grading_scales WHERE name = 'Letter Grade (A-F)'
UNION ALL
SELECT id, 'F', 0, 59, 0.0, 'Failing', '#dc2626', 5 FROM grading_scales WHERE name = 'Letter Grade (A-F)';

-- Insert competency scale levels
INSERT INTO public.grading_scale_levels (scale_id, label, min_value, max_value, description, color, sort_order)
SELECT id, 'Competent', 70, 100, 'Meets all requirements', '#22c55e', 1 FROM grading_scales WHERE name = 'Competency Based'
UNION ALL
SELECT id, 'Not Yet Competent', 0, 69, 'Requires additional work', '#ef4444', 2 FROM grading_scales WHERE name = 'Competency Based';