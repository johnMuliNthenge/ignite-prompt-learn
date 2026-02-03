-- Create M-Pesa settings table
CREATE TABLE public.mpesa_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_key TEXT NOT NULL,
  consumer_secret TEXT NOT NULL,
  business_short_code TEXT NOT NULL,
  passkey TEXT NOT NULL,
  callback_url TEXT,
  environment TEXT DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.mpesa_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage M-Pesa settings
CREATE POLICY "Admins can manage mpesa settings"
ON public.mpesa_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create M-Pesa transactions log
CREATE TABLE public.mpesa_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_request_id TEXT,
  merchant_request_id TEXT,
  student_id UUID REFERENCES public.students(id),
  invoice_id UUID REFERENCES public.fee_invoices(id),
  phone_number TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  account_reference TEXT,
  transaction_desc TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'cancelled')),
  result_code TEXT,
  result_desc TEXT,
  mpesa_receipt_number TEXT,
  transaction_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mpesa_transactions ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view their transactions
CREATE POLICY "Users can view mpesa transactions"
ON public.mpesa_transactions
FOR SELECT
TO authenticated
USING (true);

-- Service role can insert/update transactions
CREATE POLICY "Service can manage mpesa transactions"
ON public.mpesa_transactions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_mpesa_settings_updated_at
  BEFORE UPDATE ON public.mpesa_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mpesa_transactions_updated_at
  BEFORE UPDATE ON public.mpesa_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();