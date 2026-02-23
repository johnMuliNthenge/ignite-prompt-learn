
-- Pay Grades
CREATE TABLE public.pay_grades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  min_salary NUMERIC DEFAULT 0,
  max_salary NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.pay_grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage pay_grades" ON public.pay_grades FOR ALL USING (auth.uid() IS NOT NULL);

-- Financial Institutions
CREATE TABLE public.financial_institutions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  bank_code TEXT,
  branch_code TEXT,
  swift_code TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.financial_institutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage financial_institutions" ON public.financial_institutions FOR ALL USING (auth.uid() IS NOT NULL);

-- Loan Types
CREATE TABLE public.payroll_loan_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  max_repayment_months INTEGER,
  interest_rate NUMERIC DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.payroll_loan_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage payroll_loan_types" ON public.payroll_loan_types FOR ALL USING (auth.uid() IS NOT NULL);

-- Insurance Providers
CREATE TABLE public.insurance_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.insurance_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage insurance_providers" ON public.insurance_providers FOR ALL USING (auth.uid() IS NOT NULL);

-- Non-Cash Benefits
CREATE TABLE public.non_cash_benefits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  taxable BOOLEAN DEFAULT true,
  default_amount NUMERIC DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.non_cash_benefits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage non_cash_benefits" ON public.non_cash_benefits FOR ALL USING (auth.uid() IS NOT NULL);

-- Salary Disbursement Modes
CREATE TABLE public.salary_disbursement_modes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.salary_disbursement_modes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage salary_disbursement_modes" ON public.salary_disbursement_modes FOR ALL USING (auth.uid() IS NOT NULL);

-- Pay Accounts (GL mapping for payroll)
CREATE TABLE public.payroll_pay_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  account_id UUID REFERENCES public.chart_of_accounts(id),
  account_type TEXT NOT NULL DEFAULT 'expense',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.payroll_pay_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage payroll_pay_accounts" ON public.payroll_pay_accounts FOR ALL USING (auth.uid() IS NOT NULL);

-- Employee Events (promotions, transfers, etc.)
CREATE TABLE public.employee_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  affects_salary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.employee_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage employee_events" ON public.employee_events FOR ALL USING (auth.uid() IS NOT NULL);

-- Employee Status types for payroll
CREATE TABLE public.payroll_employee_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.payroll_employee_statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage payroll_employee_statuses" ON public.payroll_employee_statuses FOR ALL USING (auth.uid() IS NOT NULL);

-- Expand payroll_settings with Kenya-specific fields
ALTER TABLE public.payroll_settings
  ADD COLUMN IF NOT EXISTS employer_pin TEXT,
  ADD COLUMN IF NOT EXISTS employer_nhif_code TEXT,
  ADD COLUMN IF NOT EXISTS employer_nssf_number TEXT,
  ADD COLUMN IF NOT EXISTS paye_account_id UUID REFERENCES public.chart_of_accounts(id),
  ADD COLUMN IF NOT EXISTS shif_account_id UUID REFERENCES public.chart_of_accounts(id),
  ADD COLUMN IF NOT EXISTS nssf_account_id UUID REFERENCES public.chart_of_accounts(id),
  ADD COLUMN IF NOT EXISTS nhlf_account_id UUID REFERENCES public.chart_of_accounts(id),
  ADD COLUMN IF NOT EXISTS net_pay_account_id UUID REFERENCES public.chart_of_accounts(id),
  ADD COLUMN IF NOT EXISTS basic_salary_account_id UUID REFERENCES public.chart_of_accounts(id),
  ADD COLUMN IF NOT EXISTS employer_nssf_account_id UUID REFERENCES public.chart_of_accounts(id),
  ADD COLUMN IF NOT EXISTS employer_housing_levy_account_id UUID REFERENCES public.chart_of_accounts(id),
  ADD COLUMN IF NOT EXISTS employee_housing_levy_account_id UUID REFERENCES public.chart_of_accounts(id),
  ADD COLUMN IF NOT EXISTS insurance_relief_rate NUMERIC DEFAULT 15,
  ADD COLUMN IF NOT EXISTS max_insurance_relief NUMERIC DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS nhif_relief_rate NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shif_relief_rate NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS housing_levy_relief_rate NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_housing_levy_relief NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_shif_deduction NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_allowable_deduction NUMERIC DEFAULT 20000,
  ADD COLUMN IF NOT EXISTS use_nssf_tier1_only BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_nssf BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS include_employer_pension_in_taxable BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_payroll_approval BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_loan_balance_on_payroll BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS signatory_1 TEXT,
  ADD COLUMN IF NOT EXISTS signatory_2 TEXT,
  ADD COLUMN IF NOT EXISTS signatory_3 TEXT;

-- Expand employee_payroll_accounts with Kenya-specific fields
ALTER TABLE public.employee_payroll_accounts
  ADD COLUMN IF NOT EXISTS pay_grade_id UUID REFERENCES public.pay_grades(id),
  ADD COLUMN IF NOT EXISTS processing_method TEXT DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS disbursement_mode_id UUID REFERENCES public.salary_disbursement_modes(id),
  ADD COLUMN IF NOT EXISTS employee_status_id UUID REFERENCES public.payroll_employee_statuses(id),
  ADD COLUMN IF NOT EXISTS sheltered_paye BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sheltered_nhif BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sheltered_nssf BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sheltered_housing_levy BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sheltered_nhlf BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS effective_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Employee bank accounts (multiple per employee)
CREATE TABLE public.employee_bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  account_number TEXT NOT NULL,
  bank_code TEXT,
  bank_name TEXT,
  branch_name TEXT,
  financial_institution_id UUID REFERENCES public.financial_institutions(id),
  percentage NUMERIC DEFAULT 100,
  is_primary BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.employee_bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage employee_bank_accounts" ON public.employee_bank_accounts FOR ALL USING (auth.uid() IS NOT NULL);

-- Employee non-cash benefits assignment
CREATE TABLE public.employee_non_cash_benefits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  benefit_id UUID NOT NULL REFERENCES public.non_cash_benefits(id),
  amount NUMERIC DEFAULT 0,
  effective_from DATE,
  effective_to DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.employee_non_cash_benefits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage employee_non_cash_benefits" ON public.employee_non_cash_benefits FOR ALL USING (auth.uid() IS NOT NULL);

-- Add payroll module codes to app_modules
INSERT INTO public.app_modules (code, name, parent_code, sort_order, is_active) VALUES
  ('payroll', 'Payroll', NULL, 50, true),
  ('payroll.utilities', 'Payroll Utilities', 'payroll', 1, true),
  ('payroll.setup', 'Payroll Setup', 'payroll', 2, true),
  ('payroll.accounts', 'Employee Accounts', 'payroll', 3, true),
  ('payroll.processing', 'Payroll Processing', 'payroll', 4, true),
  ('payroll.reports', 'Payroll Reports', 'payroll', 5, true),
  ('payroll.deductions', 'Deductions & Benefits', 'payroll', 6, true),
  ('payroll.payslips', 'Payslips', 'payroll', 7, true),
  ('payroll.audit', 'Audit Log', 'payroll', 8, true)
ON CONFLICT DO NOTHING;
