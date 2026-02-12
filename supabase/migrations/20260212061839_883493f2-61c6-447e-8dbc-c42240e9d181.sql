
-- Add subject_id column to academic_marks
ALTER TABLE public.academic_marks
ADD COLUMN subject_id uuid REFERENCES public.subjects(id);

-- Drop existing unique constraint on exam_id,student_id (if exists)
-- and create new one including subject_id
DO $$
BEGIN
  -- Try to drop old constraint
  BEGIN
    ALTER TABLE public.academic_marks DROP CONSTRAINT IF EXISTS academic_marks_exam_id_student_id_key;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.academic_marks DROP CONSTRAINT IF EXISTS unique_exam_student;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- Create new unique constraint including subject_id
ALTER TABLE public.academic_marks
ADD CONSTRAINT academic_marks_exam_student_subject_key UNIQUE (exam_id, student_id, subject_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_academic_marks_subject_id ON public.academic_marks(subject_id);
