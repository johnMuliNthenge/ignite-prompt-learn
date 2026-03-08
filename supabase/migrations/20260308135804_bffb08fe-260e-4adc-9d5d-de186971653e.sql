
-- =============================================
-- INVENTORY MANAGEMENT TABLES
-- =============================================

-- Item Categories
CREATE TABLE public.inventory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.inventory_categories(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage inventory_categories" ON public.inventory_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Item Master
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.inventory_categories(id),
  unit_of_measure TEXT NOT NULL DEFAULT 'Piece',
  min_stock_level INTEGER DEFAULT 0,
  max_stock_level INTEGER DEFAULT 1000,
  reorder_level INTEGER DEFAULT 10,
  item_type TEXT NOT NULL DEFAULT 'consumable' CHECK (item_type IN ('consumable', 'asset', 'service')),
  barcode TEXT,
  cost_price NUMERIC(12,2) DEFAULT 0,
  default_supplier_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage inventory_items" ON public.inventory_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Stores
CREATE TABLE public.inventory_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  store_keeper_id UUID,
  store_category TEXT NOT NULL DEFAULT 'main' CHECK (store_category IN ('main', 'department', 'library')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.inventory_stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage inventory_stores" ON public.inventory_stores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Store Stock (current stock per item per store)
CREATE TABLE public.store_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.inventory_stores(id),
  item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  quantity INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, item_id)
);
ALTER TABLE public.store_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage store_stock" ON public.store_stock FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Stock Transactions
CREATE TABLE public.stock_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('grn', 'issue', 'return', 'transfer', 'adjustment')),
  item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  store_id UUID NOT NULL REFERENCES public.inventory_stores(id),
  destination_store_id UUID REFERENCES public.inventory_stores(id),
  quantity INTEGER NOT NULL,
  reference_number TEXT,
  reference_document TEXT,
  notes TEXT,
  performed_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage stock_transactions" ON public.stock_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Internal Store Requisitions
CREATE TABLE public.store_requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_number TEXT NOT NULL UNIQUE,
  requested_by UUID NOT NULL,
  department TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'issued', 'rejected', 'converted_to_pr')),
  notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.store_requisitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage store_requisitions" ON public.store_requisitions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Requisition Items
CREATE TABLE public.store_requisition_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id UUID NOT NULL REFERENCES public.store_requisitions(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  quantity_requested INTEGER NOT NULL,
  quantity_issued INTEGER DEFAULT 0,
  store_id UUID REFERENCES public.inventory_stores(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.store_requisition_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage store_requisition_items" ON public.store_requisition_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- PROCUREMENT MANAGEMENT TABLES
-- =============================================

-- Suppliers
CREATE TABLE public.procurement_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  tax_id TEXT,
  payment_terms TEXT DEFAULT 'Net 30',
  supplier_category TEXT,
  bank_name TEXT,
  bank_account TEXT,
  bank_branch TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blacklisted')),
  account_id UUID REFERENCES public.chart_of_accounts(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.procurement_suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage procurement_suppliers" ON public.procurement_suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Update inventory_items FK to supplier
ALTER TABLE public.inventory_items ADD CONSTRAINT inventory_items_default_supplier_fkey FOREIGN KEY (default_supplier_id) REFERENCES public.procurement_suppliers(id);

-- Purchase Requisitions
CREATE TABLE public.purchase_requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_number TEXT NOT NULL UNIQUE,
  requested_by UUID NOT NULL,
  department TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'converted')),
  justification TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  source_requisition_id UUID REFERENCES public.store_requisitions(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.purchase_requisitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage purchase_requisitions" ON public.purchase_requisitions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PR Items
CREATE TABLE public.purchase_requisition_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_id UUID NOT NULL REFERENCES public.purchase_requisitions(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.inventory_items(id),
  description TEXT,
  quantity INTEGER NOT NULL,
  estimated_unit_price NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.purchase_requisition_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage purchase_requisition_items" ON public.purchase_requisition_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Request for Quotation
CREATE TABLE public.rfqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_number TEXT NOT NULL UNIQUE,
  pr_id UUID REFERENCES public.purchase_requisitions(id),
  title TEXT NOT NULL,
  description TEXT,
  deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'evaluated', 'awarded')),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.rfqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage rfqs" ON public.rfqs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RFQ Suppliers (which suppliers were invited)
CREATE TABLE public.rfq_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.procurement_suppliers(id),
  quoted_amount NUMERIC(12,2),
  delivery_days INTEGER,
  notes TEXT,
  is_selected BOOLEAN DEFAULT false,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.rfq_suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage rfq_suppliers" ON public.rfq_suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Purchase Orders (LPO/LSO)
CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT NOT NULL UNIQUE,
  po_type TEXT NOT NULL DEFAULT 'LPO' CHECK (po_type IN ('LPO', 'LSO')),
  supplier_id UUID NOT NULL REFERENCES public.procurement_suppliers(id),
  pr_id UUID REFERENCES public.purchase_requisitions(id),
  rfq_id UUID REFERENCES public.rfqs(id),
  delivery_date TIMESTAMPTZ,
  total_amount NUMERIC(12,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'sent', 'partial', 'delivered', 'closed', 'cancelled')),
  notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage purchase_orders" ON public.purchase_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PO Items
