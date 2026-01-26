-- HR Module Database Schema

-- Employment Status Enum
CREATE TYPE public.employment_status AS ENUM (
  'active',
  'probation',
  'confirmed',
  'suspended',
  'resigned',
  'terminated',
  'retired',
  'deceased'
);

-- Leave Status Enum
CREATE TYPE public.leave_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'cancelled'
);

-- HR Utility Tables

-- Designations
CREATE TABLE public.hr_designations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  effective_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ranks
CREATE TABLE public.hr_ranks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  level INTEGER DEFAULT 1,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  effective_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Employment Terms
CREATE TABLE public.hr_employment_terms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  effective_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Employee Categories
CREATE TABLE public.hr_employee_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  effective_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Casual Employee Categories
CREATE TABLE public.hr_casual_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  effective_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Skill Types
CREATE TABLE public.hr_skill_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Skills
CREATE TABLE public.hr_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  skill_type_id UUID REFERENCES public.hr_skill_types(id),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insurance Types
CREATE TABLE public.hr_insurance_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  effective_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Departments
CREATE TABLE public.hr_departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID REFERENCES public.hr_departments(id),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  head_employee_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Employees Table
CREATE TABLE public.hr_employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_no TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id),
  
  -- Personal Information
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  gender TEXT,
  date_of_birth DATE,
  national_id TEXT,
  passport_no TEXT,
  phone TEXT,
  email TEXT,
  physical_address TEXT,
  
  -- Employment Information
  employment_term_id UUID REFERENCES public.hr_employment_terms(id),
  employee_category_id UUID REFERENCES public.hr_employee_categories(id),
  casual_category_id UUID REFERENCES public.hr_casual_categories(id),
  designation_id UUID REFERENCES public.hr_designations(id),
  department_id UUID REFERENCES public.hr_departments(id),
  rank_id UUID REFERENCES public.hr_ranks(id),
  date_of_hire DATE,
  confirmation_date DATE,
  supervisor_id UUID REFERENCES public.hr_employees(id),
  
  -- Status
  status public.employment_status DEFAULT 'active',
  
  -- Leave
  leave_group_id UUID,
  work_week_id UUID,
  
  -- System Access
  login_enabled BOOLEAN DEFAULT false,
  
  -- Photo
  photo_url TEXT,
  
  -- Audit
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Employee Skills (Many-to-Many)
CREATE TABLE public.hr_employee_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.hr_skills(id),
  proficiency_level TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(employee_id, skill_id)
);

-- Employee Status History
CREATE TABLE public.hr_employee_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  old_status public.employment_status,
  new_status public.employment_status NOT NULL,
  reason TEXT,
  effective_date DATE NOT NULL,
  approved_by UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Employee Transfers/Promotions History
CREATE TABLE public.hr_employee_changes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL, -- 'transfer', 'promotion', 'designation_change', 'rank_change', 'supervisor_change', 'acting'
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  effective_date DATE NOT NULL,
  end_date DATE, -- for acting appointments
  approved_by UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Employee Documents
CREATE TABLE public.hr_employee_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- 'contract', 'offer_letter', 'nda', 'disciplinary', 'certificate', 'other'
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  expiry_date DATE,
  version INTEGER DEFAULT 1,
  is_hr_only BOOLEAN DEFAULT false,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Leave Types
CREATE TABLE public.hr_leave_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_paid BOOLEAN DEFAULT true,
  annual_entitlement INTEGER DEFAULT 0,
  accrual_rate NUMERIC DEFAULT 0, -- monthly accrual
  carry_forward_limit INTEGER DEFAULT 0,
  max_days_per_request INTEGER,
  gender_restriction TEXT, -- 'male', 'female', null for both
  requires_approval BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Leave Groups
CREATE TABLE public.hr_leave_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Leave Group Types (Many-to-Many)
CREATE TABLE public.hr_leave_group_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  leave_group_id UUID NOT NULL REFERENCES public.hr_leave_groups(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES public.hr_leave_types(id) ON DELETE CASCADE,
  entitlement_override INTEGER,
  UNIQUE(leave_group_id, leave_type_id)
);

