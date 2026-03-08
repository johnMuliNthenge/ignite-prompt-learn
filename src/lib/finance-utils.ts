/**
 * Shared IPSAS Accrual Finance Utilities
 * 
 * Single source of truth for building synthetic double-entry balances
 * from source documents (invoices, payments, vouchers).
 * Used by: Trial Balance, General Ledger, P&L, Financial Position, Financial Performance
 */
import { supabase } from '@/integrations/supabase/client';

export interface AccountInfo {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  normal_balance: string;
  group_name?: string;
}

export interface SyntheticTransaction {
  id: string;
  date: string;
  reference: string;
  narration: string;
  lines: {
    account_code: string;
    account_name: string;
    account_id: string;
    debit: number;
    credit: number;
  }[];
}

export interface FinanceDataSources {
  accounts: AccountInfo[];
  accountMap: Map<string, { code: string; name: string; type: string }>;
  feeAccToCoaMap: Map<string, string>;
  paymentModeMap: Map<string, string | null>; // payment_mode_id → asset_account_id
  studentMap: Map<string, string>;
  invoices: any[];
  payments: any[];
  vouchers: any[];
  glEntries: any[];
  payrollRuns: any[];
  debtorsId: string;
  debtorsCode: string;
  debtorsName: string;
  cashBankId: string;
  cashBankCode: string;
  cashBankName: string;
  feeIncomeId: string;
  feeIncomeCode: string;
  feeIncomeName: string;
  expenseId: string;
  expenseCode: string;
  expenseName: string;
  prepayAccId: string;
}

/**
 * Fetch all finance data sources needed for reporting.
 * All reports should use this to ensure consistency.
 */
