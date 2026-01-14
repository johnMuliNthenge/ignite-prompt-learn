-- Create course_certificates table to track issued certificates
CREATE TABLE public.course_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  certificate_number VARCHAR(50) NOT NULL UNIQUE,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completion_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  final_score NUMERIC(5,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_certificates_user_id ON public.course_certificates(user_id);
CREATE INDEX idx_certificates_course_id ON public.course_certificates(course_id);
CREATE UNIQUE INDEX idx_certificates_user_course ON public.course_certificates(user_id, course_id);

-- Enable RLS
ALTER TABLE public.course_certificates ENABLE ROW LEVEL SECURITY;

-- Users can view their own certificates
CREATE POLICY "Users can view their own certificates"
ON public.course_certificates
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own certificates (when they complete a course)
CREATE POLICY "Users can create their own certificates"
ON public.course_certificates
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins and teachers can view all certificates
CREATE POLICY "Admins and teachers can view all certificates"
ON public.course_certificates
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')
);

-- Function to generate certificate number
CREATE OR REPLACE FUNCTION public.generate_certificate_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cert_number TEXT;
BEGIN
  cert_number := 'CERT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTR(gen_random_uuid()::text, 1, 8));
  RETURN cert_number;
END;
$$;