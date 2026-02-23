
-- ============================================
-- PAYROLL MODULE - COMPLETE DATABASE SCHEMA
-- ============================================

-- 1. PAYROLL SETTINGS
CREATE TABLE public.payroll_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_frequency TEXT NOT NULL DEFAULT 'Monthly' CHECK (payroll_frequency IN ('Weekly','Bi-Weekly','Monthly')),
  currency_id UUID REFERENCES public.currencies(id),
  default_payment_mode_id UUID REFERENCES public.payment_modes(id),
  salary_expense_account_id UUID REFERENCES public.chart_of_accounts(id),
  payroll_liability_account_id UUID REFERENCES public.chart_of_accounts(id),
  auto_finance_posting BOOLEAN DEFAULT false,
  payslip_email_template TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payroll_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view payroll settings" ON public.payroll_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage payroll settings" ON public.payroll_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. SALARY STRUCTURES
CREATE TABLE public.salary_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.salary_structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users view salary structures" ON public.salary_structures FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage salary structures" ON public.salary_structures FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. SALARY COMPONENTS (earnings & deductions templates)
CREATE TABLE public.salary_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID NOT NULL REFERENCES public.salary_structures(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  component_type TEXT NOT NULL CHECK (component_type IN ('earning','deduction')),
  category TEXT NOT NULL DEFAULT 'allowance' CHECK (category IN ('basic_pay','allowance','overtime','bonus','benefit','statutory','custom_deduction')),
  calculation_type TEXT NOT NULL DEFAULT 'fixed' CHECK (calculation_type IN ('fixed','percentage','formula')),
  default_amount NUMERIC(15,2) DEFAULT 0,
  percentage_of TEXT, -- reference component name for percentage calc
  formula TEXT, -- custom formula
  is_taxable BOOLEAN DEFAULT true,
  is_statutory BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.salary_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users view salary components" ON public.salary_components FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage salary components" ON public.salary_components FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. STATUTORY DEDUCTION CONFIGS
CREATE TABLE public.statutory_deduction_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- e.g. PAYE, NHIF, NSSF
  deduction_type TEXT NOT NULL CHECK (deduction_type IN ('tax','pension','social_security','health_insurance','custom')),
  is_active BOOLEAN DEFAULT true,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  account_id UUID REFERENCES public.chart_of_accounts(id), -- liability account for posting
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.statutory_deduction_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users view statutory configs" ON public.statutory_deduction_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage statutory configs" ON public.statutory_deduction_configs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. TAX BANDS (for PAYE calculation)
CREATE TABLE public.payroll_tax_bands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statutory_config_id UUID NOT NULL REFERENCES public.statutory_deduction_configs(id) ON DELETE CASCADE,
  lower_limit NUMERIC(15,2) NOT NULL DEFAULT 0,
  upper_limit NUMERIC(15,2), -- NULL means unlimited
  rate NUMERIC(5,4) NOT NULL, -- e.g. 0.10 for 10%
  fixed_amount NUMERIC(15,2) DEFAULT 0,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payroll_tax_bands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users view tax bands" ON public.payroll_tax_bands FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage tax bands" ON public.payroll_tax_bands FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. PAYROLL CALENDAR
CREATE TABLE public.payroll_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  processing_deadline DATE,
  payment_date DATE,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','processing','approved','finalized','closed')),
  fiscal_year_id UUID REFERENCES public.fiscal_years(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users view payroll periods" ON public.payroll_periods FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage payroll periods" ON public.payroll_periods FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. EMPLOYEE PAYROLL ACCOUNTS
CREATE TABLE public.employee_payroll_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  salary_structure_id UUID REFERENCES public.salary_structures(id),
  payment_mode_id UUID REFERENCES public.payment_modes(id),
  bank_name TEXT,
  bank_branch TEXT,
  bank_account_number TEXT,
  tax_number TEXT,
  pension_number TEXT,
  basic_salary NUMERIC(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id)
);

ALTER TABLE public.employee_payroll_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users view employee payroll accounts" ON public.employee_payroll_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage employee payroll accounts" ON public.employee_payroll_accounts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8. PAYROLL RUNS
CREATE TABLE public.payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES public.payroll_periods(id),
  run_date TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','processing','computed','approved','finalized','posted')),
  total_gross NUMERIC(15,2) DEFAULT 0,
  total_deductions NUMERIC(15,2) DEFAULT 0,
  total_net NUMERIC(15,2) DEFAULT 0,
  employee_count INT DEFAULT 0,
  processed_by UUID,
  approved_by UUID,
  finalized_by UUID,
  finalized_at TIMESTAMPTZ,
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users view payroll runs" ON public.payroll_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage payroll runs" ON public.payroll_runs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 9. PAYROLL ITEMS (per-employee line items in a run)
CREATE TABLE public.payroll_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id),
  basic_salary NUMERIC(15,2) DEFAULT 0,
  gross_pay NUMERIC(15,2) DEFAULT 0,
  taxable_income NUMERIC(15,2) DEFAULT 0,
  total_deductions NUMERIC(15,2) DEFAULT 0,
  net_pay NUMERIC(15,2) DEFAULT 0,
  proration_factor NUMERIC(5,4) DEFAULT 1.0000,
  leave_days_deducted INT DEFAULT 0,
  overtime_hours NUMERIC(8,2) DEFAULT 0,
  overtime_amount NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payroll_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users view payroll items" ON public.payroll_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage payroll items" ON public.payroll_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 10. PAYROLL ITEM DETAILS (breakdown of each earning/deduction)