export async function fetchFinanceDataSources(options?: {
  includeStudents?: boolean;
  includeGroups?: boolean;
  dateFilter?: { startDate?: string; endDate?: string };
}): Promise<FinanceDataSources> {
  const { includeStudents = false, includeGroups = false, dateFilter } = options || {};

  const accountSelect = includeGroups
    ? 'id, account_code, account_name, account_type, normal_balance, account_groups(name)'
    : 'id, account_code, account_name, account_type, normal_balance';

  // Build queries with optional date filters
  let invoicesQuery = supabase.from('fee_invoices').select(
    'id, invoice_number, invoice_date, total_amount, student_id, status, fee_invoice_items(description, total, fee_account_id)'
  );
  if (dateFilter?.endDate) invoicesQuery = invoicesQuery.lte('invoice_date', dateFilter.endDate);
  if (dateFilter?.startDate) invoicesQuery = invoicesQuery.gte('invoice_date', dateFilter.startDate);

  let paymentsQuery = supabase.from('fee_payments').select('id, receipt_number, payment_date, amount, student_id, payment_mode_id');
  if (dateFilter?.endDate) paymentsQuery = paymentsQuery.lte('payment_date', dateFilter.endDate);
  if (dateFilter?.startDate) paymentsQuery = paymentsQuery.gte('payment_date', dateFilter.startDate);

  let vouchersQuery = supabase.from('payment_vouchers')
    .select('id, voucher_number, voucher_date, amount, vendor_name, status, description')
    .neq('status', 'Draft');
  if (dateFilter?.endDate) vouchersQuery = vouchersQuery.lte('voucher_date', dateFilter.endDate);
  if (dateFilter?.startDate) vouchersQuery = vouchersQuery.gte('voucher_date', dateFilter.startDate);

  let glQuery = supabase.from('general_ledger').select(
    'id, transaction_date, description, debit, credit, account_id, journal_entry_id, journal_entries:journal_entry_id(entry_number, narration)'
  ).limit(1000);
  if (dateFilter?.endDate) glQuery = glQuery.lte('transaction_date', dateFilter.endDate);
  if (dateFilter?.startDate) glQuery = glQuery.gte('transaction_date', dateFilter.startDate);

  const baseQueries = [
    supabase.from('chart_of_accounts').select(accountSelect).eq('is_active', true).order('account_code') as any,
    invoicesQuery.order('invoice_date', { ascending: false }) as any,
    paymentsQuery.order('payment_date', { ascending: false }) as any,
    vouchersQuery.order('voucher_date', { ascending: false }) as any,
    supabase.from('fee_accounts').select('id, account_id') as any,
    supabase.from('payment_modes').select('id, name, asset_account_id') as any,
    glQuery.order('transaction_date', { ascending: false }) as any,
  ];

  // Payroll runs (finalized only — these already have GL entries, but we need them for synthetic fallback)
  let payrollQuery = supabase.from('payroll_runs')
    .select('id, status, total_gross, total_deductions, total_net, employee_count, finalized_at, journal_entry_id, payroll_periods(name, period_start, period_end), payroll_items(id, employee_id, gross_pay, paye, nssf, shif, housing_levy, total_deductions, net_pay, employer_contributions, hr_employees(first_name, last_name))')
    .eq('status', 'finalized');
  if (dateFilter?.endDate) payrollQuery = payrollQuery.lte('finalized_at', dateFilter.endDate + 'T23:59:59');
  if (dateFilter?.startDate) payrollQuery = payrollQuery.gte('finalized_at', dateFilter.startDate + 'T00:00:00');
  baseQueries.push(payrollQuery.order('finalized_at', { ascending: false }) as any);

  if (includeStudents) {
    baseQueries.push(supabase.from('students').select('id, other_name, surname') as any);
  }

  const results = await Promise.all(baseQueries);
  const [accountsRes, invoicesRes, paymentsRes, vouchersRes, feeAccountsRes, paymentModesRes, glRes, payrollRunsRes] = results;
  const studentsRes = includeStudents ? results[8] : { data: [] };

  if (accountsRes.error) throw accountsRes.error;

  const accounts: AccountInfo[] = (accountsRes.data || []).map((a: any) => ({
    id: a.id,
    account_code: a.account_code,
    account_name: a.account_name,
    account_type: a.account_type,
    normal_balance: a.normal_balance || 'Debit',
    group_name: a.account_groups?.name || 'Other',
  }));

  const accountMap = new Map<string, { code: string; name: string; type: string }>();
  accounts.forEach(a => accountMap.set(a.id, { code: a.account_code, name: a.account_name, type: a.account_type }));

  const feeAccToCoaMap = new Map<string, string>();
  (feeAccountsRes.data || []).forEach((fa: any) => {
    if (fa.account_id) feeAccToCoaMap.set(fa.id, fa.account_id);
  });

  const paymentModeMap = new Map<string, string | null>();
  (paymentModesRes.data || []).forEach((pm: any) => {
    paymentModeMap.set(pm.id, pm.asset_account_id);
  });

  const studentMap = new Map<string, string>();
  (studentsRes.data || []).forEach((s: any) => {
    studentMap.set(s.id, `${s.other_name || ''} ${s.surname || ''}`.trim());
  });

  // Find key accounts by IPSAS code
  const findAcc = (code: string) => accounts.find(a => a.account_code === code);
  const debtorsAcc = findAcc('1201');
  const cashBankAcc = findAcc('1102') || accounts.find(a => a.account_type === 'Asset' && a.account_name?.toLowerCase().includes('cash at bank'));
  const feeIncomeAcc = accounts.find(a => a.account_type === 'Income' && (a.account_name?.toLowerCase().includes('fee') || a.account_code?.startsWith('4')));
  const expenseAcc = accounts.find(a => a.account_type === 'Expense' && a.account_code?.startsWith('5'));
  const prepayAcc = findAcc('2103');

  return {
    accounts,
    accountMap,
    feeAccToCoaMap,
    paymentModeMap,
    studentMap,
    invoices: invoicesRes.data || [],
    payments: paymentsRes.data || [],
    vouchers: vouchersRes.data || [],
    glEntries: glRes.data || [],
    payrollRuns: payrollRunsRes.data || [],
    debtorsId: debtorsAcc?.id || '',
    debtorsCode: debtorsAcc?.account_code || '1201',
    debtorsName: debtorsAcc?.account_name || 'Student Debtors',
    cashBankId: cashBankAcc?.id || '',
    cashBankCode: cashBankAcc?.account_code || '1102',
    cashBankName: cashBankAcc?.account_name || 'Cash at Bank',
    feeIncomeId: feeIncomeAcc?.id || '',
    feeIncomeCode: feeIncomeAcc?.account_code || '4100',
    feeIncomeName: feeIncomeAcc?.account_name || 'Fee Income',
    expenseId: expenseAcc?.id || '',
    expenseCode: expenseAcc?.account_code || '5000',
    expenseName: expenseAcc?.account_name || 'Expenses',
    prepayAccId: prepayAcc?.id || '',
  };
}

