
-- Create payment_vouchers table for payables
CREATE TABLE IF NOT EXISTS public.payment_vouchers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  voucher_number TEXT NOT NULL UNIQUE,
  vendor_id UUID REFERENCES public.vendors(id),
  vendor_name TEXT NOT NULL, -- stores name even for ad-hoc vendors
  voucher_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  description TEXT,
  payment_mode_id UUID REFERENCES public.payment_modes(id),
  reference_number TEXT, -- cheque number, mpesa code, etc.
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Pending', 'Approved', 'Rejected', 'Paid')),
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  prepared_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_vouchers ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins manage payment vouchers"
  ON public.payment_vouchers
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Trigger for updated_at
CREATE TRIGGER update_payment_vouchers_updated_at
  BEFORE UPDATE ON public.payment_vouchers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate voucher number
CREATE OR REPLACE FUNCTION public.generate_voucher_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_number TEXT;
  year_suffix TEXT;
BEGIN
  year_suffix := TO_CHAR(NOW(), 'YYYY');
  SELECT 'PV-' || year_suffix || '-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(voucher_number FROM 9) AS INTEGER)), 0) + 1)::TEXT, 5, '0')
  INTO v_number
  FROM public.payment_vouchers
  WHERE voucher_number LIKE 'PV-' || year_suffix || '-%';

  IF v_number IS NULL THEN
    v_number := 'PV-' || year_suffix || '-00001';
  END IF;

  RETURN v_number;
END;
$$;
