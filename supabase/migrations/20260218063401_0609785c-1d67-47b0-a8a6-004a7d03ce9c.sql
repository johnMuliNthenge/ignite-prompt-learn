
-- Add linked asset account to payment_modes table
ALTER TABLE public.payment_modes 
ADD COLUMN IF NOT EXISTS asset_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.payment_modes.asset_account_id IS 'The asset ledger account (e.g. Bank, Cash, M-Pesa) where money flows through for this payment mode';
