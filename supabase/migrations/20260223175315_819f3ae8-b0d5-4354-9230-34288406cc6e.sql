
-- Add missing columns to payroll_settings
ALTER TABLE public.payroll_settings
  ADD COLUMN IF NOT EXISTS retirement_age INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS shif_on_casual BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS nssf_tier_distribution TEXT DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS show_10_column_remittance BOOLEAN DEFAULT false;
