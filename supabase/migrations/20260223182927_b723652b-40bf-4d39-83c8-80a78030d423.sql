
-- ============================================================
-- COMPREHENSIVE IPSAS-COMPLIANT CHART OF ACCOUNTS SEED
-- ============================================================

-- First add missing account groups
INSERT INTO account_groups (name, account_type, description) VALUES
  ('Cash and Cash Equivalents', 'Asset', 'Cash on hand and bank balances'),
  ('Receivables', 'Asset', 'Amounts owed to the institution'),
  ('Inventories', 'Asset', 'Stock and supplies'),
  ('Prepayments', 'Asset', 'Advance payments made'),
  ('Accumulated Depreciation', 'Asset', 'Contra-asset for depreciation'),
  ('Payables', 'Liability', 'Amounts owed to suppliers'),
  ('Statutory Liabilities', 'Liability', 'Tax and statutory obligations'),
  ('Deferred Revenue', 'Liability', 'Income received in advance'),
  ('Employee Liabilities', 'Liability', 'Amounts owed to employees'),
  ('Reserves', 'Equity', 'Retained earnings and reserves'),
  ('Tuition Revenue', 'Income', 'Student tuition fees'),
  ('Fee Revenue', 'Income', 'Other student fees'),
  ('Grants and Donations', 'Income', 'External funding'),
  ('Staff Costs', 'Expense', 'Salaries and employee costs'),
  ('Depreciation', 'Expense', 'Asset depreciation charges'),
  ('Financial Costs', 'Expense', 'Interest and bank charges'),
  ('Cost of Sales', 'Expense', 'Direct costs')
ON CONFLICT DO NOTHING;

-- ============================================================
-- ASSETS (1xxx)
-- ============================================================
INSERT INTO chart_of_accounts (account_code, account_name, account_type, normal_balance, is_system, is_active, description) VALUES
-- Cash & Cash Equivalents
('1100', 'Cash and Cash Equivalents', 'Asset', 'Debit', true, true, 'Parent: Cash and bank'),
('1101', 'Petty Cash', 'Asset', 'Debit', true, true, 'Petty cash float'),
('1102', 'Cash at Bank - Main Account', 'Asset', 'Debit', false, true, 'Primary operating bank account'),
('1103', 'Cash at Bank - Fees Collection', 'Asset', 'Debit', false, true, 'Dedicated fees collection account'),
('1104', 'Cash at Bank - Payroll Account', 'Asset', 'Debit', false, true, 'Dedicated payroll disbursement account'),
('1105', 'Cash at Bank - M-Pesa Float', 'Asset', 'Debit', false, true, 'Mobile money float'),
('1106', 'Cash at Bank - Savings Account', 'Asset', 'Debit', false, true, 'Institutional savings'),
('1107', 'Cash in Transit', 'Asset', 'Debit', false, true, 'Cash being transferred between accounts'),
('1108', 'Short-Term Deposits', 'Asset', 'Debit', false, true, 'Fixed deposits < 3 months'),

-- Receivables
('1200', 'Receivables', 'Asset', 'Debit', true, true, 'Parent: Amounts owed'),
('1201', 'Student Debtors (Fee Receivables)', 'Asset', 'Debit', true, true, 'Outstanding student fees'),
('1202', 'Staff Debtors', 'Asset', 'Debit', false, true, 'Amounts owed by staff'),
('1203', 'Salary Advance Debtors', 'Asset', 'Debit', true, true, 'Staff salary advances'),
('1204', 'Imprest Debtors', 'Asset', 'Debit', true, true, 'Outstanding imprest/advances'),
('1205', 'Other Debtors', 'Asset', 'Debit', false, true, 'Miscellaneous receivables'),
('1206', 'Grants Receivable', 'Asset', 'Debit', false, true, 'Government/donor grants due'),
('1207', 'Capitation Receivable', 'Asset', 'Debit', false, true, 'Government capitation due'),
('1208', 'Provision for Doubtful Debts', 'Asset', 'Credit', true, true, 'Allowance for bad debts (contra)'),
('1209', 'Supplier Prepayments', 'Asset', 'Debit', true, true, 'Advance payments to suppliers'),
('1210', 'Customer Prepayments Receivable', 'Asset', 'Debit', false, true, 'Deposits from non-student customers'),

