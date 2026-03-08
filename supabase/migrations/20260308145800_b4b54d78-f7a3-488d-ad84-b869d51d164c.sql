
-- Step 1: Salary structure
INSERT INTO salary_structures (id, name, description, is_active)
VALUES ('a1b2c3d4-0001-4000-8000-000000000001', 'Standard Salary Structure', 'Default structure with house and transport allowances', true);

-- Step 2: Salary components
INSERT INTO salary_components (structure_id, name, component_type, category, calculation_type, default_amount, percentage_of, is_taxable, sort_order)
VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'House Allowance', 'earning', 'allowance', 'percentage', 15, 'Basic Pay', true, 1),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Transport Allowance', 'earning', 'allowance', 'fixed', 5000, null, true, 2),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Responsibility Allowance', 'earning', 'allowance', 'fixed', 3000, null, true, 3);

-- Step 3: Statutory deduction configs
INSERT INTO statutory_deduction_configs (id, name, deduction_type, is_active, account_id)
VALUES
  ('a1b2c3d4-0003-4000-8000-000000000001', 'PAYE', 'tax', true, 'a5ecb9d3-b6df-456a-aea4-8f628bfa17cd'),
  ('a1b2c3d4-0003-4000-8000-000000000002', 'NSSF Employee', 'pension', true, 'c6aa30d5-b512-49fe-942c-08aa87cbc281'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'SHIF', 'health_insurance', true, '510fde86-1c48-4109-a0a2-8d54fa914e0c'),
  ('a1b2c3d4-0003-4000-8000-000000000004', 'Housing Levy', 'social_security', true, '717164a7-c1cb-44a5-bce2-9d6aa84276ad');

-- Step 4: Tax bands
INSERT INTO payroll_tax_bands (statutory_config_id, lower_limit, upper_limit, rate, fixed_amount, sort_order)
VALUES
  ('a1b2c3d4-0003-4000-8000-000000000001', 0, 24000, 0.10, 0, 1),
  ('a1b2c3d4-0003-4000-8000-000000000001', 24001, 32333, 0.25, 0, 2),
  ('a1b2c3d4-0003-4000-8000-000000000001', 32334, 500000, 0.30, 0, 3),
  ('a1b2c3d4-0003-4000-8000-000000000001', 500001, 800000, 0.325, 0, 4),
  ('a1b2c3d4-0003-4000-8000-000000000001', 800001, null, 0.35, 0, 5),
  ('a1b2c3d4-0003-4000-8000-000000000002', 0, null, 0.06, 0, 1),
  ('a1b2c3d4-0003-4000-8000-000000000003', 0, null, 0.0275, 0, 1),
  ('a1b2c3d4-0003-4000-8000-000000000004', 0, null, 0.015, 0, 1);

-- Step 5: Employee payroll accounts
INSERT INTO employee_payroll_accounts (employee_id, salary_structure_id, basic_salary, is_active, pay_grade_id, processing_method, disbursement_mode_id, employee_status_id, tax_number, bank_name, bank_branch, bank_account_number, effective_date)
VALUES 
  ('61e5b23e-fe7c-4806-b231-328033ac12b1', 'a1b2c3d4-0001-4000-8000-000000000001', 85000, true, 'bf9ee05f-9dcb-49da-a028-82ede1bd5dd5', 'normal', 'f60bed4f-605a-4d8b-a7b8-4b71dbf89ce0', '892ca601-74a4-44df-9c7b-e19064e8074d', 'A001234567X', 'KCB Bank', 'Nairobi Branch', '1234567890', '2026-01-01'),
  ('60743514-8b30-4048-a773-ff7087c8c13a', 'a1b2c3d4-0001-4000-8000-000000000001', 65000, true, 'bf9ee05f-9dcb-49da-a028-82ede1bd5dd5', 'normal', 'f60bed4f-605a-4d8b-a7b8-4b71dbf89ce0', '892ca601-74a4-44df-9c7b-e19064e8074d', 'A002345678Y', 'Equity Bank', 'Mombasa Branch', '2345678901', '2026-01-01'),
  ('c028332f-0954-4177-a6b4-7bffb7a042bf', 'a1b2c3d4-0001-4000-8000-000000000001', 95000, true, 'bf9ee05f-9dcb-49da-a028-82ede1bd5dd5', 'normal', 'f60bed4f-605a-4d8b-a7b8-4b71dbf89ce0', '892ca601-74a4-44df-9c7b-e19064e8074d', 'A004567890W', 'NCBA Bank', 'CBD Branch', '4567890123', '2026-01-01')
ON CONFLICT (employee_id) DO UPDATE SET basic_salary = EXCLUDED.basic_salary, salary_structure_id = EXCLUDED.salary_structure_id, bank_name = EXCLUDED.bank_name, bank_branch = EXCLUDED.bank_branch, bank_account_number = EXCLUDED.bank_account_number, tax_number = EXCLUDED.tax_number;

-- Update Jane's account
UPDATE employee_payroll_accounts 
SET basic_salary = 120000, salary_structure_id = 'a1b2c3d4-0001-4000-8000-000000000001', bank_name = 'Cooperative Bank', bank_branch = 'Westlands', bank_account_number = '3456789012', tax_number = 'A003456789Z'
WHERE employee_id = '6e8f9697-c627-4089-9d01-ff815e021d41';

-- Step 6: March 2026 payroll period
INSERT INTO payroll_periods (id, name, period_start, period_end, processing_deadline, payment_date, status, fiscal_year_id)
VALUES ('a1b2c3d4-0005-4000-8000-000000000001', 'March 2026', '2026-03-01', '2026-03-31', '2026-03-25', '2026-03-28', 'open', '859607f3-87d3-4783-8835-4b277b3ebb70');

-- Step 7: Update payroll settings
UPDATE payroll_settings SET
  salary_expense_account_id = '7d587e0d-358e-4427-b66c-c4d93f94acd0',
  payroll_liability_account_id = 'c7daa2f4-3ec8-4ba5-b2d4-7915d35b869f',
  paye_account_id = 'a5ecb9d3-b6df-456a-aea4-8f628bfa17cd',
  shif_account_id = '510fde86-1c48-4109-a0a2-8d54fa914e0c',
  nssf_account_id = 'c6aa30d5-b512-49fe-942c-08aa87cbc281',
  nhlf_account_id = '717164a7-c1cb-44a5-bce2-9d6aa84276ad',
  net_pay_account_id = 'c7daa2f4-3ec8-4ba5-b2d4-7915d35b869f',
  basic_salary_account_id = 'ce64d64b-50b4-47ac-b8ea-220faf8d5916',
  auto_finance_posting = true;

-- Step 8: Employee loan deduction for Jane
INSERT INTO employee_deductions (employee_id, name, deduction_type, total_amount, monthly_amount, amount_recovered, balance, start_date, is_active)
VALUES ('6e8f9697-c627-4089-9d01-ff815e021d41', 'Staff Loan', 'loan', 100000, 10000, 0, 100000, '2026-01-01', true);
