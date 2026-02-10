
-- Table to define mark components per subject (e.g., Paper 1, Paper 2, CAT, etc.)
CREATE TABLE public.subject_mark_components (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  max_marks NUMERIC NOT NULL DEFAULT 100,
  weight NUMERIC NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subject_id, name)
);

ALTER TABLE public.subject_mark_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view components" ON public.subject_mark_components
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage components" ON public.subject_mark_components
  FOR ALL USING (auth.role() = 'authenticated');

-- Table to store marks per component per student per exam
CREATE TABLE public.academic_component_marks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.academic_exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES public.subject_mark_components(id) ON DELETE CASCADE,
  marks_obtained NUMERIC DEFAULT 0,
  is_absent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(exam_id, student_id, component_id)
);

ALTER TABLE public.academic_component_marks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view component marks" ON public.academic_component_marks
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage component marks" ON public.academic_component_marks
  FOR ALL USING (auth.role() = 'authenticated');
