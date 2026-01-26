-- Add missing columns to existing tables
ALTER TABLE public.hr_leave_types ADD COLUMN IF NOT EXISTS default_days integer DEFAULT 0;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS employment_status text DEFAULT 'active';
ALTER TABLE public.hr_leave_groups ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE public.hr_skill_types ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE public.hr_skills ADD COLUMN IF NOT EXISTS code text;

-- Create hr_documents table
CREATE TABLE IF NOT EXISTS public.hr_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  document_name text NOT NULL,
  file_url text,
  expiry_date date,
  notes text,
  uploaded_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create hr_overtime table
CREATE TABLE IF NOT EXISTS public.hr_overtime (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  overtime_date date NOT NULL,
  hours numeric(4,2) NOT NULL,
  reason text,
  status text DEFAULT 'pending',
  approved_by uuid,
  approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create hr_toil table
CREATE TABLE IF NOT EXISTS public.hr_toil (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  earned_date date NOT NULL,
  hours numeric(4,2) NOT NULL,
  used_hours numeric(4,2) DEFAULT 0,
  expiry_date date,
  notes text,
  status text DEFAULT 'active',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create hr_performance_reviews table
CREATE TABLE IF NOT EXISTS public.hr_performance_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  period_id uuid REFERENCES public.hr_evaluation_periods(id),
  reviewer_id uuid,
  review_date date,
  overall_rating numeric(3,2),
  strengths text,
  improvements text,
  goals text,
  comments text,
  status text DEFAULT 'draft',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create hr_disciplinary_records table
CREATE TABLE IF NOT EXISTS public.hr_disciplinary_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  incident_date date NOT NULL,
  type text NOT NULL,
  description text NOT NULL,
  action_taken text,
  outcome text,
  witness_id uuid,
  issued_by uuid,
  attachment_url text,
  is_finalized boolean DEFAULT false,
  finalized_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.hr_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_overtime ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_toil ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_disciplinary_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for new tables
CREATE POLICY "HR admins can manage documents" ON public.hr_documents FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "HR admins can manage overtime" ON public.hr_overtime FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "HR admins can manage toil" ON public.hr_toil FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "HR admins can manage performance reviews" ON public.hr_performance_reviews FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "HR admins can manage disciplinary records" ON public.hr_disciplinary_records FOR ALL USING (public.has_role(auth.uid(), 'admin'));