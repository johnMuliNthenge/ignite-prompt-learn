
-- Create subjects table
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create programmes table
CREATE TABLE public.programmes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  duration_years INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create curriculum table (maps subjects to programmes with date ranges)
CREATE TABLE public.curriculum (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  semester INTEGER,
  year_of_study INTEGER DEFAULT 1,
  is_compulsory BOOLEAN DEFAULT true,
  credit_hours INTEGER DEFAULT 3,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(programme_id, subject_id, start_date)
);

-- Add programme_id to classes table
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS programme_id UUID REFERENCES public.programmes(id);

-- Enable RLS
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subjects
CREATE POLICY "Users with view permission can view subjects" ON public.subjects
  FOR SELECT USING (public.user_has_permission(auth.uid(), 'academics.subjects', 'view'));

CREATE POLICY "Users with add permission can insert subjects" ON public.subjects
  FOR INSERT WITH CHECK (public.user_has_permission(auth.uid(), 'academics.subjects', 'add'));

CREATE POLICY "Users with edit permission can update subjects" ON public.subjects
  FOR UPDATE USING (public.user_has_permission(auth.uid(), 'academics.subjects', 'edit'));

CREATE POLICY "Users with delete permission can delete subjects" ON public.subjects
  FOR DELETE USING (public.user_has_permission(auth.uid(), 'academics.subjects', 'delete'));

-- RLS Policies for programmes
CREATE POLICY "Users with view permission can view programmes" ON public.programmes
  FOR SELECT USING (public.user_has_permission(auth.uid(), 'academics.programmes', 'view'));

CREATE POLICY "Users with add permission can insert programmes" ON public.programmes
  FOR INSERT WITH CHECK (public.user_has_permission(auth.uid(), 'academics.programmes', 'add'));

CREATE POLICY "Users with edit permission can update programmes" ON public.programmes
  FOR UPDATE USING (public.user_has_permission(auth.uid(), 'academics.programmes', 'edit'));

CREATE POLICY "Users with delete permission can delete programmes" ON public.programmes
  FOR DELETE USING (public.user_has_permission(auth.uid(), 'academics.programmes', 'delete'));

-- RLS Policies for curriculum
CREATE POLICY "Users with view permission can view curriculum" ON public.curriculum
  FOR SELECT USING (public.user_has_permission(auth.uid(), 'academics.curriculum', 'view'));

CREATE POLICY "Users with add permission can insert curriculum" ON public.curriculum
  FOR INSERT WITH CHECK (public.user_has_permission(auth.uid(), 'academics.curriculum', 'add'));

CREATE POLICY "Users with edit permission can update curriculum" ON public.curriculum
  FOR UPDATE USING (public.user_has_permission(auth.uid(), 'academics.curriculum', 'edit'));

CREATE POLICY "Users with delete permission can delete curriculum" ON public.curriculum
  FOR DELETE USING (public.user_has_permission(auth.uid(), 'academics.curriculum', 'delete'));

-- Add to app_modules
INSERT INTO public.app_modules (code, name, description, parent_code, sort_order, is_active) VALUES
  ('academics.subjects', 'Subjects', 'Manage academic subjects', 'academics', 5, true),
  ('academics.programmes', 'Programmes', 'Manage academic programmes', 'academics', 6, true),
  ('academics.curriculum', 'Curriculum', 'Manage curriculum mapping', 'academics', 7, true)
ON CONFLICT (code) DO NOTHING;

-- Create updated_at triggers
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_programmes_updated_at BEFORE UPDATE ON public.programmes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_curriculum_updated_at BEFORE UPDATE ON public.curriculum
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
