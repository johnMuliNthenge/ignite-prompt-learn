
-- Academic Exams table
CREATE TABLE public.academic_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  class_id UUID REFERENCES public.classes(id),
  academic_year_id UUID REFERENCES public.academic_years(id),
  session_id UUID REFERENCES public.sessions(id),
  exam_date DATE,
  total_marks NUMERIC(5,2) DEFAULT 100,
  passing_marks NUMERIC(5,2) DEFAULT 40,
  exam_type VARCHAR(50) CHECK (exam_type IN ('midterm', 'final', 'quiz', 'assignment', 'practical')),
  subject VARCHAR(255),
  description TEXT,
  is_published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Academic Marks table
CREATE TABLE public.academic_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES public.academic_exams(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  marks_obtained NUMERIC(5,2),
  grade VARCHAR(5),
  remarks TEXT,
  is_absent BOOLEAN DEFAULT false,
  entered_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(exam_id, student_id)
);

-- Student Attendance table
CREATE TABLE public.student_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id),
  attendance_date DATE NOT NULL,
  status VARCHAR(20) CHECK (status IN ('present', 'absent', 'late', 'excused')) DEFAULT 'present',
  remarks TEXT,
  marked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, attendance_date)
);

-- Enable RLS
ALTER TABLE public.academic_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for academic_exams
CREATE POLICY "Users with view permission can view exams" ON public.academic_exams
  FOR SELECT USING (
    public.user_has_permission(auth.uid(), 'academics.exams', 'view') OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users with add permission can create exams" ON public.academic_exams
  FOR INSERT WITH CHECK (
    public.user_has_permission(auth.uid(), 'academics.exams', 'add') OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users with edit permission can update exams" ON public.academic_exams
  FOR UPDATE USING (
    public.user_has_permission(auth.uid(), 'academics.exams', 'edit') OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users with delete permission can delete exams" ON public.academic_exams
  FOR DELETE USING (
    public.user_has_permission(auth.uid(), 'academics.exams', 'delete') OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for academic_marks
CREATE POLICY "Users with view permission can view marks" ON public.academic_marks
  FOR SELECT USING (
    public.user_has_permission(auth.uid(), 'academics.marks', 'view') OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users with add permission can create marks" ON public.academic_marks
  FOR INSERT WITH CHECK (
    public.user_has_permission(auth.uid(), 'academics.marks', 'add') OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users with edit permission can update marks" ON public.academic_marks
  FOR UPDATE USING (
    public.user_has_permission(auth.uid(), 'academics.marks', 'edit') OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users with delete permission can delete marks" ON public.academic_marks
  FOR DELETE USING (
    public.user_has_permission(auth.uid(), 'academics.marks', 'delete') OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for student_attendance
CREATE POLICY "Users with view permission can view attendance" ON public.student_attendance
  FOR SELECT USING (
    public.user_has_permission(auth.uid(), 'academics.attendance', 'view') OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users with add permission can create attendance" ON public.student_attendance
  FOR INSERT WITH CHECK (
    public.user_has_permission(auth.uid(), 'academics.attendance', 'add') OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users with edit permission can update attendance" ON public.student_attendance
  FOR UPDATE USING (
    public.user_has_permission(auth.uid(), 'academics.attendance', 'edit') OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users with delete permission can delete attendance" ON public.student_attendance
  FOR DELETE USING (
    public.user_has_permission(auth.uid(), 'academics.attendance', 'delete') OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Add app_modules entries for the new module
INSERT INTO public.app_modules (code, name, description, parent_code, sort_order, is_active) VALUES
  ('academics', 'Student Academics', 'Student academic management module', NULL, 50, true),
  ('academics.exams', 'Exams Management', 'Create and manage academic exams', 'academics', 1, true),
  ('academics.marks', 'Marks Entry', 'Enter and manage student marks', 'academics', 2, true),
  ('academics.results', 'Results', 'View student results and reports', 'academics', 3, true),
  ('academics.attendance', 'Student Attendance', 'Track student attendance', 'academics', 4, true);

-- Create indexes for performance
CREATE INDEX idx_academic_exams_class ON public.academic_exams(class_id);
CREATE INDEX idx_academic_exams_year ON public.academic_exams(academic_year_id);
CREATE INDEX idx_academic_marks_exam ON public.academic_marks(exam_id);
CREATE INDEX idx_academic_marks_student ON public.academic_marks(student_id);
CREATE INDEX idx_student_attendance_student ON public.student_attendance(student_id);
CREATE INDEX idx_student_attendance_date ON public.student_attendance(attendance_date);
CREATE INDEX idx_student_attendance_class ON public.student_attendance(class_id);
