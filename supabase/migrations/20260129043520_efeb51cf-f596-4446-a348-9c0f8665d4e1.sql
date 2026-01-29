-- Create fee_templates table for storing class/course fee structures
CREATE TABLE public.fee_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL CHECK (template_type IN ('class', 'course')),
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  course_id UUID REFERENCES public.lms_courses(id) ON DELETE SET NULL,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create fee_template_items table for storing vote heads/accounts for each template
CREATE TABLE public.fee_template_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.fee_templates(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.fee_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_template_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fee_templates
CREATE POLICY "Authenticated users can view fee templates"
  ON public.fee_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and finance can manage fee templates"
  ON public.fee_templates FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.user_has_permission(auth.uid(), 'finance.student_invoice', 'add')
  );

-- RLS Policies for fee_template_items
CREATE POLICY "Authenticated users can view fee template items"
  ON public.fee_template_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and finance can manage fee template items"
  ON public.fee_template_items FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.user_has_permission(auth.uid(), 'finance.student_invoice', 'add')
  );

-- Add updated_at trigger for fee_templates
CREATE TRIGGER update_fee_templates_updated_at
  BEFORE UPDATE ON public.fee_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add module code for Student Invoice
INSERT INTO public.app_modules (code, name, description, parent_code, is_active, sort_order)
VALUES ('finance.student_invoice', 'Student Invoice', 'Manage fee templates and student invoicing', 'finance', true, 5)
ON CONFLICT (code) DO NOTHING;