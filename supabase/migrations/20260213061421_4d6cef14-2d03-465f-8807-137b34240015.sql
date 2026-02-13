
-- Drop the old unique constraint that doesn't include subject_id
ALTER TABLE public.academic_marks DROP CONSTRAINT IF EXISTS academic_marks_exam_student_unique;

-- Create new unique constraint including subject_id
ALTER TABLE public.academic_marks ADD CONSTRAINT academic_marks_exam_student_subject_unique UNIQUE (exam_id, student_id, subject_id);