-- Inventories
('1300', 'Inventories', 'Asset', 'Debit', true, true, 'Parent: Stock and supplies'),
('1301', 'Food Stores', 'Asset', 'Debit', false, true, 'Catering supplies'),
('1302', 'Stationery and Office Supplies', 'Asset', 'Debit', false, true, 'Office consumables'),
('1303', 'Laboratory Supplies', 'Asset', 'Debit', false, true, 'Lab materials and chemicals'),
('1304', 'Cleaning Supplies', 'Asset', 'Debit', false, true, 'Janitorial materials'),
('1305', 'Maintenance Supplies', 'Asset', 'Debit', false, true, 'Repair and maintenance stock'),

-- Fixed Assets
('1400', 'Property, Plant and Equipment', 'Asset', 'Debit', true, true, 'Parent: Fixed assets'),
('1401', 'Land', 'Asset', 'Debit', false, true, 'Land owned'),
('1402', 'Buildings', 'Asset', 'Debit', false, true, 'Permanent structures'),
('1403', 'Motor Vehicles', 'Asset', 'Debit', false, true, 'Transport vehicles'),
('1404', 'Furniture and Fittings', 'Asset', 'Debit', false, true, 'Office and classroom furniture'),
('1405', 'Computer Equipment', 'Asset', 'Debit', false, true, 'ICT equipment'),
('1406', 'Laboratory Equipment', 'Asset', 'Debit', false, true, 'Science lab equipment'),
('1407', 'Library Books', 'Asset', 'Debit', false, true, 'Library collection'),
('1408', 'Sports Equipment', 'Asset', 'Debit', false, true, 'Games and sports assets'),
('1409', 'Kitchen Equipment', 'Asset', 'Debit', false, true, 'Catering equipment'),
('1410', 'Work in Progress', 'Asset', 'Debit', false, true, 'Construction/projects in progress'),

-- Accumulated Depreciation (Contra-Assets)
('1500', 'Accumulated Depreciation', 'Asset', 'Credit', true, true, 'Parent: Depreciation contra'),
('1501', 'Accum. Depreciation - Buildings', 'Asset', 'Credit', false, true, 'Buildings depreciation'),
('1502', 'Accum. Depreciation - Motor Vehicles', 'Asset', 'Credit', false, true, 'Vehicle depreciation'),
('1503', 'Accum. Depreciation - Furniture', 'Asset', 'Credit', false, true, 'Furniture depreciation'),
('1504', 'Accum. Depreciation - Computers', 'Asset', 'Credit', false, true, 'ICT depreciation'),
('1505', 'Accum. Depreciation - Lab Equipment', 'Asset', 'Credit', false, true, 'Lab equipment depreciation'),

-- ============================================================
-- LIABILITIES (2xxx)
-- ============================================================
-- Current Liabilities
('2100', 'Accounts Payable', 'Liability', 'Credit', true, true, 'Parent: Trade creditors'),
('2101', 'Supplier Payables', 'Liability', 'Credit', true, true, 'Amounts owed to suppliers'),
('2102', 'Accrued Expenses', 'Liability', 'Credit', false, true, 'Expenses incurred not yet paid'),
('2103', 'Student Prepayments (Fees in Advance)', 'Liability', 'Credit', true, true, 'Student overpayments/advance fees'),
('2104', 'Caution Money Deposits', 'Liability', 'Credit', true, true, 'Refundable student deposits'),
('2105', 'Customer Prepayments', 'Liability', 'Credit', true, true, 'Non-student advance payments'),
('2106', 'Deferred Revenue', 'Liability', 'Credit', false, true, 'Income received for future periods'),