/**
 * Build synthetic double-entry transactions from source documents.
 * This is the SINGLE source of truth for all reports.
 * 
 * IPSAS Accrual Rules:
 * - Fee Invoice: Dr Debtors (1201) / Cr Income (per vote head or fallback 4xxx)
 * - Fee Payment: Dr Cash/Bank (per payment mode asset account) / Cr Debtors (1201)
 * - Payment Voucher (non-Draft): Dr Expense (5xxx) / Cr Cash/Bank (1102)
 */
export function buildSyntheticTransactions(data: FinanceDataSources): SyntheticTransaction[] {
  const txns: SyntheticTransaction[] = [];

  // 1. Fee Invoices → Dr Debtors, Cr Income
  data.invoices.forEach((inv: any) => {
    const studentName = data.studentMap.get(inv.student_id) || 'Student';
    const items = inv.fee_invoice_items || [];
    const lines: SyntheticTransaction['lines'] = [];

    lines.push({
      account_code: data.debtorsCode,
      account_name: data.debtorsName,
      account_id: data.debtorsId,
      debit: Number(inv.total_amount) || 0,
      credit: 0,
    });

    if (items.length > 0) {
      items.forEach((item: any) => {
        const coaId = item.fee_account_id ? (data.feeAccToCoaMap.get(item.fee_account_id) || '') : '';
        const acc = coaId ? data.accountMap.get(coaId) : null;
        lines.push({
          account_code: acc?.code || data.feeIncomeCode,
          account_name: acc?.name || item.description || data.feeIncomeName,
          account_id: coaId || data.feeIncomeId,
          debit: 0,
          credit: Number(item.total) || 0,
        });
      });
    } else {
      lines.push({
        account_code: data.feeIncomeCode,
        account_name: data.feeIncomeName,
        account_id: data.feeIncomeId,
        debit: 0,
        credit: Number(inv.total_amount) || 0,
      });
    }

    txns.push({
      id: `inv-${inv.id}`,
      date: inv.invoice_date,
      reference: inv.invoice_number,
      narration: `Fee invoice for ${studentName}`,
      lines,
    });
  });

  // 2. Fee Payments → Dr Cash/Bank (per payment mode), Cr Debtors
  data.payments.forEach((pmt: any) => {
    const studentName = data.studentMap.get(pmt.student_id) || 'Student';

    let cashAccCode = data.cashBankCode;
    let cashAccName = data.cashBankName;
    let cashAccId = data.cashBankId;

    if (pmt.payment_mode_id) {
      const assetAccId = data.paymentModeMap.get(pmt.payment_mode_id);
      if (assetAccId) {
        const acc = data.accountMap.get(assetAccId);
        if (acc) {
          cashAccCode = acc.code;
          cashAccName = acc.name;
          cashAccId = assetAccId;
        }
      }
    }

    txns.push({
      id: `pmt-${pmt.id}`,
      date: pmt.payment_date,
      reference: pmt.receipt_number,
      narration: `Payment received from ${studentName}`,
      lines: [
        { account_code: cashAccCode, account_name: cashAccName, account_id: cashAccId, debit: Number(pmt.amount) || 0, credit: 0 },
        { account_code: data.debtorsCode, account_name: data.debtorsName, account_id: data.debtorsId, debit: 0, credit: Number(pmt.amount) || 0 },
      ],
    });
  });

  // 3. Payment Vouchers (non-Draft) → Dr Expense, Cr Cash/Bank
  data.vouchers.forEach((pv: any) => {
    if (pv.status === 'Draft') return;
    const pvAmount = Number(pv.amount) || 0;

    txns.push({
      id: `pv-${pv.id}`,
      date: pv.voucher_date,
      reference: pv.voucher_number,
      narration: `Payment to ${pv.vendor_name || 'Vendor'} - ${pv.description || ''}`,
      lines: [
        { account_code: data.expenseCode, account_name: pv.description || data.expenseName, account_id: data.expenseId, debit: pvAmount, credit: 0 },
        { account_code: data.cashBankCode, account_name: data.cashBankName, account_id: data.cashBankId, debit: 0, credit: pvAmount },
      ],
    });
  });

  // 4. Existing GL entries grouped by journal_entry_id
  if (data.glEntries.length > 0) {
    const jeMap = new Map<string, any[]>();
    data.glEntries.forEach((gl: any) => {
      const key = gl.journal_entry_id || `standalone-${gl.id}`;
      if (!jeMap.has(key)) jeMap.set(key, []);
      jeMap.get(key)!.push(gl);
    });

    jeMap.forEach((glLines, key) => {
      const first = glLines[0];
      txns.push({
        id: `gl-${key}`,
        date: first.transaction_date,
        reference: first.journal_entries?.entry_number || 'JE',
        narration: first.journal_entries?.narration || first.description || '',
        lines: glLines.map((gl: any) => {
          const acc = data.accountMap.get(gl.account_id);
          return {
            account_code: acc?.code || '—',
            account_name: acc?.name || 'Unknown',
            account_id: gl.account_id,
            debit: Number(gl.debit) || 0,
            credit: Number(gl.credit) || 0,
          };
        }),
      });
    });
  }

  // 5. Payroll runs WITHOUT GL journal entries (fallback for runs where auto_finance_posting was off)
  // Runs WITH journal_entry_id are already captured via GL entries above
  if (data.payrollRuns.length > 0) {
    data.payrollRuns.forEach((run: any) => {
      if (run.journal_entry_id) return; // Already in GL, skip to avoid duplication

      const periodName = run.payroll_periods?.name || 'Payroll';
      const runDate = run.finalized_at ? run.finalized_at.split('T')[0] : (run.payroll_periods?.period_end || new Date().toISOString().split('T')[0]);
      const totalGross = Number(run.total_gross) || 0;
      const totalNet = Number(run.total_net) || 0;
      const totalDeductions = Number(run.total_deductions) || 0;

      // Compute employer contributions from items
      let totalEmployerContrib = 0;
      (run.payroll_items || []).forEach((item: any) => {
        totalEmployerContrib += Number(item.employer_contributions) || 0;
      });

      const lines: SyntheticTransaction['lines'] = [];

      // Dr Salary Expense (gross)
      const salaryExpAcc = data.accounts.find(a => a.account_code === '5101') || data.accounts.find(a => a.account_type === 'Expense' && a.account_name?.toLowerCase().includes('salar'));
      lines.push({
        account_code: salaryExpAcc?.account_code || data.expenseCode,
        account_name: salaryExpAcc?.account_name || 'Salary Expense',
        account_id: salaryExpAcc?.id || data.expenseId,
        debit: totalGross,
        credit: 0,
      });

      // Dr Employer Contributions (expense)
      if (totalEmployerContrib > 0) {
        const empContribAcc = data.accounts.find(a => a.account_type === 'Expense' && a.account_name?.toLowerCase().includes('employer'));
        lines.push({
          account_code: empContribAcc?.account_code || data.expenseCode,
          account_name: empContribAcc?.account_name || 'Employer Contributions',
          account_id: empContribAcc?.id || data.expenseId,
          debit: totalEmployerContrib,
          credit: 0,
        });
      }

      // Cr Payroll Liability (net pay)
      const payrollLiabAcc = data.accounts.find(a => a.account_type === 'Liability' && a.account_name?.toLowerCase().includes('payroll'));
      lines.push({
        account_code: payrollLiabAcc?.account_code || '2201',
        account_name: payrollLiabAcc?.account_name || 'Payroll Liability',
        account_id: payrollLiabAcc?.id || '',
        debit: 0,
        credit: totalNet,
      });

      // Cr Statutory Deductions + Employer Contributions (as liabilities)
      const statutoryCredit = totalDeductions + totalEmployerContrib;
      if (statutoryCredit > 0) {
        const statLiabAcc = data.accounts.find(a => a.account_type === 'Liability' && a.account_name?.toLowerCase().includes('statutory'));
        lines.push({
          account_code: statLiabAcc?.account_code || '2202',
          account_name: statLiabAcc?.account_name || 'Statutory Deductions Payable',
          account_id: statLiabAcc?.id || '',
          debit: 0,
          credit: statutoryCredit,
        });
      }

      txns.push({
        id: `payroll-${run.id}`,
        date: runDate,
        reference: `PAY-${periodName}`,
        narration: `Payroll for ${periodName} (${run.employee_count || 0} employees)`,
        lines,
      });
    });
  }

  txns.sort((a, b) => b.date.localeCompare(a.date));
  return txns;
}

