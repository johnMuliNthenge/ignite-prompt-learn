
-- Insert inventory categories
INSERT INTO inventory_categories (name, description, is_active) VALUES
('Office Supplies', 'Pens, papers, staplers etc.', true),
('IT Equipment', 'Computers, printers, cables', true),
('Cleaning Supplies', 'Detergents, mops, brooms', true),
('Laboratory Equipment', 'Lab tools and chemicals', true);

-- Insert library categories
INSERT INTO library_categories (name, description, is_active) VALUES
('Fiction', 'Novels, short stories, literary fiction', true),
('Non-Fiction', 'Biographies, history, essays', true),
('Science & Technology', 'Physics, chemistry, engineering, IT', true),
('Reference', 'Dictionaries, encyclopedias, atlases', true),
('Periodicals', 'Journals, magazines, newspapers', true);

-- Insert inventory items
INSERT INTO inventory_items (item_code, name, description, category_id, unit_of_measure, min_stock_level, max_stock_level, reorder_level, item_type, cost_price, is_active)
SELECT 'ITM-00001', 'A4 Printing Paper', 'Standard A4 80gsm paper', id, 'Ream', 20, 500, 50, 'consumable', 450, true
FROM inventory_categories WHERE name = 'Office Supplies'
UNION ALL
SELECT 'ITM-00002', 'Ball Point Pens (Blue)', 'Box of 50 blue pens', id, 'Box', 10, 200, 30, 'consumable', 250, true
FROM inventory_categories WHERE name = 'Office Supplies'
UNION ALL
SELECT 'ITM-00003', 'HP LaserJet Toner', 'Compatible toner cartridge', id, 'Piece', 5, 50, 10, 'consumable', 3500, true
FROM inventory_categories WHERE name = 'IT Equipment'
UNION ALL
SELECT 'ITM-00004', 'USB Flash Drive 32GB', 'USB 3.0 flash drive', id, 'Piece', 10, 100, 20, 'consumable', 800, true
FROM inventory_categories WHERE name = 'IT Equipment'
UNION ALL
SELECT 'ITM-00005', 'Liquid Detergent 5L', 'All-purpose cleaning detergent', id, 'Piece', 5, 50, 10, 'consumable', 650, true
FROM inventory_categories WHERE name = 'Cleaning Supplies'
UNION ALL
SELECT 'ITM-00006', 'Desktop Computer', 'Core i5, 8GB RAM, 256GB SSD', id, 'Piece', 2, 20, 5, 'asset', 45000, true
FROM inventory_categories WHERE name = 'IT Equipment';

-- Add a second store
INSERT INTO inventory_stores (name, location, store_category, is_active) VALUES
('Science Lab Store', 'Block B, Room 102', 'department', true);

-- Insert initial stock for items in Main store
INSERT INTO store_stock (store_id, item_id, quantity)
SELECT s.id, i.id, 
  CASE i.item_code 
    WHEN 'ITM-00001' THEN 100
    WHEN 'ITM-00002' THEN 50
    WHEN 'ITM-00003' THEN 15
    WHEN 'ITM-00004' THEN 30
    WHEN 'ITM-00005' THEN 20
    WHEN 'ITM-00006' THEN 8
  END
FROM inventory_stores s, inventory_items i
WHERE s.name = 'Main' AND i.is_active = true;

-- Insert additional procurement suppliers (skip SUP-00001 which already exists)
INSERT INTO procurement_suppliers (supplier_code, name, contact_person, phone, email, address, payment_terms, supplier_category, status)
VALUES
('SUP-00002', 'TechHub Kenya', 'Grace Wanjiku', '+254723456789', 'grace@techhub.co.ke', 'P.O. Box 67890, Nairobi', 'Net 15', 'electronics', 'active'),
('SUP-00003', 'CleanPro Services', 'Peter Otieno', '+254734567890', 'peter@cleanpro.co.ke', 'P.O. Box 11111, Mombasa', 'Cash', 'cleaning', 'active');

-- Insert library books
INSERT INTO library_books (book_code, title, author, isbn, category_id, publisher, edition, publication_year, shelf_location, total_copies, available_copies, is_active)
SELECT 'BK-00001', 'Things Fall Apart', 'Chinua Achebe', '978-0385474542', id, 'Heinemann', '1st', 1958, 'A-01', 5, 5, true
FROM library_categories WHERE name = 'Fiction'
UNION ALL
SELECT 'BK-00002', 'Introduction to Algorithms', 'Thomas H. Cormen', '978-0262033848', id, 'MIT Press', '3rd', 2009, 'B-03', 3, 3, true
FROM library_categories WHERE name = 'Science & Technology'
UNION ALL
SELECT 'BK-00003', 'A Brief History of Time', 'Stephen Hawking', '978-0553380163', id, 'Bantam', '10th Anniversary', 1998, 'B-05', 4, 4, true
FROM library_categories WHERE name = 'Science & Technology'
UNION ALL
SELECT 'BK-00004', 'Long Walk to Freedom', 'Nelson Mandela', '978-0316548182', id, 'Back Bay Books', '1st', 1995, 'A-02', 3, 3, true
FROM library_categories WHERE name = 'Non-Fiction'
UNION ALL
SELECT 'BK-00005', 'Oxford English Dictionary', 'Oxford University Press', '978-0199571123', id, 'Oxford', '7th', 2012, 'C-01', 2, 2, true
FROM library_categories WHERE name = 'Reference'
UNION ALL
SELECT 'BK-00006', 'The River Between', 'Ngugi wa Thiongo', '978-0435905484', id, 'Heinemann', '1st', 1965, 'A-03', 6, 6, true
FROM library_categories WHERE name = 'Fiction';

-- Insert library settings
INSERT INTO library_settings (setting_key, setting_value, description) VALUES
('daily_fine_rate', '50', 'Daily fine rate in KES for overdue books'),
('max_borrow_days_student', '14', 'Maximum borrow days for students'),
('max_borrow_days_staff', '30', 'Maximum borrow days for staff'),
('max_books_student', '3', 'Maximum books a student can borrow'),
('max_books_staff', '5', 'Maximum books staff can borrow'),
('lost_book_fine_multiplier', '3', 'Multiplier of book cost for lost book fines')
ON CONFLICT DO NOTHING;