-- Statutory Liabilities
('2200', 'Statutory Liabilities', 'Liability', 'Credit', true, true, 'Parent: Tax and statutory'),
('2201', 'PAYE Payable', 'Liability', 'Credit', true, true, 'Pay As You Earn tax'),
('2202', 'NSSF Payable', 'Liability', 'Credit', true, true, 'National Social Security Fund'),
('2203', 'NHIF/SHIF Payable', 'Liability', 'Credit', true, true, 'Health insurance fund'),
('2204', 'Housing Levy Payable', 'Liability', 'Credit', true, true, 'Affordable Housing Levy'),
('2205', 'NITA Levy Payable', 'Liability', 'Credit', true, true, 'National Industrial Training Authority'),
('2206', 'VAT Payable', 'Liability', 'Credit', false, true, 'Value Added Tax output'),
('2207', 'Withholding Tax Payable', 'Liability', 'Credit', false, true, 'WHT on payments'),
('2208', 'Pension Fund Payable', 'Liability', 'Credit', false, true, 'Employer pension contributions'),

-- Employee Liabilities
('2300', 'Employee Liabilities', 'Liability', 'Credit', true, true, 'Parent: Staff obligations'),
('2301', 'Net Salaries Payable', 'Liability', 'Credit', true, true, 'Unpaid net salaries'),
('2302', 'Leave Pay Provision', 'Liability', 'Credit', false, true, 'Accrued leave liability'),
('2303', 'Gratuity Payable', 'Liability', 'Credit', false, true, 'End-of-contract gratuity'),
('2304', 'Staff Loan Deductions Payable', 'Liability', 'Credit', false, true, 'Loan repayments held'),
('2305', 'SACCO Deductions Payable', 'Liability', 'Credit', false, true, 'SACCO contributions withheld'),
('2306', 'Union Dues Payable', 'Liability', 'Credit', false, true, 'Trade union deductions'),
('2307', 'Insurance Deductions Payable', 'Liability', 'Credit', false, true, 'Group insurance deductions'),

-- Capitation & Grants Liability
('2400', 'Capitation GL Account', 'Liability', 'Credit', true, true, 'Government capitation control'),

-- Long-Term Liabilities
('2500', 'Long-Term Liabilities', 'Liability', 'Credit', true, true, 'Parent: Long-term obligations'),
('2501', 'Bank Loans', 'Liability', 'Credit', false, true, 'Long-term bank borrowings'),
('2502', 'Mortgage Payable', 'Liability', 'Credit', false, true, 'Property loans'),

-- Petty Cash Control
('2600', 'Petty Cash Control Account', 'Liability', 'Credit', true, true, 'Petty cash control/imprest'),

-- ============================================================
-- EQUITY (3xxx)
-- ============================================================
('3100', 'Opening Balance / Equity', 'Equity', 'Credit', true, true, 'Opening balance equity'),
('3101', 'Capital Fund', 'Equity', 'Credit', false, true, 'Initial capital contributions'),
('3102', 'Revenue Reserves', 'Equity', 'Credit', true, true, 'Accumulated surplus/deficit'),
('3103', 'Revaluation Reserve', 'Equity', 'Credit', false, true, 'Asset revaluation surplus'),
('3104', 'Development Fund', 'Equity', 'Credit', false, true, 'Earmarked development funds'),
('3105', 'Retained Surplus', 'Equity', 'Credit', false, true, 'Cumulative net surplus'),

-- ============================================================
-- REVENUE / INCOME (4xxx)
-- ============================================================
-- Tuition Revenue
('4100', 'Tuition Fees', 'Income', 'Credit', true, true, 'Parent: Core tuition income'),
('4101', 'Regular Tuition Fees', 'Income', 'Credit', false, true, 'Standard programme fees'),
('4102', 'Part-Time Tuition Fees', 'Income', 'Credit', false, true, 'Evening/weekend classes'),
('4103', 'Short Course Fees', 'Income', 'Credit', false, true, 'Certificate/short courses'),

