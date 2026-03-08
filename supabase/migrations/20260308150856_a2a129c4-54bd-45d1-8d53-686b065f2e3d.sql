
-- Add all missing app_modules for comprehensive RBAC coverage
INSERT INTO public.app_modules (code, name, parent_code, description, sort_order, is_active)
VALUES
  -- Admin missing
  ('admin.departments', 'Departments', 'admin', 'Department management', 16, true),
  ('admin.setup', 'Setup', 'admin', 'System setup', 17, true),
  ('admin.setup.account', 'Account Setup', 'admin', 'Account setup', 18, true),
  ('admin.setup.tenants', 'Tenant Management', 'admin', 'Tenant management', 19, true),
  ('admin.smtp', 'SMTP Settings', 'admin', 'Email configuration', 20, true),
  ('admin.mpesa', 'M-Pesa Integration', 'admin', 'M-Pesa payment settings', 21, true),

  -- Finance missing sub-modules
  ('finance.fees_status', 'Student Fees Status', 'finance', 'Student fees overview', 30, true),
  ('finance.fee_statement', 'Fee Statement', 'finance', 'Summarized fee statement', 31, true),
  ('finance.student_finance', 'Student Finance', 'finance', 'Student finance management', 32, true),
  ('finance.student_invoice', 'Student Invoice', 'finance', 'Student invoice management', 33, true),
  ('finance.receivables', 'Receivables', 'finance', 'Accounts receivable', 34, true),
  ('finance.budget', 'Budget', 'finance', 'Budget management', 35, true),
  ('finance.cash_bank', 'Cash & Bank', 'finance', 'Cash and bank management', 36, true),
  ('finance.payables', 'Payables', 'finance', 'Accounts payable', 37, true),
  ('finance.cancellations', 'Cancellations', 'finance', 'Invoice cancellations', 38, true),
  ('finance.journal', 'Journal Entries', 'finance', 'General journal entries', 39, true),
  ('finance.setup', 'Finance Setup', 'finance', 'Finance configuration', 40, true),
  ('finance.utilities', 'Finance Utilities', 'finance', 'Finance utility settings', 41, true),
  ('finance.reports', 'Finance Reports', 'finance', 'Financial reports', 42, true),

  -- HR missing sub-modules
  ('hr.dashboard', 'HR Dashboard', 'hr', 'HR overview', 50, true),
  ('hr.employees', 'Employees', 'hr', 'Employee management', 51, true),
  ('hr.leave', 'Leave Management', 'hr', 'Leave management', 52, true),
  ('hr.attendance', 'Attendance', 'hr', 'Attendance tracking', 53, true),
  ('hr.performance', 'Performance', 'hr', 'Performance management', 54, true),
  ('hr.disciplinary', 'Disciplinary', 'hr', 'Disciplinary records', 55, true),
  ('hr.organization', 'Organization', 'hr', 'Organization structure', 56, true),
  ('hr.utilities', 'HR Utilities', 'hr', 'HR utility settings', 57, true),
  ('hr.reports', 'HR Reports', 'hr', 'HR reports', 58, true),

  -- Academics missing
  ('academics.subject_registration', 'Subject Registration', 'academics', 'Subject registration', 65, true),
  ('academics.marks_computation', 'Marks Computation', 'academics', 'Marks computation', 66, true),
  ('academics.poe_review', 'POE Review', 'academics', 'Portfolio of Evidence review', 67, true),

  -- Inventory missing
  ('inventory.categories', 'Inventory Categories', 'inventory', 'Category management', 75, true),

  -- Library missing
  ('library.categories', 'Library Categories', 'library', 'Category management', 85, true)
ON CONFLICT (code) DO NOTHING;
