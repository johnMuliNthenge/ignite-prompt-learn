
-- Create exams table for formal assessments
CREATE TABLE public.course_exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  passing_score INTEGER NOT NULL DEFAULT 70,
  time_limit_minutes INTEGER,
  max_attempts INTEGER DEFAULT 1,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  is_published BOOLEAN DEFAULT false,
  shuffle_questions BOOLEAN DEFAULT false,
  show_results BOOLEAN DEFAULT true,
  prevent_tab_switch BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create exam questions table
CREATE TABLE public.exam_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.course_exams(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice',
  options JSONB,
  correct_answer TEXT NOT NULL,
  points INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create exam attempts table
CREATE TABLE public.exam_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.course_exams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}',
  score INTEGER,
  passed BOOLEAN,
  tab_switches INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.course_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;

-- Policies for course_exams
CREATE POLICY "Enrolled users can view published exams" ON public.course_exams
  FOR SELECT USING (
    is_published = true AND (
      EXISTS (
        SELECT 1 FROM lms_enrollments e
        WHERE e.course_id = course_exams.course_id
        AND e.user_id = auth.uid()
        AND e.status = 'active'
      )
      OR
      EXISTS (
        SELECT 1 FROM lms_courses c
        WHERE c.id = course_exams.course_id
        AND c.status = 'published'
        AND c.is_public = true
      )
    )
  );

CREATE POLICY "Teachers can manage exams for their courses" ON public.course_exams
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM lms_courses c
      WHERE c.id = course_exams.course_id
      AND c.created_by = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all exams" ON public.course_exams
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Policies for exam_questions
CREATE POLICY "Users can view questions of exams they can access" ON public.exam_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_exams e
      JOIN lms_enrollments enr ON enr.course_id = e.course_id
      WHERE e.id = exam_questions.exam_id
      AND e.is_published = true
      AND enr.user_id = auth.uid()
      AND enr.status = 'active'
    )
  );

CREATE POLICY "Teachers can manage questions of their exams" ON public.exam_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM course_exams e
      JOIN lms_courses c ON c.id = e.course_id
      WHERE e.id = exam_questions.exam_id
      AND c.created_by = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all questions" ON public.exam_questions
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Policies for exam_attempts
CREATE POLICY "Users can view their own attempts" ON public.exam_attempts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own attempts" ON public.exam_attempts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own in-progress attempts" ON public.exam_attempts
  FOR UPDATE USING (user_id = auth.uid() AND completed_at IS NULL);

CREATE POLICY "Teachers can view attempts for their exams" ON public.exam_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_exams e
      JOIN lms_courses c ON c.id = e.course_id
      WHERE e.id = exam_attempts.exam_id
      AND c.created_by = auth.uid()
    )
  );

CREATE POLICY "Admins can view all attempts" ON public.exam_attempts
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Create unique index for exam attempts
CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_attempts_unique 
ON public.exam_attempts(exam_id, user_id, started_at);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_course_exams_course ON public.course_exams(course_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_exam ON public.exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user ON public.exam_attempts(user_id);