-- Other Fee Revenue
('4200', 'Other Fee Income', 'Income', 'Credit', true, true, 'Parent: Non-tuition fees'),
('4201', 'Registration Fees', 'Income', 'Credit', false, true, 'New student registration'),
('4202', 'Examination Fees', 'Income', 'Credit', false, true, 'Exam administration fees'),
('4203', 'Library Fees', 'Income', 'Credit', false, true, 'Library membership/fines'),
('4204', 'Laboratory Fees', 'Income', 'Credit', false, true, 'Lab usage charges'),
('4205', 'Student ID Card Fees', 'Income', 'Credit', false, true, 'ID card issuance'),
('4206', 'Accommodation / Boarding Fees', 'Income', 'Credit', true, true, 'Hostel/boarding fees'),
('4207', 'Transport Fees', 'Income', 'Credit', true, true, 'Student transport charges'),
('4208', 'Meals / Catering Fees', 'Income', 'Credit', false, true, 'Feeding program income'),
('4209', 'Activity / Co-curricular Fees', 'Income', 'Credit', false, true, 'Sports, clubs, events'),
('4210', 'Graduation Fees', 'Income', 'Credit', false, true, 'Graduation ceremony charges'),
('4211', 'Transcript Fees', 'Income', 'Credit', false, true, 'Academic transcript issuance'),
('4212', 'Medical Fees', 'Income', 'Credit', false, true, 'Student medical levy'),
('4213', 'Computer Lab Fees', 'Income', 'Credit', false, true, 'ICT lab usage fees'),
('4214', 'Development Levy', 'Income', 'Credit', false, true, 'Infrastructure development fee'),

-- Grants & Funding
('4300', 'Government Grants', 'Income', 'Credit', true, true, 'Parent: Government funding'),
('4301', 'Capitation Grants', 'Income', 'Credit', false, true, 'Per-student government funding'),
('4302', 'HELB Disbursements', 'Income', 'Credit', false, true, 'Higher Education Loans Board'),
('4303', 'Bursary Allocations', 'Income', 'Credit', false, true, 'Bursary funds received'),
('4304', 'CDF Grants', 'Income', 'Credit', false, true, 'Constituency Development Fund'),

-- Other Income
('4400', 'Other Income', 'Income', 'Credit', true, true, 'Parent: Miscellaneous income'),
('4401', 'Rental Income', 'Income', 'Credit', false, true, 'Facility rental'),
('4402', 'Interest Income', 'Income', 'Credit', false, true, 'Bank interest earned'),
('4403', 'Donations Received', 'Income', 'Credit', false, true, 'Cash/in-kind donations'),
('4404', 'Sale of Farm Produce', 'Income', 'Credit', false, true, 'Agricultural income'),
('4405', 'Consultancy Income', 'Income', 'Credit', false, true, 'Professional services'),
('4406', 'Hire of Facilities', 'Income', 'Credit', false, true, 'Hall/field hire income'),
('4407', 'Tender Document Sales', 'Income', 'Credit', false, true, 'Procurement document fees'),
('4408', 'Insurance Claim Receipts', 'Income', 'Credit', false, true, 'Insurance reimbursements'),
('4409', 'Sundry Income', 'Income', 'Credit', false, true, 'Other miscellaneous income'),

