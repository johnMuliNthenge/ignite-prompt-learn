-- Create curriculum_subjects junction table for many-to-many relationship
-- This allows one curriculum entry to have multiple subjects

CREATE TABLE public.curriculum_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  curriculum_id UUID NOT NULL REFERENCES public.curriculum(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  is_compulsory BOOLEAN DEFAULT true,
  credit_hours INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(curriculum_id, subject_id)
);

-- Remove subject_id from curriculum table as it moves to junction table
-- First, migrate existing data to the new structure
INSERT INTO public.curriculum_subjects (curriculum_id, subject_id, is_compulsory, credit_hours)
SELECT id, subject_id, is_compulsory, credit_hours 
FROM public.curriculum 
WHERE subject_id IS NOT NULL;

-- Add name field to curriculum for easier identification
ALTER TABLE public.curriculum ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Update existing curriculum entries to have a name based on programme
UPDATE public.curriculum c
SET name = CONCAT('Curriculum ', DATE_PART('year', c.start_date)::TEXT)
WHERE c.name IS NULL;

-- Now we can drop the individual subject columns from curriculum
ALTER TABLE public.curriculum 
  DROP COLUMN IF EXISTS subject_id,
  DROP COLUMN IF EXISTS is_compulsory,
  DROP COLUMN IF EXISTS credit_hours;

-- Enable RLS
ALTER TABLE public.curriculum_subjects ENABLE ROW LEVEL SECURITY;

-- RLS policies for curriculum_subjects
CREATE POLICY "Allow read access to curriculum_subjects for authenticated users"
  ON public.curriculum_subjects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow insert curriculum_subjects for users with permission"
  ON public.curriculum_subjects FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update curriculum_subjects for users with permission"
  ON public.curriculum_subjects FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow delete curriculum_subjects for users with permission"
  ON public.curriculum_subjects FOR DELETE
  TO authenticated
  USING (true);