CREATE TABLE public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.inventory_items(id),
  description TEXT,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  total_price NUMERIC(12,2) NOT NULL,
  quantity_received INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage purchase_order_items" ON public.purchase_order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Goods Receipt Notes
CREATE TABLE public.goods_receipt_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_number TEXT NOT NULL UNIQUE,
  po_id UUID NOT NULL REFERENCES public.purchase_orders(id),
  supplier_id UUID NOT NULL REFERENCES public.procurement_suppliers(id),
  store_id UUID NOT NULL REFERENCES public.inventory_stores(id),
  received_by UUID,
  received_date TIMESTAMPTZ DEFAULT now(),
  delivery_note_number TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'accepted')),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.goods_receipt_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage goods_receipt_notes" ON public.goods_receipt_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- GRN Items
CREATE TABLE public.grn_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id UUID NOT NULL REFERENCES public.goods_receipt_notes(id) ON DELETE CASCADE,
  po_item_id UUID REFERENCES public.purchase_order_items(id),
  item_id UUID REFERENCES public.inventory_items(id),
  quantity_received INTEGER NOT NULL,
  quantity_accepted INTEGER,
  quantity_rejected INTEGER DEFAULT 0,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.grn_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage grn_items" ON public.grn_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Supplier Invoices (Procurement-specific, links to finance payables)
CREATE TABLE public.procurement_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL,
  supplier_id UUID NOT NULL REFERENCES public.procurement_suppliers(id),
  po_id UUID REFERENCES public.purchase_orders(id),
  grn_id UUID REFERENCES public.goods_receipt_notes(id),
  amount NUMERIC(12,2) NOT NULL,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL,
  due_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  payment_voucher_id UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.procurement_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage procurement_invoices" ON public.procurement_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- LIBRARY MANAGEMENT TABLES
-- =============================================

-- Book Categories
CREATE TABLE public.library_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.library_categories(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.library_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage library_categories" ON public.library_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Books
CREATE TABLE public.library_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  author TEXT,
  isbn TEXT,
  category_id UUID REFERENCES public.library_categories(id),
  publisher TEXT,
  edition TEXT,
  publication_year INTEGER,
  shelf_location TEXT,
  total_copies INTEGER NOT NULL DEFAULT 1,
  available_copies INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  cover_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.library_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage library_books" ON public.library_books FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Library Members
CREATE TABLE public.library_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  student_id UUID REFERENCES public.students(id),
  employee_id UUID REFERENCES public.hr_employees(id),
  member_type TEXT NOT NULL CHECK (member_type IN ('student', 'staff')),
  borrow_limit INTEGER DEFAULT 3,
  max_borrow_days INTEGER DEFAULT 14,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.library_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage library_members" ON public.library_members FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Book Issues (borrowing)
CREATE TABLE public.library_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.library_books(id),
  member_id UUID NOT NULL REFERENCES public.library_members(id),
  issue_date TIMESTAMPTZ DEFAULT now(),
  due_date TIMESTAMPTZ NOT NULL,
  return_date TIMESTAMPTZ,
  renewed_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'returned', 'overdue', 'lost')),
  issued_by UUID,
  returned_to UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.library_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage library_issues" ON public.library_issues FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Book Reservations
CREATE TABLE public.library_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.library_books(id),
  member_id UUID NOT NULL REFERENCES public.library_members(id),
  reserved_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'cancelled', 'expired')),
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.library_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage library_reservations" ON public.library_reservations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Library Fines
CREATE TABLE public.library_fines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES public.library_issues(id),
  member_id UUID NOT NULL REFERENCES public.library_members(id),
  fine_type TEXT NOT NULL CHECK (fine_type IN ('overdue', 'lost', 'damage')),
  amount NUMERIC(12,2) NOT NULL,
  paid_amount NUMERIC(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'waived')),
  student_id UUID REFERENCES public.students(id),
  posted_to_finance BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.library_fines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage library_fines" ON public.library_fines FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Library Settings (fine rates, etc.)
