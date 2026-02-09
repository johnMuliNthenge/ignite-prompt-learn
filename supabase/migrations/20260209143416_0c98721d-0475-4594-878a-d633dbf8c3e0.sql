
-- Add subject_id FK to academic_exams to link exams to registered subjects
ALTER TABLE public.academic_exams 
ADD COLUMN subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL;

-- Add unique constraint: one exam per class+session+subject+exam_type
ALTER TABLE public.academic_exams 
ADD CONSTRAINT unique_exam_per_class_session_subject_type 
UNIQUE (class_id, session_id, subject_id, exam_type);

-- Add unique constraint on academic_marks for upsert support
-- First check if it exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'academic_marks_exam_student_unique'
  ) THEN
    ALTER TABLE public.academic_marks 
    ADD CONSTRAINT academic_marks_exam_student_unique 
    UNIQUE (exam_id, student_id);
  END IF;
END $$;
