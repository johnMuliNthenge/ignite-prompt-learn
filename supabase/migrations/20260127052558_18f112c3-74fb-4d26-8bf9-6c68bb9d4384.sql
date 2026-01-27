-- Add comprehensive module codes for RBAC system
-- This ensures all pages have corresponding module codes for permission checks

-- HR Module and sub-modules
INSERT INTO app_modules (code, name, description, parent_code, sort_order, is_active) VALUES
('hr', 'Human Resources', 'HR Management module', NULL, 20, true),
('hr.dashboard', 'HR Dashboard', 'HR overview dashboard', 'hr', 1, true),
('hr.employees', 'Employee Management', 'Manage employees', 'hr', 2, true),
('hr.leave', 'Leave Management', 'Manage leave applications', 'hr', 3, true),
('hr.attendance', 'Attendance', 'Manage attendance records', 'hr', 4, true),
('hr.performance', 'Performance', 'Performance management', 'hr', 5, true),
('hr.disciplinary', 'Disciplinary', 'Disciplinary records', 'hr', 6, true),
('hr.organization', 'Organization', 'Organization structure', 'hr', 7, true),
('hr.utilities', 'HR Utilities', 'HR configuration and utilities', 'hr', 8, true),
('hr.reports', 'HR Reports', 'HR reporting and analytics', 'hr', 9, true)
ON CONFLICT (code) DO NOTHING;

-- Finance sub-modules (extending existing)
INSERT INTO app_modules (code, name, description, parent_code, sort_order, is_active) VALUES
('finance.budget', 'Budget Management', 'Create and manage budgets', 'finance', 6, true),
('finance.cash_bank', 'Cash & Bank', 'Cash and bank management', 'finance', 7, true),
('finance.cancellations', 'Cancellations', 'Fee cancellation management', 'finance', 8, true),
('finance.fees_status', 'Student Fees Status', 'View student fee status', 'finance', 9, true),
('finance.fee_statement', 'Fee Statements', 'Summarized fee statements', 'finance', 10, true),
('finance.student_finance', 'Student Finance', 'Student finance overview', 'finance', 11, true)
ON CONFLICT (code) DO NOTHING;

-- Admin sub-modules
INSERT INTO app_modules (code, name, description, parent_code, sort_order, is_active) VALUES
('admin', 'Administration', 'System administration', NULL, 30, true),
('admin.categories', 'Category Management', 'Manage course categories', 'admin', 6, true),
('admin.settings', 'Site Settings', 'Site-wide configuration', 'admin', 7, true)
ON CONFLICT (code) DO NOTHING;

-- Ensure courses module exists
INSERT INTO app_modules (code, name, description, parent_code, sort_order, is_active) VALUES
('courses', 'Courses', 'Course management', NULL, 5, true),
('courses.create', 'Create Course', 'Create new courses', 'courses', 1, true),
('courses.edit', 'Edit Course', 'Edit existing courses', 'courses', 2, true)
ON CONFLICT (code) DO NOTHING;