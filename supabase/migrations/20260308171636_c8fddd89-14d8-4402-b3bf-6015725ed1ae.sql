-- Fix: Re-grant execute on functions needed by authenticated payroll users
-- These are called client-side during payroll finalization (admin-only UI flow)
GRANT EXECUTE ON FUNCTION public.generate_payslip_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_journal_number() TO authenticated;

-- Add other_deductions_account_id to payroll_settings for non-statutory deduction GL posting
ALTER TABLE public.payroll_settings 
  ADD COLUMN IF NOT EXISTS other_deductions_account_id uuid REFERENCES chart_of_accounts(id);

COMMENT ON COLUMN public.payroll_settings.other_deductions_account_id IS 'GL account for non-statutory deductions (loans, salary advances, etc.)';