CREATE TABLE public.payroll_item_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_item_id UUID NOT NULL REFERENCES public.payroll_items(id) ON DELETE CASCADE,
  component_name TEXT NOT NULL,
  component_type TEXT NOT NULL CHECK (component_type IN ('earning','deduction')),
  category TEXT,
  amount NUMERIC(15,2) DEFAULT 0,
  is_statutory BOOLEAN DEFAULT false,
  statutory_config_id UUID REFERENCES public.statutory_deduction_configs(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payroll_item_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users view payroll item details" ON public.payroll_item_details FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage payroll item details" ON public.payroll_item_details FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 11. EMPLOYEE DEDUCTIONS & BENEFITS (loans, advances, recurring)
CREATE TABLE public.employee_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  deduction_type TEXT NOT NULL CHECK (deduction_type IN ('loan','salary_advance','recurring','one_time','benefit')),
  total_amount NUMERIC(15,2) DEFAULT 0,
  monthly_amount NUMERIC(15,2) DEFAULT 0,
  amount_recovered NUMERIC(15,2) DEFAULT 0,
  balance NUMERIC(15,2) DEFAULT 0,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  account_id UUID REFERENCES public.chart_of_accounts(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.employee_deductions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users view employee deductions" ON public.employee_deductions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage employee deductions" ON public.employee_deductions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 12. PAYSLIPS (generated from finalized payroll)
CREATE TABLE public.payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_item_id UUID NOT NULL REFERENCES public.payroll_items(id),
  payroll_run_id UUID NOT NULL REFERENCES public.payroll_runs(id),
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id),
  period_id UUID NOT NULL REFERENCES public.payroll_periods(id),
  payslip_number TEXT NOT NULL,
  gross_pay NUMERIC(15,2) DEFAULT 0,
  total_deductions NUMERIC(15,2) DEFAULT 0,
  net_pay NUMERIC(15,2) DEFAULT 0,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users view payslips" ON public.payslips FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage payslips" ON public.payslips FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 13. PAYROLL AUDIT LOG
CREATE TABLE public.payroll_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  performed_by UUID,
  performed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payroll_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users view payroll audit log" ON public.payroll_audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage payroll audit log" ON public.payroll_audit_log FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- PAYSLIP NUMBER GENERATOR
CREATE OR REPLACE FUNCTION public.generate_payslip_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ps_number TEXT;
  year_suffix TEXT;
BEGIN
  year_suffix := TO_CHAR(NOW(), 'YYYY');
  SELECT 'PS-' || year_suffix || '-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(payslip_number FROM 9) AS INTEGER)), 0) + 1)::TEXT, 6, '0')
  INTO ps_number
  FROM public.payslips
  WHERE payslip_number LIKE 'PS-' || year_suffix || '-%';
  
  IF ps_number IS NULL THEN
    ps_number := 'PS-' || year_suffix || '-000001';
  END IF;
  
  RETURN ps_number;
END;
$$;

-- Update triggers
CREATE TRIGGER update_payroll_settings_updated_at BEFORE UPDATE ON public.payroll_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_salary_structures_updated_at BEFORE UPDATE ON public.salary_structures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_statutory_deduction_configs_updated_at BEFORE UPDATE ON public.statutory_deduction_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payroll_periods_updated_at BEFORE UPDATE ON public.payroll_periods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_employee_payroll_accounts_updated_at BEFORE UPDATE ON public.employee_payroll_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payroll_runs_updated_at BEFORE UPDATE ON public.payroll_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_employee_deductions_updated_at BEFORE UPDATE ON public.employee_deductions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
