
-- Table to register which subjects a class takes for a given session
CREATE TABLE public.class_subject_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  registered_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(class_id, session_id, subject_id)
);

-- Enable RLS
ALTER TABLE public.class_subject_registrations ENABLE ROW LEVEL SECURITY;

-- Admin and teachers can view
CREATE POLICY "Admins and teachers can view subject registrations"
ON public.class_subject_registrations
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'teacher'))
);

-- Admin can insert
CREATE POLICY "Admins can insert subject registrations"
ON public.class_subject_registrations
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Admin can delete
CREATE POLICY "Admins can delete subject registrations"
ON public.class_subject_registrations
FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