-- ============================================================
-- EXPENSES (5xxx)
-- ============================================================
-- Staff Costs (Payroll)
('5100', 'Staff Costs', 'Expense', 'Debit', true, true, 'Parent: All personnel costs'),
('5101', 'Basic Salaries - Teaching Staff', 'Expense', 'Debit', true, true, 'Teaching staff gross pay'),
('5102', 'Basic Salaries - Non-Teaching Staff', 'Expense', 'Debit', true, true, 'Support staff gross pay'),
('5103', 'Basic Salaries - Management', 'Expense', 'Debit', false, true, 'Management salaries'),
('5104', 'House Allowance', 'Expense', 'Debit', true, true, 'Staff housing allowance'),
('5105', 'Transport Allowance', 'Expense', 'Debit', true, true, 'Staff transport allowance'),
('5106', 'Leave Allowance', 'Expense', 'Debit', false, true, 'Annual leave pay'),
('5107', 'Acting Allowance', 'Expense', 'Debit', false, true, 'Acting capacity pay'),
('5108', 'Overtime Pay', 'Expense', 'Debit', true, true, 'Overtime payments'),
('5109', 'Employer NSSF Contribution', 'Expense', 'Debit', true, true, 'Employer NSSF share'),
('5110', 'Employer NHIF/SHIF Contribution', 'Expense', 'Debit', true, true, 'Employer health insurance'),
('5111', 'Employer Housing Levy', 'Expense', 'Debit', true, true, 'Employer housing levy share'),
('5112', 'Employer Pension Contribution', 'Expense', 'Debit', false, true, 'Employer pension share'),
('5113', 'Staff Gratuity Expense', 'Expense', 'Debit', false, true, 'Contract gratuity provision'),
('5114', 'Staff Medical Expense', 'Expense', 'Debit', false, true, 'Group medical cover'),
('5115', 'Staff Group Insurance', 'Expense', 'Debit', false, true, 'WIBA/GPA insurance'),
('5116', 'NITA Levy Expense', 'Expense', 'Debit', true, true, 'Training levy expense'),
('5117', 'Staff Welfare', 'Expense', 'Debit', false, true, 'Staff welfare and teambuilding'),
('5118', 'Staff Training and Development', 'Expense', 'Debit', false, true, 'CPD and training costs'),
('5119', 'Casual Labour', 'Expense', 'Debit', true, true, 'Casual/temporary workers'),
('5120', 'Non-Cash Benefits Expense', 'Expense', 'Debit', true, true, 'Benefits in kind (BIK)'),
('5121', 'Commission / Bonus', 'Expense', 'Debit', false, true, 'Performance bonuses'),
('5122', 'Responsibility Allowance', 'Expense', 'Debit', false, true, 'HOD/Dean allowances'),

-- Administrative Expenses
('5200', 'Administrative Expenses', 'Expense', 'Debit', true, true, 'Parent: Admin costs'),
('5201', 'Office Supplies and Stationery', 'Expense', 'Debit', false, true, 'Office consumables'),
('5202', 'Printing and Photocopying', 'Expense', 'Debit', false, true, 'Print services'),
('5203', 'Telephone and Internet', 'Expense', 'Debit', false, true, 'Communication costs'),
('5204', 'Postage and Courier', 'Expense', 'Debit', false, true, 'Mail and delivery'),
('5205', 'Board/Council Expenses', 'Expense', 'Debit', false, true, 'Governance meetings'),
('5206', 'Legal and Professional Fees', 'Expense', 'Debit', false, true, 'Legal and audit fees'),
('5207', 'Audit Fees', 'Expense', 'Debit', false, true, 'External audit costs'),
('5208', 'Licenses and Subscriptions', 'Expense', 'Debit', false, true, 'Software and regulatory licenses'),
('5209', 'Travel and Accommodation', 'Expense', 'Debit', false, true, 'Staff travel expenses'),
('5210', 'Insurance Premiums', 'Expense', 'Debit', false, true, 'Property/liability insurance'),
('5211', 'Advertising and Marketing', 'Expense', 'Debit', false, true, 'Recruitment ads and marketing'),
('5212', 'Bank Charges', 'Expense', 'Debit', false, true, 'Transaction and ledger fees'),
('5213', 'Recruitment Expenses', 'Expense', 'Debit', false, true, 'Hiring costs'),

