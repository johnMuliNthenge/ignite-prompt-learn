-- Create SMTP settings table
CREATE TABLE public.smtp_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host VARCHAR(255) NOT NULL,
  port INTEGER NOT NULL DEFAULT 587,
  username VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  from_email VARCHAR(255) NOT NULL,
  from_name VARCHAR(255) NOT NULL,
  encryption VARCHAR(10) NOT NULL DEFAULT 'tls' CHECK (encryption IN ('tls', 'ssl', 'none')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.smtp_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage SMTP settings
CREATE POLICY "Admins can view SMTP settings"
ON public.smtp_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert SMTP settings"
ON public.smtp_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update SMTP settings"
ON public.smtp_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete SMTP settings"
ON public.smtp_settings
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_smtp_settings_updated_at
BEFORE UPDATE ON public.smtp_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();