CREATE TABLE public.library_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.library_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage library_settings" ON public.library_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insert default library settings
INSERT INTO public.library_settings (setting_key, setting_value, description) VALUES
('overdue_fine_per_day', '50', 'Fine per day for overdue books (in base currency)'),
('lost_book_multiplier', '2', 'Multiplier for lost book replacement fee (times book price)'),
('max_renewals', '2', 'Maximum number of renewals allowed per book'),
('reservation_expiry_days', '3', 'Days before a reservation expires after notification');

-- Number generators
CREATE OR REPLACE FUNCTION public.generate_requisition_number()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v TEXT; y TEXT;
BEGIN
  y := TO_CHAR(NOW(), 'YYYY');
  SELECT 'REQ-' || y || '-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(requisition_number FROM 10) AS INTEGER)), 0) + 1)::TEXT, 5, '0')
  INTO v FROM public.store_requisitions WHERE requisition_number LIKE 'REQ-' || y || '-%';
  IF v IS NULL THEN v := 'REQ-' || y || '-00001'; END IF;
  RETURN v;
END;$$;

CREATE OR REPLACE FUNCTION public.generate_pr_number()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v TEXT; y TEXT;
BEGIN
  y := TO_CHAR(NOW(), 'YYYY');
  SELECT 'PR-' || y || '-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(pr_number FROM 9) AS INTEGER)), 0) + 1)::TEXT, 5, '0')
  INTO v FROM public.purchase_requisitions WHERE pr_number LIKE 'PR-' || y || '-%';
  IF v IS NULL THEN v := 'PR-' || y || '-00001'; END IF;
  RETURN v;
END;$$;

CREATE OR REPLACE FUNCTION public.generate_rfq_number()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v TEXT; y TEXT;
BEGIN
  y := TO_CHAR(NOW(), 'YYYY');
  SELECT 'RFQ-' || y || '-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(rfq_number FROM 10) AS INTEGER)), 0) + 1)::TEXT, 5, '0')
  INTO v FROM public.rfqs WHERE rfq_number LIKE 'RFQ-' || y || '-%';
  IF v IS NULL THEN v := 'RFQ-' || y || '-00001'; END IF;
  RETURN v;
END;$$;

CREATE OR REPLACE FUNCTION public.generate_po_number()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v TEXT; y TEXT;
BEGIN
  y := TO_CHAR(NOW(), 'YYYY');
  SELECT 'PO-' || y || '-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(po_number FROM 9) AS INTEGER)), 0) + 1)::TEXT, 5, '0')
  INTO v FROM public.purchase_orders WHERE po_number LIKE 'PO-' || y || '-%';
  IF v IS NULL THEN v := 'PO-' || y || '-00001'; END IF;
  RETURN v;
END;$$;

CREATE OR REPLACE FUNCTION public.generate_grn_number()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v TEXT; y TEXT;
BEGIN
  y := TO_CHAR(NOW(), 'YYYY');
  SELECT 'GRN-' || y || '-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(grn_number FROM 10) AS INTEGER)), 0) + 1)::TEXT, 5, '0')
  INTO v FROM public.goods_receipt_notes WHERE grn_number LIKE 'GRN-' || y || '-%';
  IF v IS NULL THEN v := 'GRN-' || y || '-00001'; END IF;
  RETURN v;
END;$$;

CREATE OR REPLACE FUNCTION public.generate_supplier_code()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v TEXT;
BEGIN
  SELECT 'SUP-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(supplier_code FROM 5) AS INTEGER)), 0) + 1)::TEXT, 5, '0')
  INTO v FROM public.procurement_suppliers;
  IF v IS NULL THEN v := 'SUP-00001'; END IF;
  RETURN v;
END;$$;

CREATE OR REPLACE FUNCTION public.generate_item_code()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v TEXT;
BEGIN
  SELECT 'ITM-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(item_code FROM 5) AS INTEGER)), 0) + 1)::TEXT, 5, '0')
  INTO v FROM public.inventory_items;
  IF v IS NULL THEN v := 'ITM-00001'; END IF;
  RETURN v;
END;$$;

CREATE OR REPLACE FUNCTION public.generate_book_code()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v TEXT;
BEGIN
  SELECT 'BK-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(book_code FROM 4) AS INTEGER)), 0) + 1)::TEXT, 5, '0')
  INTO v FROM public.library_books;
  IF v IS NULL THEN v := 'BK-00001'; END IF;
  RETURN v;
END;$$;