-- Leave Periods
CREATE TABLE public.hr_leave_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_open BOOLEAN DEFAULT true,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Work Weeks
CREATE TABLE public.hr_work_weeks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  monday BOOLEAN DEFAULT true,
  tuesday BOOLEAN DEFAULT true,
  wednesday BOOLEAN DEFAULT true,
  thursday BOOLEAN DEFAULT true,
  friday BOOLEAN DEFAULT true,
  saturday BOOLEAN DEFAULT false,
  sunday BOOLEAN DEFAULT false,
  half_day_saturday BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Holidays
CREATE TABLE public.hr_holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  work_week_id UUID REFERENCES public.hr_work_weeks(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Reserved Periods (Blackout dates)
CREATE TABLE public.hr_reserved_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  department_id UUID REFERENCES public.hr_departments(id),
  reason TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Leave Applications
CREATE TABLE public.hr_leave_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id),
  leave_type_id UUID NOT NULL REFERENCES public.hr_leave_types(id),
  leave_period_id UUID REFERENCES public.hr_leave_periods(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_requested NUMERIC NOT NULL,
  reason TEXT,
  attachment_url TEXT,
  delegated_to UUID REFERENCES public.hr_employees(id),
  status public.leave_status DEFAULT 'pending',
  supervisor_action_by UUID,
  supervisor_action_at TIMESTAMP WITH TIME ZONE,
  supervisor_remarks TEXT,
  hr_action_by UUID,
  hr_action_at TIMESTAMP WITH TIME ZONE,
  hr_remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Leave Balances
CREATE TABLE public.hr_leave_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES public.hr_leave_types(id),
  leave_period_id UUID NOT NULL REFERENCES public.hr_leave_periods(id),
  opening_balance NUMERIC DEFAULT 0,
  accrued NUMERIC DEFAULT 0,
  taken NUMERIC DEFAULT 0,
  adjustment NUMERIC DEFAULT 0,
  closing_balance NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(employee_id, leave_type_id, leave_period_id)
);

-- Attendance
CREATE TABLE public.hr_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id),
  attendance_date DATE NOT NULL,
  check_in TIMESTAMP WITH TIME ZONE,
  check_out TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'present', -- 'present', 'absent', 'late', 'half_day', 'on_leave'
  late_minutes INTEGER DEFAULT 0,
  early_exit_minutes INTEGER DEFAULT 0,
  remarks TEXT,
  marked_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(employee_id, attendance_date)
);

-- Overtime
CREATE TABLE public.hr_overtime (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id),
  overtime_date DATE NOT NULL,
  hours NUMERIC NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Time Off In Lieu (TOIL)
CREATE TABLE public.hr_toil (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id),
  earned_date DATE NOT NULL,
  hours_earned NUMERIC NOT NULL,
  hours_used NUMERIC DEFAULT 0,
  expiry_date DATE,
  source_overtime_id UUID REFERENCES public.hr_overtime(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Performance Periods
CREATE TABLE public.hr_performance_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Performance Rating Scales
CREATE TABLE public.hr_rating_scales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  min_value NUMERIC DEFAULT 1,
  max_value NUMERIC DEFAULT 5,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Rating Scale Levels
CREATE TABLE public.hr_rating_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scale_id UUID NOT NULL REFERENCES public.hr_rating_scales(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  color TEXT
);

-- Performance Reviews
CREATE TABLE public.hr_performance_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id),
  period_id UUID NOT NULL REFERENCES public.hr_performance_periods(id),
  reviewer_id UUID REFERENCES public.hr_employees(id),
  rating_scale_id UUID REFERENCES public.hr_rating_scales(id),
  overall_rating NUMERIC,
  supervisor_comments TEXT,
  hr_comments TEXT,
  employee_comments TEXT,
  goals_achieved TEXT,
  areas_for_improvement TEXT,
  status TEXT DEFAULT 'draft', -- 'draft', 'submitted', 'reviewed', 'finalized'
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  finalized_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Disciplinary Records
CREATE TABLE public.hr_disciplinary_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id),
  incident_date DATE NOT NULL,
  type TEXT NOT NULL, -- 'verbal_warning', 'written_warning', 'final_warning', 'show_cause', 'suspension', 'termination'
  description TEXT NOT NULL,
  outcome TEXT,
  attachment_url TEXT,
  issued_by UUID,
  witness_id UUID REFERENCES public.hr_employees(id),
  is_finalized BOOLEAN DEFAULT false,
  finalized_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- HR Audit Log
