
-- Insert app_modules for Inventory, Procurement, Library
INSERT INTO public.app_modules (code, name, description, parent_code, sort_order, is_active) VALUES
-- Inventory
('inventory', 'Inventory Management', 'Inventory and stock management', NULL, 60, true),
('inventory.items', 'Item Master', 'Manage inventory items', 'inventory', 1, true),
('inventory.stores', 'Store Management', 'Manage stores and warehouses', 'inventory', 2, true),
('inventory.transactions', 'Stock Transactions', 'GRN, issues, returns, transfers', 'inventory', 3, true),
('inventory.requisitions', 'Store Requisitions', 'Internal store requisitions', 'inventory', 4, true),
('inventory.reports', 'Inventory Reports', 'Stock reports and analytics', 'inventory', 5, true),
-- Procurement
('procurement', 'Procurement Management', 'Procurement and purchasing', NULL, 70, true),
('procurement.suppliers', 'Supplier Management', 'Manage suppliers', 'procurement', 1, true),
('procurement.pr', 'Purchase Requisitions', 'Purchase requisition management', 'procurement', 2, true),
('procurement.rfq', 'Request for Quotation', 'RFQ management', 'procurement', 3, true),
('procurement.po', 'Purchase Orders', 'LPO/LSO management', 'procurement', 4, true),
('procurement.grn', 'Goods Receipt', 'Goods receipt notes', 'procurement', 5, true),
('procurement.invoices', 'Supplier Invoices', 'Procurement invoice management', 'procurement', 6, true),
('procurement.reports', 'Procurement Reports', 'Procurement analytics', 'procurement', 7, true),
-- Library
('library', 'Library Management', 'Library book and member management', NULL, 80, true),
('library.catalog', 'Book Catalog', 'Manage book catalog', 'library', 1, true),
('library.members', 'Library Members', 'Manage library members', 'library', 2, true),
('library.circulation', 'Circulation', 'Book issuing and returns', 'library', 3, true),
('library.reservations', 'Book Reservations', 'Book reservation management', 'library', 4, true),
('library.fines', 'Library Fines', 'Fine management', 'library', 5, true),
('library.settings', 'Library Settings', 'Library configuration', 'library', 6, true),
('library.reports', 'Library Reports', 'Library analytics', 'library', 7, true)
ON CONFLICT (code) DO NOTHING;
