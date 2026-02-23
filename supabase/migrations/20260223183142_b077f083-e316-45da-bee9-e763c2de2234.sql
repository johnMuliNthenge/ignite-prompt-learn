
-- Map Assets: Cash & Cash Equivalents (11xx)
UPDATE chart_of_accounts SET group_id = (SELECT id FROM account_groups WHERE name = 'Cash and Cash Equivalents')
WHERE account_code IN ('1100','1101','1102','1103','1104','1105','1106','1107','1108');

-- Map Assets: Receivables (12xx)
UPDATE chart_of_accounts SET group_id = (SELECT id FROM account_groups WHERE name = 'Receivables')
WHERE account_code IN ('1200','1201','1202','1203','1204','1205','1206','1207','1208','1209','1210');

-- Map Assets: Inventories (13xx)
UPDATE chart_of_accounts SET group_id = (SELECT id FROM account_groups WHERE name = 'Inventories')
WHERE account_code IN ('1300','1301','1302','1303','1304','1305');

-- Map Assets: Fixed Assets (14xx)
UPDATE chart_of_accounts SET group_id = (SELECT id FROM account_groups WHERE name = 'Fixed Assets')
WHERE account_code IN ('1400','1401','1402','1403','1404','1405','1406','1407','1408','1409','1410');

-- Map Assets: Accumulated Depreciation (15xx)
UPDATE chart_of_accounts SET group_id = (SELECT id FROM account_groups WHERE name = 'Accumulated Depreciation')
WHERE account_code IN ('1500','1501','1502','1503','1504','1505');

-- Map old assets to Current Assets
UPDATE chart_of_accounts SET group_id = (SELECT id FROM account_groups WHERE name = 'Current Assets')
WHERE account_code IN ('300','3001') AND group_id IS NULL;

-- Map Liabilities: Payables (21xx)
UPDATE chart_of_accounts SET group_id = (SELECT id FROM account_groups WHERE name = 'Payables')
WHERE account_code IN ('2100','2101','2102','2103','2104','2105','2106');

-- Map Liabilities: Statutory (22xx)
UPDATE chart_of_accounts SET group_id = (SELECT id FROM account_groups WHERE name = 'Statutory Liabilities')
WHERE account_code IN ('2200','2201','2202','2203','2204','2205','2206','2207','2208');

-- Map Liabilities: Employee (23xx)
UPDATE chart_of_accounts SET group_id = (SELECT id FROM account_groups WHERE name = 'Employee Liabilities')
WHERE account_code IN ('2300','2301','2302','2303','2304','2305','2306','2307');

-- Map Liabilities: Capitation & Petty Cash Control
UPDATE chart_of_accounts SET group_id = (SELECT id FROM account_groups WHERE name = 'Current Liabilities')
WHERE account_code IN ('2400','2600');

-- Map Liabilities: Long-Term (25xx)
UPDATE chart_of_accounts SET group_id = (SELECT id FROM account_groups WHERE name = 'Long-Term Liabilities')
WHERE account_code IN ('2500','2501','2502');

-- Map old liabilities
UPDATE chart_of_accounts SET group_id = (SELECT id FROM account_groups WHERE name = 'Current Liabilities')
WHERE account_code IN ('2000','2001') AND group_id IS NULL;

-- Map Equity (3xxx)
UPDATE chart_of_accounts SET group_id = (SELECT id FROM account_groups WHERE name = 'Capital')
WHERE account_code IN ('3100','3101');
UPDATE chart_of_accounts SET group_id = (SELECT id FROM account_groups WHERE name = 'Reserves')
WHERE account_code IN ('3102','3103','3104','3105');

-- Map Income: Tuition (41xx)
UPDATE chart_of_accounts SET group_id = (SELECT id FROM account_groups WHERE name = 'Tuition Revenue')
WHERE account_code IN ('4100','4101','4102','4103');

-- Map Income: Other Fees (42xx)
UPDATE chart_of_accounts SET group_id = (SELECT id FROM account_groups WHERE name = 'Fee Revenue')
WHERE account_code IN ('4200','4201','4202','4203','4204','4205','4206','4207','4208','4209','4210','4211','4212','4213','4214');

-- Map Income: Grants (43xx)
UPDATE chart_of_accounts SET group_id = (SELECT id FROM account_groups WHERE name = 'Grants and Donations')
WHERE account_code IN ('4300','4301','4302','4303','4304');

-- Map Income: Other (44xx)
UPDATE chart_of_accounts SET group_id = (SELECT id FROM account_groups WHERE name = 'Other Income')
WHERE account_code IN ('4400','4401','4402','4403','4404','4405','4406','4407','4408','4409');

-- Map old income accounts to Revenue
UPDATE chart_of_accounts SET group_id = (SELECT id FROM account_groups WHERE name = 'Revenue')
WHERE account_code IN ('1000','1001','1002','1003','1004','1005') AND group_id IS NULL;

-- Map Expenses: Staff Costs (51xx)
UPDATE chart_of_accounts SET group_id = (SELECT id FROM account_groups WHERE name = 'Staff Costs')
WHERE account_code IN ('5100','5101','5102','5103','5104','5105','5106','5107','5108','5109','5110','5111','5112','5113','5114','5115','5116','5117','5118','5119','5120','5121','5122');

-- Map Expenses: Admin (52xx)
UPDATE chart_of_accounts SET group_id = (SELECT id FROM account_groups WHERE name = 'Administrative Expenses')
WHERE account_code IN ('5200','5201','5202','5203','5204','5205','5206','5207','5208','5209','5210','5211','5212','5213');

-- Map Expenses: Educational/Operating (53xx)
UPDATE chart_of_accounts SET group_id = (SELECT id FROM account_groups WHERE name = 'Operating Expenses')
WHERE account_code IN ('5300','5301','5302','5303','5304','5305','5306','5307','5308','5309');

-- Map Expenses: Premises (54xx) and Catering (55xx)
UPDATE chart_of_accounts SET group_id = (SELECT id FROM account_groups WHERE name = 'Operating Expenses')
WHERE account_code IN ('5400','5401','5402','5403','5404','5405','5406','5407','5408','5409','5410','5411','5500','5501','5502','5503','5504');

-- Map Expenses: Depreciation (56xx)
UPDATE chart_of_accounts SET group_id = (SELECT id FROM account_groups WHERE name = 'Depreciation')
WHERE account_code IN ('5600','5601','5602','5603','5604','5605');

-- Map Expenses: Financial Costs (57xx)
UPDATE chart_of_accounts SET group_id = (SELECT id FROM account_groups WHERE name = 'Financial Costs')
WHERE account_code IN ('5700','5701','5702','5703');

-- Map Expenses: Transport (58xx)
UPDATE chart_of_accounts SET group_id = (SELECT id FROM account_groups WHERE name = 'Operating Expenses')
WHERE account_code IN ('5800','5801','5802');