-- Operating / Educational Expenses
('5300', 'Educational and Operating Expenses', 'Expense', 'Debit', true, true, 'Parent: Core operations'),
('5301', 'Teaching Materials', 'Expense', 'Debit', false, true, 'Textbooks and learning aids'),
('5302', 'Laboratory Supplies Expense', 'Expense', 'Debit', false, true, 'Lab consumables'),
('5303', 'Examination Expenses', 'Expense', 'Debit', false, true, 'Internal/external exam costs'),
('5304', 'Library Books and Journals', 'Expense', 'Debit', false, true, 'Library acquisitions'),
('5305', 'Sports and Co-curricular', 'Expense', 'Debit', false, true, 'Sports and activities'),
('5306', 'Student Welfare', 'Expense', 'Debit', false, true, 'Guidance, counseling'),
('5307', 'Graduation Expenses', 'Expense', 'Debit', false, true, 'Ceremony costs'),
('5308', 'Industrial Attachment', 'Expense', 'Debit', false, true, 'Internship coordination'),
('5309', 'Field Trip Expenses', 'Expense', 'Debit', false, true, 'Educational excursions'),

-- Premises & Utilities
('5400', 'Premises and Utilities', 'Expense', 'Debit', true, true, 'Parent: Facility costs'),
('5401', 'Electricity', 'Expense', 'Debit', false, true, 'Power bills'),
('5402', 'Water and Sewerage', 'Expense', 'Debit', false, true, 'Water utility'),
('5403', 'Rent and Rates', 'Expense', 'Debit', false, true, 'Property rental'),
('5404', 'Repairs and Maintenance - Buildings', 'Expense', 'Debit', false, true, 'Building maintenance'),
('5405', 'Repairs and Maintenance - Equipment', 'Expense', 'Debit', false, true, 'Equipment servicing'),
('5406', 'Repairs and Maintenance - Vehicles', 'Expense', 'Debit', false, true, 'Vehicle maintenance'),
('5407', 'Fuel and Lubricants', 'Expense', 'Debit', false, true, 'Vehicle fuel'),
('5408', 'Security Services', 'Expense', 'Debit', false, true, 'Guard services'),
('5409', 'Cleaning Services', 'Expense', 'Debit', false, true, 'Janitorial contract'),
('5410', 'Grounds Maintenance', 'Expense', 'Debit', false, true, 'Landscaping and compound'),
('5411', 'Waste Disposal', 'Expense', 'Debit', false, true, 'Garbage collection'),

-- Catering / Boarding
('5500', 'Catering and Boarding Expenses', 'Expense', 'Debit', true, true, 'Parent: Feeding costs'),
('5501', 'Food Purchases', 'Expense', 'Debit', false, true, 'Raw food materials'),
('5502', 'Cooking Gas / Fuel', 'Expense', 'Debit', false, true, 'Kitchen fuel'),
('5503', 'Kitchen Supplies', 'Expense', 'Debit', false, true, 'Utensils and consumables'),
('5504', 'Dormitory Supplies', 'Expense', 'Debit', false, true, 'Bedding and supplies'),

-- Depreciation
('5600', 'Depreciation Expense', 'Expense', 'Debit', true, true, 'Parent: Depreciation'),
('5601', 'Depreciation - Buildings', 'Expense', 'Debit', false, true, 'Building depreciation'),
('5602', 'Depreciation - Motor Vehicles', 'Expense', 'Debit', false, true, 'Vehicle depreciation'),
('5603', 'Depreciation - Furniture', 'Expense', 'Debit', false, true, 'Furniture depreciation'),
('5604', 'Depreciation - Computer Equipment', 'Expense', 'Debit', false, true, 'ICT depreciation'),
('5605', 'Depreciation - Lab Equipment', 'Expense', 'Debit', false, true, 'Lab depreciation'),

-- Financial Costs
('5700', 'Financial Costs', 'Expense', 'Debit', true, true, 'Parent: Finance charges'),
('5701', 'Interest on Loans', 'Expense', 'Debit', false, true, 'Loan interest expense'),
('5702', 'Bad Debts Written Off', 'Expense', 'Debit', false, true, 'Irrecoverable fees'),
('5703', 'Foreign Exchange Loss', 'Expense', 'Debit', false, true, 'Currency translation losses'),