CREATE TABLE public.hr_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'create', 'update', 'delete'
  old_values JSONB,
  new_values JSONB,
  user_id UUID,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Update department head reference
ALTER TABLE public.hr_departments 
ADD CONSTRAINT hr_departments_head_employee_id_fkey 
FOREIGN KEY (head_employee_id) REFERENCES public.hr_employees(id);

-- Update employee leave group reference
ALTER TABLE public.hr_employees
ADD CONSTRAINT hr_employees_leave_group_id_fkey
FOREIGN KEY (leave_group_id) REFERENCES public.hr_leave_groups(id);

-- Update employee work week reference
ALTER TABLE public.hr_employees
ADD CONSTRAINT hr_employees_work_week_id_fkey
FOREIGN KEY (work_week_id) REFERENCES public.hr_work_weeks(id);

-- Enable RLS on all HR tables
ALTER TABLE public.hr_designations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_ranks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_employment_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_employee_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_casual_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_skill_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_insurance_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_employee_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_employee_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_employee_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_leave_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_leave_group_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_leave_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_work_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_reserved_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_leave_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_overtime ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_toil ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_performance_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_rating_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_rating_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_disciplinary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for HR Utilities (Admin can manage, authenticated can view)
CREATE POLICY "Admin can manage hr_designations" ON public.hr_designations FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view hr_designations" ON public.hr_designations FOR SELECT USING (true);

CREATE POLICY "Admin can manage hr_ranks" ON public.hr_ranks FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view hr_ranks" ON public.hr_ranks FOR SELECT USING (true);

CREATE POLICY "Admin can manage hr_employment_terms" ON public.hr_employment_terms FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view hr_employment_terms" ON public.hr_employment_terms FOR SELECT USING (true);

CREATE POLICY "Admin can manage hr_employee_categories" ON public.hr_employee_categories FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view hr_employee_categories" ON public.hr_employee_categories FOR SELECT USING (true);

CREATE POLICY "Admin can manage hr_casual_categories" ON public.hr_casual_categories FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view hr_casual_categories" ON public.hr_casual_categories FOR SELECT USING (true);

CREATE POLICY "Admin can manage hr_skill_types" ON public.hr_skill_types FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view hr_skill_types" ON public.hr_skill_types FOR SELECT USING (true);

CREATE POLICY "Admin can manage hr_skills" ON public.hr_skills FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view hr_skills" ON public.hr_skills FOR SELECT USING (true);

CREATE POLICY "Admin can manage hr_insurance_types" ON public.hr_insurance_types FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view hr_insurance_types" ON public.hr_insurance_types FOR SELECT USING (true);

CREATE POLICY "Admin can manage hr_departments" ON public.hr_departments FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view hr_departments" ON public.hr_departments FOR SELECT USING (true);

-- Employee policies
CREATE POLICY "Admin can manage hr_employees" ON public.hr_employees FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Employees can view own record" ON public.hr_employees FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admin can manage hr_employee_skills" ON public.hr_employee_skills FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can manage hr_employee_status_history" ON public.hr_employee_status_history FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can manage hr_employee_changes" ON public.hr_employee_changes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can manage hr_employee_documents" ON public.hr_employee_documents FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Leave policies
CREATE POLICY "Admin can manage hr_leave_types" ON public.hr_leave_types FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view hr_leave_types" ON public.hr_leave_types FOR SELECT USING (true);

CREATE POLICY "Admin can manage hr_leave_groups" ON public.hr_leave_groups FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view hr_leave_groups" ON public.hr_leave_groups FOR SELECT USING (true);

CREATE POLICY "Admin can manage hr_leave_group_types" ON public.hr_leave_group_types FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can manage hr_leave_periods" ON public.hr_leave_periods FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view hr_leave_periods" ON public.hr_leave_periods FOR SELECT USING (true);