/**
 * Build a balance map (account_id → { debit, credit }) from synthetic transactions.
 * This is used by TB, Financial Position, and other balance-based reports.
 * 
 * Handles overpayment: if debtors goes negative, excess moves to Student Prepayments (2103).
 */
export function buildBalanceMap(
  transactions: SyntheticTransaction[],
  prepayAccId: string,
  debtorsId: string
): Map<string, { debit: number; credit: number }> {
  const balanceMap = new Map<string, { debit: number; credit: number }>();

  transactions.forEach(tx => {
    tx.lines.forEach(line => {
      if (!line.account_id) return;
      const existing = balanceMap.get(line.account_id) || { debit: 0, credit: 0 };
      existing.debit += line.debit;
      existing.credit += line.credit;
      balanceMap.set(line.account_id, existing);
    });
  });

  // Handle overpayment: if net debtors is negative, move to prepayment liability
  if (debtorsId && prepayAccId) {
    const debtorsBal = balanceMap.get(debtorsId);
    if (debtorsBal) {
      const netDebtors = debtorsBal.debit - debtorsBal.credit;
      if (netDebtors < 0) {
        balanceMap.set(debtorsId, { debit: 0, credit: 0 });
        const prepBal = balanceMap.get(prepayAccId) || { debit: 0, credit: 0 };
        prepBal.credit += Math.abs(netDebtors);
        balanceMap.set(prepayAccId, prepBal);
      }
    }
  }

  return balanceMap;
}

/**
 * Compute net balance for an account given its normal_balance side.
 * Returns { debit_balance, credit_balance } for TB display.
 */
export function computeTrialBalanceEntry(
  grossDebit: number,
  grossCredit: number,
  normalBalance: string
): { debit_balance: number; credit_balance: number } {
  const net = grossDebit - grossCredit;
  if (normalBalance === 'Debit') {
    return net >= 0
      ? { debit_balance: net, credit_balance: 0 }
      : { debit_balance: 0, credit_balance: Math.abs(net) };
  } else {
    return net <= 0
      ? { debit_balance: 0, credit_balance: Math.abs(net) }
      : { debit_balance: net, credit_balance: 0 };
  }
}

export const formatKES = (amount: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
