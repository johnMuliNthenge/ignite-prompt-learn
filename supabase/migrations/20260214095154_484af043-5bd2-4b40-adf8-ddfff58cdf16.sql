
-- Institution settings table for multi-tenant SaaS branding
CREATE TABLE public.institution_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_name TEXT NOT NULL DEFAULT 'My Institution',
  logo_url TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  primary_color TEXT NOT NULL DEFAULT '217 91% 60%',
  secondary_color TEXT NOT NULL DEFAULT '210 40% 96.1%',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.institution_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read institution settings (needed for theming)
CREATE POLICY "Anyone can read institution settings"
ON public.institution_settings
FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert institution settings"
ON public.institution_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update
CREATE POLICY "Admins can update institution settings"
ON public.institution_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_institution_settings_updated_at
BEFORE UPDATE ON public.institution_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