CREATE POLICY "Admin can manage hr_work_weeks" ON public.hr_work_weeks FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view hr_work_weeks" ON public.hr_work_weeks FOR SELECT USING (true);

CREATE POLICY "Admin can manage hr_holidays" ON public.hr_holidays FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view hr_holidays" ON public.hr_holidays FOR SELECT USING (true);

CREATE POLICY "Admin can manage hr_reserved_periods" ON public.hr_reserved_periods FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Leave applications - employees can apply, supervisors can view team
CREATE POLICY "Admin can manage hr_leave_applications" ON public.hr_leave_applications FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Employees can manage own leave" ON public.hr_leave_applications FOR ALL USING (
  employee_id IN (SELECT id FROM public.hr_employees WHERE user_id = auth.uid())
);

CREATE POLICY "Admin can manage hr_leave_balances" ON public.hr_leave_balances FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Employees can view own balances" ON public.hr_leave_balances FOR SELECT USING (
  employee_id IN (SELECT id FROM public.hr_employees WHERE user_id = auth.uid())
);

-- Attendance policies
CREATE POLICY "Admin can manage hr_attendance" ON public.hr_attendance FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Employees can view own attendance" ON public.hr_attendance FOR SELECT USING (
  employee_id IN (SELECT id FROM public.hr_employees WHERE user_id = auth.uid())
);

CREATE POLICY "Admin can manage hr_overtime" ON public.hr_overtime FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can manage hr_toil" ON public.hr_toil FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Performance policies
CREATE POLICY "Admin can manage hr_performance_periods" ON public.hr_performance_periods FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view hr_performance_periods" ON public.hr_performance_periods FOR SELECT USING (true);

CREATE POLICY "Admin can manage hr_rating_scales" ON public.hr_rating_scales FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view hr_rating_scales" ON public.hr_rating_scales FOR SELECT USING (true);

CREATE POLICY "Admin can manage hr_rating_levels" ON public.hr_rating_levels FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view hr_rating_levels" ON public.hr_rating_levels FOR SELECT USING (true);

CREATE POLICY "Admin can manage hr_performance_reviews" ON public.hr_performance_reviews FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Employees can view own reviews" ON public.hr_performance_reviews FOR SELECT USING (
  employee_id IN (SELECT id FROM public.hr_employees WHERE user_id = auth.uid())
);

-- Disciplinary (HR/Admin only)
CREATE POLICY "Admin can manage hr_disciplinary_records" ON public.hr_disciplinary_records FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Audit log
CREATE POLICY "Admin can view hr_audit_log" ON public.hr_audit_log FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "System can insert hr_audit_log" ON public.hr_audit_log FOR INSERT WITH CHECK (true);

-- Auto-generate employee number function
CREATE OR REPLACE FUNCTION public.generate_employee_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.employee_no IS NULL THEN
    NEW.employee_no := 'EMP' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for auto-generating employee number
CREATE TRIGGER tr_generate_employee_number
BEFORE INSERT ON public.hr_employees
FOR EACH ROW
EXECUTE FUNCTION public.generate_employee_number();

-- Updated_at triggers
CREATE TRIGGER update_hr_employees_updated_at BEFORE UPDATE ON public.hr_employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_hr_departments_updated_at BEFORE UPDATE ON public.hr_departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_hr_designations_updated_at BEFORE UPDATE ON public.hr_designations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_hr_ranks_updated_at BEFORE UPDATE ON public.hr_ranks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_hr_employment_terms_updated_at BEFORE UPDATE ON public.hr_employment_terms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_hr_employee_categories_updated_at BEFORE UPDATE ON public.hr_employee_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_hr_casual_categories_updated_at BEFORE UPDATE ON public.hr_casual_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_hr_leave_applications_updated_at BEFORE UPDATE ON public.hr_leave_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_hr_leave_balances_updated_at BEFORE UPDATE ON public.hr_leave_balances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_hr_attendance_updated_at BEFORE UPDATE ON public.hr_attendance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_hr_performance_reviews_updated_at BEFORE UPDATE ON public.hr_performance_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();