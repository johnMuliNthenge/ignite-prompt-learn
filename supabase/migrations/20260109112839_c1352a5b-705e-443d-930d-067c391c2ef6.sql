
-- Add 'audio' to resource types by updating check constraint
ALTER TABLE public.course_resources DROP CONSTRAINT IF EXISTS course_resources_resource_type_check;
ALTER TABLE public.course_resources ADD CONSTRAINT course_resources_resource_type_check 
  CHECK (resource_type IN ('file', 'video', 'audio', 'link', 'text', 'embed', 'scorm', 'document'));

-- Create lesson quizzes table
CREATE TABLE public.lesson_quizzes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id uuid REFERENCES public.course_resources(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    description text,
    passing_score integer DEFAULT 70,
    time_limit_minutes integer,
    max_attempts integer,
    is_required boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create quiz questions table
CREATE TABLE public.quiz_questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id uuid REFERENCES public.lesson_quizzes(id) ON DELETE CASCADE NOT NULL,
    question_text text NOT NULL,
    question_type text NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
    options jsonb,
    correct_answer text NOT NULL,
    points integer DEFAULT 1,
    sort_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create quiz attempts table
CREATE TABLE public.quiz_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id uuid REFERENCES public.lesson_quizzes(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    answers jsonb NOT NULL,
    score integer NOT NULL,
    passed boolean NOT NULL,
    started_at timestamptz DEFAULT now(),
    completed_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.lesson_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Policies for lesson_quizzes
CREATE POLICY "Users can view quizzes of enrolled courses"
ON public.lesson_quizzes FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM course_resources r
        JOIN course_sections s ON s.id = r.section_id
        JOIN lms_enrollments e ON e.course_id = s.course_id
        WHERE r.id = lesson_quizzes.resource_id 
        AND e.user_id = auth.uid() 
        AND e.status = 'active'
    )
    OR EXISTS (
        SELECT 1 FROM course_resources r
        JOIN course_sections s ON s.id = r.section_id
        JOIN lms_courses c ON c.id = s.course_id
        WHERE r.id = lesson_quizzes.resource_id 
        AND c.status = 'published' 
        AND c.is_public = true
    )
);

CREATE POLICY "Teachers can manage quizzes of their courses"
ON public.lesson_quizzes FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM course_resources r
        JOIN course_sections s ON s.id = r.section_id
        JOIN lms_courses c ON c.id = s.course_id
        WHERE r.id = lesson_quizzes.resource_id AND c.created_by = auth.uid()
    )
);

CREATE POLICY "Admins can manage all quizzes"
ON public.lesson_quizzes FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies for quiz_questions
CREATE POLICY "Users can view questions of enrolled courses"
ON public.quiz_questions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM lesson_quizzes q
        JOIN course_resources r ON r.id = q.resource_id
        JOIN course_sections s ON s.id = r.section_id
        JOIN lms_enrollments e ON e.course_id = s.course_id
        WHERE q.id = quiz_questions.quiz_id 
        AND e.user_id = auth.uid() 
        AND e.status = 'active'
    )
);

CREATE POLICY "Teachers can manage questions of their courses"
ON public.quiz_questions FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM lesson_quizzes q
        JOIN course_resources r ON r.id = q.resource_id
        JOIN course_sections s ON s.id = r.section_id
        JOIN lms_courses c ON c.id = s.course_id
        WHERE q.id = quiz_questions.quiz_id AND c.created_by = auth.uid()
    )
);

CREATE POLICY "Admins can manage all questions"
ON public.quiz_questions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies for quiz_attempts
CREATE POLICY "Users can view their own attempts"
ON public.quiz_attempts FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own attempts"
ON public.quiz_attempts FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Teachers can view attempts in their courses"
ON public.quiz_attempts FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM lesson_quizzes q
        JOIN course_resources r ON r.id = q.resource_id
        JOIN course_sections s ON s.id = r.section_id
        JOIN lms_courses c ON c.id = s.course_id
        WHERE q.id = quiz_attempts.quiz_id AND c.created_by = auth.uid()
    )
);

CREATE POLICY "Admins can view all attempts"
ON public.quiz_attempts FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_lesson_quizzes_resource_id ON public.lesson_quizzes(resource_id);
CREATE INDEX idx_quiz_questions_quiz_id ON public.quiz_questions(quiz_id);
CREATE INDEX idx_quiz_attempts_quiz_id ON public.quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);