-- Transport Expenses
('5800', 'Transport Expenses', 'Expense', 'Debit', true, true, 'Parent: Transport operations'),
('5801', 'Student Transport Costs', 'Expense', 'Debit', false, true, 'School bus operations'),
('5802', 'Vehicle Insurance', 'Expense', 'Debit', false, true, 'Motor vehicle insurance')

ON CONFLICT (account_code) DO NOTHING;

-- ============================================================
-- PAYROLL PAY ACCOUNTS (mapping payroll items to GL)
-- ============================================================
-- These will be linked to GL accounts after insertion

INSERT INTO payroll_pay_accounts (name, account_type, description, is_active) VALUES
-- Earnings
('Basic Salary - Teaching', 'expense', 'Maps to GL 5101 - Teaching staff salaries', true),
('Basic Salary - Non-Teaching', 'expense', 'Maps to GL 5102 - Support staff salaries', true),
('Basic Salary - Management', 'expense', 'Maps to GL 5103 - Management salaries', true),
('House Allowance', 'expense', 'Maps to GL 5104 - Housing allowance', true),
('Transport Allowance', 'expense', 'Maps to GL 5105 - Transport allowance', true),
('Leave Allowance', 'expense', 'Maps to GL 5106 - Leave pay', true),
('Acting Allowance', 'expense', 'Maps to GL 5107 - Acting capacity', true),
('Overtime', 'expense', 'Maps to GL 5108 - Overtime payments', true),
('Responsibility Allowance', 'expense', 'Maps to GL 5122 - HOD allowances', true),
('Commission / Bonus', 'expense', 'Maps to GL 5121 - Performance bonuses', true),
('Casual Labour', 'expense', 'Maps to GL 5119 - Casual wages', true),
('Non-Cash Benefits', 'expense', 'Maps to GL 5120 - Benefits in kind', true),

-- Statutory Deductions (Liability)
('PAYE', 'liability', 'Maps to GL 2201 - Pay As You Earn tax', true),
('NSSF Employee', 'liability', 'Maps to GL 2202 - Employee NSSF contribution', true),
('NSSF Employer', 'expense', 'Maps to GL 5109 - Employer NSSF contribution', true),
('NHIF/SHIF Employee', 'liability', 'Maps to GL 2203 - Employee health insurance', true),
('NHIF/SHIF Employer', 'expense', 'Maps to GL 5110 - Employer health insurance', true),
('Housing Levy Employee', 'liability', 'Maps to GL 2204 - Employee housing levy', true),
('Housing Levy Employer', 'expense', 'Maps to GL 5111 - Employer housing levy', true),
('NITA Levy', 'expense', 'Maps to GL 5116 - Training levy', true),
('Pension Fund Employee', 'liability', 'Maps to GL 2208 - Employee pension', true),
('Pension Fund Employer', 'expense', 'Maps to GL 5112 - Employer pension', true),

-- Voluntary Deductions (Liability)
('Staff Loan Deduction', 'liability', 'Maps to GL 2304 - Loan repayments', true),
('SACCO Deduction', 'liability', 'Maps to GL 2305 - SACCO contributions', true),
('Union Dues', 'liability', 'Maps to GL 2306 - Trade union fees', true),
('Insurance Deduction', 'liability', 'Maps to GL 2307 - Group insurance', true),

-- Net Pay
('Net Salaries Payable', 'liability', 'Maps to GL 2301 - Net pay control', true),

-- Employer Costs
('Staff Medical Cover', 'expense', 'Maps to GL 5114 - Medical scheme', true),
('Group Life/WIBA Insurance', 'expense', 'Maps to GL 5115 - Staff insurance', true),
('Staff Gratuity', 'expense', 'Maps to GL 5113 - End-of-service gratuity', true),
('Staff Training', 'expense', 'Maps to GL 5118 - CPD and training', true),
('Staff Welfare Expense', 'expense', 'Maps to GL 5117 - Welfare fund', true)

ON CONFLICT DO NOTHING;
