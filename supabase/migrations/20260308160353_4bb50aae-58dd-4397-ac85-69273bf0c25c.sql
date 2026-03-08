
ALTER TABLE public.payroll_settings 
  ADD COLUMN IF NOT EXISTS personal_relief numeric DEFAULT 2400,
  ADD COLUMN IF NOT EXISTS employer_nssf_rate numeric DEFAULT 0.06,
  ADD COLUMN IF NOT EXISTS employer_housing_levy_rate numeric DEFAULT 0.015;

ALTER TABLE public.payroll_items 
  ADD COLUMN IF NOT EXISTS employer_contributions numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_relief numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paye numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nssf numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shif numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS housing_levy numeric DEFAULT 0;
