-- ============================================
-- FINANCE MODULE DATABASE SCHEMA
-- Comprehensive ERP Finance Management for Educational Institutions
-- ============================================

-- Fiscal Years Table
CREATE TABLE public.fiscal_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Currencies Table
CREATE TABLE public.currencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    is_base BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Exchange Rates Table
CREATE TABLE public.exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency_id UUID REFERENCES public.currencies(id) ON DELETE CASCADE,
    to_currency_id UUID REFERENCES public.currencies(id) ON DELETE CASCADE,
    rate DECIMAL(18, 6) NOT NULL,
    effective_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Account Groups Table
CREATE TABLE public.account_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    account_type TEXT NOT NULL CHECK (account_type IN ('Asset', 'Liability', 'Equity', 'Income', 'Expense')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Account Sub Groups Table
CREATE TABLE public.account_sub_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES public.account_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Chart of Accounts Table
CREATE TABLE public.chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_code TEXT NOT NULL UNIQUE,
    account_name TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN ('Asset', 'Liability', 'Equity', 'Income', 'Expense')),
    group_id UUID REFERENCES public.account_groups(id),
    sub_group_id UUID REFERENCES public.account_sub_groups(id),
    parent_id UUID REFERENCES public.chart_of_accounts(id),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_system BOOLEAN DEFAULT FALSE,
    normal_balance TEXT CHECK (normal_balance IN ('Debit', 'Credit')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Payment Modes Table
CREATE TABLE public.payment_modes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tax Types Table
CREATE TABLE public.tax_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    rate DECIMAL(5, 2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Fee Accounts (Link between fee types and chart of accounts)
CREATE TABLE public.fee_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    account_id UUID REFERENCES public.chart_of_accounts(id),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Fee Policies Table
CREATE TABLE public.fee_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    academic_year_id UUID REFERENCES public.academic_years(id),
    session_type_id UUID REFERENCES public.session_types(id),
    student_type_id UUID REFERENCES public.student_types(id),
    fee_account_id UUID REFERENCES public.fee_accounts(id),
    amount DECIMAL(15, 2) NOT NULL,
    due_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Vendor Types Table
CREATE TABLE public.vendor_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Vendors/Suppliers Table
CREATE TABLE public.vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_type_id UUID REFERENCES public.vendor_types(id),
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    tax_id TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Bank Accounts Table
CREATE TABLE public.bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    branch TEXT,
    account_id UUID REFERENCES public.chart_of_accounts(id),
    opening_balance DECIMAL(15, 2) DEFAULT 0,
    current_balance DECIMAL(15, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Cash Accounts Table
CREATE TABLE public.cash_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    account_id UUID REFERENCES public.chart_of_accounts(id),
    opening_balance DECIMAL(15, 2) DEFAULT 0,
    current_balance DECIMAL(15, 2) DEFAULT 0,
    is_petty_cash BOOLEAN DEFAULT FALSE,
    imprest_limit DECIMAL(15, 2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Student Ledger Table (Sub-ledger for each student)
CREATE TABLE public.student_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.chart_of_accounts(id),
    balance DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Journal Entries Table (Header)
CREATE TABLE public.journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_number TEXT NOT NULL UNIQUE,
    transaction_date DATE NOT NULL,
    fiscal_year_id UUID REFERENCES public.fiscal_years(id),
    reference TEXT,
    narration TEXT NOT NULL,
    entry_type TEXT CHECK (entry_type IN ('Standard', 'Adjustment', 'Accrual', 'Prepayment', 'Correction', 'Opening', 'Closing')),
    status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Pending', 'Approved', 'Posted', 'Rejected', 'Cancelled')),
    total_debit DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total_credit DECIMAL(15, 2) NOT NULL DEFAULT 0,
    prepared_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    posted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Journal Lines Table (Detail)
CREATE TABLE public.journal_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.chart_of_accounts(id) NOT NULL,
    student_id UUID REFERENCES public.students(id),
    vendor_id UUID REFERENCES public.vendors(id),
    description TEXT,
    debit DECIMAL(15, 2) DEFAULT 0,
    credit DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- General Ledger Table (Posted transactions)
CREATE TABLE public.general_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID REFERENCES public.journal_entries(id),
    journal_line_id UUID REFERENCES public.journal_lines(id),
    account_id UUID REFERENCES public.chart_of_accounts(id) NOT NULL,
    student_id UUID REFERENCES public.students(id),
    vendor_id UUID REFERENCES public.vendors(id),
    transaction_date DATE NOT NULL,
    fiscal_year_id UUID REFERENCES public.fiscal_years(id),
    debit DECIMAL(15, 2) DEFAULT 0,
    credit DECIMAL(15, 2) DEFAULT 0,
    balance DECIMAL(15, 2) DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Fee Invoices Table
CREATE TABLE public.fee_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT NOT NULL UNIQUE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    invoice_date DATE NOT NULL,
    due_date DATE,
    academic_year_id UUID REFERENCES public.academic_years(id),
    session_id UUID REFERENCES public.sessions(id),
    subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(15, 2) DEFAULT 0,
    total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(15, 2) DEFAULT 0,
    balance_due DECIMAL(15, 2) NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'Unpaid' CHECK (status IN ('Unpaid', 'Partial', 'Paid', 'Overdue', 'Cancelled')),
    journal_entry_id UUID REFERENCES public.journal_entries(id),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fee Invoice Items Table
CREATE TABLE public.fee_invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.fee_invoices(id) ON DELETE CASCADE,
    fee_account_id UUID REFERENCES public.fee_accounts(id),
    description TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(15, 2) NOT NULL,
    tax_type_id UUID REFERENCES public.tax_types(id),
    tax_amount DECIMAL(15, 2) DEFAULT 0,
    total DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Fee Payments Table
CREATE TABLE public.fee_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number TEXT NOT NULL UNIQUE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.fee_invoices(id),
    payment_date DATE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    payment_mode_id UUID REFERENCES public.payment_modes(id),
    bank_account_id UUID REFERENCES public.bank_accounts(id),
    cash_account_id UUID REFERENCES public.cash_accounts(id),
    reference_number TEXT,
    journal_entry_id UUID REFERENCES public.journal_entries(id),
    status TEXT DEFAULT 'Completed' CHECK (status IN ('Pending', 'Completed', 'Cancelled', 'Refunded')),
    notes TEXT,
    received_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Payables (Bills) Table
CREATE TABLE public.payables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_number TEXT NOT NULL UNIQUE,
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
    bill_date DATE NOT NULL,
    due_date DATE,
    fiscal_year_id UUID REFERENCES public.fiscal_years(id),
    subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(15, 2) DEFAULT 0,
    total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(15, 2) DEFAULT 0,
    balance_due DECIMAL(15, 2) NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'Unpaid' CHECK (status IN ('Unpaid', 'Partial', 'Paid', 'Overdue', 'Cancelled')),
    journal_entry_id UUID REFERENCES public.journal_entries(id),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Payable Items Table
CREATE TABLE public.payable_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payable_id UUID REFERENCES public.payables(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.chart_of_accounts(id),
    description TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(15, 2) NOT NULL,
    tax_type_id UUID REFERENCES public.tax_types(id),
    tax_amount DECIMAL(15, 2) DEFAULT 0,
    total DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Payable Payments Table
CREATE TABLE public.payable_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number TEXT NOT NULL UNIQUE,
    payable_id UUID REFERENCES public.payables(id),
    vendor_id UUID REFERENCES public.vendors(id),
    payment_date DATE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    payment_mode_id UUID REFERENCES public.payment_modes(id),
    bank_account_id UUID REFERENCES public.bank_accounts(id),
    cash_account_id UUID REFERENCES public.cash_accounts(id),
    reference_number TEXT,
    journal_entry_id UUID REFERENCES public.journal_entries(id),
    status TEXT DEFAULT 'Completed' CHECK (status IN ('Pending', 'Completed', 'Cancelled')),
    notes TEXT,
    paid_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Budget Table
CREATE TABLE public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    fiscal_year_id UUID REFERENCES public.fiscal_years(id),
    description TEXT,
    total_amount DECIMAL(15, 2) DEFAULT 0,
    status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Approved', 'Active', 'Closed')),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Budget Lines Table
CREATE TABLE public.budget_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID REFERENCES public.budgets(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.chart_of_accounts(id),
    description TEXT,
    budgeted_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    actual_amount DECIMAL(15, 2) DEFAULT 0,
    variance DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Imprest Limits Setup
CREATE TABLE public.imprest_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cash_account_id UUID REFERENCES public.cash_accounts(id),
    limit_amount DECIMAL(15, 2) NOT NULL,
    effective_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Fee Cancellations Table
CREATE TABLE public.fee_cancellations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.fee_invoices(id),
    student_id UUID REFERENCES public.students(id),
    cancellation_date DATE NOT NULL,
    reason TEXT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    journal_entry_id UUID REFERENCES public.journal_entries(id),
    cancelled_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.fiscal_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_sub_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.general_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payable_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payable_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imprest_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_cancellations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Admin access
CREATE POLICY "Admins can manage fiscal_years" ON public.fiscal_years FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage currencies" ON public.currencies FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage exchange_rates" ON public.exchange_rates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage account_groups" ON public.account_groups FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage account_sub_groups" ON public.account_sub_groups FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage chart_of_accounts" ON public.chart_of_accounts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage payment_modes" ON public.payment_modes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage tax_types" ON public.tax_types FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage fee_accounts" ON public.fee_accounts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage fee_policies" ON public.fee_policies FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage vendor_types" ON public.vendor_types FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage vendors" ON public.vendors FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage bank_accounts" ON public.bank_accounts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage cash_accounts" ON public.cash_accounts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage student_ledger" ON public.student_ledger FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage journal_entries" ON public.journal_entries FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage journal_lines" ON public.journal_lines FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage general_ledger" ON public.general_ledger FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage fee_invoices" ON public.fee_invoices FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage fee_invoice_items" ON public.fee_invoice_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage fee_payments" ON public.fee_payments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage payables" ON public.payables FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage payable_items" ON public.payable_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage payable_payments" ON public.payable_payments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage budgets" ON public.budgets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage budget_lines" ON public.budget_lines FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage imprest_limits" ON public.imprest_limits FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage fee_cancellations" ON public.fee_cancellations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Teachers can view finance data
CREATE POLICY "Teachers can view fiscal_years" ON public.fiscal_years FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Teachers can view currencies" ON public.currencies FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Teachers can view chart_of_accounts" ON public.chart_of_accounts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Teachers can view fee_invoices" ON public.fee_invoices FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Teachers can view fee_payments" ON public.fee_payments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'));

-- Students can view their own finance data
CREATE POLICY "Students can view their invoices" ON public.fee_invoices FOR SELECT TO authenticated 
USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));
CREATE POLICY "Students can view their payments" ON public.fee_payments FOR SELECT TO authenticated 
USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));
CREATE POLICY "Students can view their ledger" ON public.student_ledger FOR SELECT TO authenticated 
USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

-- Function to generate journal entry number
CREATE OR REPLACE FUNCTION public.generate_journal_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  entry_number TEXT;
  year_suffix TEXT;
BEGIN
  year_suffix := TO_CHAR(NOW(), 'YYYY');
  SELECT 'JE-' || year_suffix || '-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(entry_number FROM 9) AS INTEGER)), 0) + 1)::TEXT, 6, '0')
  INTO entry_number
  FROM public.journal_entries
  WHERE entry_number LIKE 'JE-' || year_suffix || '-%';
  
  IF entry_number IS NULL THEN
    entry_number := 'JE-' || year_suffix || '-000001';
  END IF;
  
  RETURN entry_number;
END;
$$;

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv_number TEXT;
  year_suffix TEXT;
BEGIN
  year_suffix := TO_CHAR(NOW(), 'YYYY');
  SELECT 'INV-' || year_suffix || '-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 10) AS INTEGER)), 0) + 1)::TEXT, 6, '0')
  INTO inv_number
  FROM public.fee_invoices
  WHERE invoice_number LIKE 'INV-' || year_suffix || '-%';
  
  IF inv_number IS NULL THEN
    inv_number := 'INV-' || year_suffix || '-000001';
  END IF;
  
  RETURN inv_number;
END;
$$;

-- Function to generate receipt number
CREATE OR REPLACE FUNCTION public.generate_receipt_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rcpt_number TEXT;
  year_suffix TEXT;
BEGIN
  year_suffix := TO_CHAR(NOW(), 'YYYY');
  SELECT 'RCP-' || year_suffix || '-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(receipt_number FROM 10) AS INTEGER)), 0) + 1)::TEXT, 6, '0')
  INTO rcpt_number
  FROM public.fee_payments
  WHERE receipt_number LIKE 'RCP-' || year_suffix || '-%';
  
  IF rcpt_number IS NULL THEN
    rcpt_number := 'RCP-' || year_suffix || '-000001';
  END IF;
  
  RETURN rcpt_number;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_fiscal_years_updated_at BEFORE UPDATE ON public.fiscal_years FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_chart_of_accounts_updated_at BEFORE UPDATE ON public.chart_of_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cash_accounts_updated_at BEFORE UPDATE ON public.cash_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_student_ledger_updated_at BEFORE UPDATE ON public.student_ledger FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fee_invoices_updated_at BEFORE UPDATE ON public.fee_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fee_payments_updated_at BEFORE UPDATE ON public.fee_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payables_updated_at BEFORE UPDATE ON public.payables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payable_payments_updated_at BEFORE UPDATE ON public.payable_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fee_policies_updated_at BEFORE UPDATE ON public.fee_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default data
INSERT INTO public.currencies (code, name, symbol, is_base, is_active) VALUES 
('KES', 'Kenyan Shilling', 'KSh', true, true),
('USD', 'US Dollar', '$', false, true),
('GBP', 'British Pound', '£', false, true),
('EUR', 'Euro', '€', false, true);

INSERT INTO public.payment_modes (name, description, is_active) VALUES
('Cash', 'Cash payment', true),
('Bank Transfer', 'Direct bank transfer', true),
('Cheque', 'Payment by cheque', true),
('Mobile Money', 'M-Pesa or other mobile money', true),
('Card', 'Credit/Debit card payment', true);

INSERT INTO public.account_groups (name, account_type, description) VALUES
('Current Assets', 'Asset', 'Short-term assets'),
('Fixed Assets', 'Asset', 'Long-term assets'),
('Current Liabilities', 'Liability', 'Short-term obligations'),
('Long-Term Liabilities', 'Liability', 'Long-term obligations'),
('Revenue', 'Income', 'Income from operations'),
('Other Income', 'Income', 'Non-operating income'),
('Operating Expenses', 'Expense', 'Day-to-day operational costs'),
('Administrative Expenses', 'Expense', 'Administrative overhead'),
('Capital', 'Equity', 'Owners equity');