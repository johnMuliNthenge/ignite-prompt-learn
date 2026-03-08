import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Search, Download, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface DoubleEntryTransaction {
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

interface Account {
  id: string;
  account_code: string;
  account_name: string;
}

const ROWS_PER_PAGE = 10;

export default function GeneralLedger() {
  const { isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const [transactions, setTransactions] = useState<DoubleEntryTransaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<string>(searchParams.get('accountId') || 'all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchAccounts();
    fetchAllTransactions();
  }, []);

  const fetchAccounts = async () => {
    const { data } = await supabase
      .from('chart_of_accounts')
      .select('id, account_code, account_name')
      .eq('is_active', true)
      .order('account_code');
    if (data) setAccounts(data);
  };

  const fetchAllTransactions = async () => {
    setLoading(true);
    try {
      // Fetch all data sources in parallel
      const [invoicesRes, paymentsRes, accountsRes, studentsRes, vouchersRes, glRes, feeAccountsRes, paymentModesRes] = await Promise.all([
        supabase.from('fee_invoices').select(`
          id, invoice_number, invoice_date, total_amount, student_id, status,
          fee_invoice_items ( description, total, fee_account_id )
        `).order('invoice_date', { ascending: false }),

        supabase.from('fee_payments').select(`
          id, receipt_number, payment_date, amount, student_id, payment_mode_id, status
        `).order('payment_date', { ascending: false }),

        supabase.from('chart_of_accounts').select('id, account_code, account_name, account_type').eq('is_active', true),

        supabase.from('students').select('id, other_name, surname'),

        supabase.from('payment_vouchers').select(`
          id, voucher_number, voucher_date, amount, vendor_name, status, description
        `).order('voucher_date', { ascending: false }),

        supabase.from('general_ledger').select(`
          id, transaction_date, description, debit, credit, account_id, journal_entry_id,
          journal_entries:journal_entry_id ( entry_number, narration )
        `).order('transaction_date', { ascending: false }).limit(1000),

        supabase.from('fee_accounts').select('id, account_id'),

        // Batch fetch ALL payment modes upfront instead of sequential awaits
        supabase.from('payment_modes').select('id, name, asset_account_id'),
      ]);

      const accountMap = new Map<string, { code: string; name: string }>();
      (accountsRes.data || []).forEach((a: any) => {
        accountMap.set(a.id, { code: a.account_code, name: a.account_name });
      });

      const studentMap = new Map<string, string>();
      (studentsRes.data || []).forEach((s: any) => {
        studentMap.set(s.id, `${s.other_name || ''} ${s.surname || ''}`.trim());
      });

      // Map fee_account_id → chart_of_accounts.id
      const feeAccToCoaMap = new Map<string, string>();
      (feeAccountsRes.data || []).forEach((fa: any) => {
        if (fa.account_id) feeAccToCoaMap.set(fa.id, fa.account_id);
      });

      // Map payment_mode_id → { name, asset_account_id }
      const paymentModeMap = new Map<string, { name: string; asset_account_id: string | null }>();
      (paymentModesRes.data || []).forEach((pm: any) => {
        paymentModeMap.set(pm.id, { name: pm.name, asset_account_id: pm.asset_account_id });
      });

      // Find debtors account - prioritize exact code match
      const debtorsAccount = (accountsRes.data || []).find((a: any) => a.account_code === '1201');
      const debtorsCode = debtorsAccount ? debtorsAccount.account_code : 'DR';
      const debtorsName = debtorsAccount ? debtorsAccount.account_name : 'Student Debtors';
      const debtorsId = debtorsAccount?.id || '';

      // Find cash/bank account - exact code match first
      const cashBankAccount = (accountsRes.data || []).find((a: any) => a.account_code === '1102') ||
        (accountsRes.data || []).find((a: any) =>
          a.account_type === 'Asset' && a.account_name?.toLowerCase().includes('cash at bank')
        );
      const cashBankId = cashBankAccount?.id || '';
      const cashBankCode = cashBankAccount?.account_code || '300';
      const cashBankName = cashBankAccount?.account_name || 'Cash and Bank';

      // Find general fee income account - MUST match Trial Balance logic exactly
      // TB logic: a.account_type === 'Income' && (name includes 'fee' || code starts with '4')
      const feeIncomeAccount = (accountsRes.data || []).find((a: any) =>
        a.account_type === 'Income' && (a.account_name?.toLowerCase().includes('fee') || a.account_code?.startsWith('4'))
      );
      const feeIncomeId = feeIncomeAccount?.id || '';
      const feeIncomeCode = feeIncomeAccount?.account_code || '—';
      const feeIncomeName = feeIncomeAccount?.account_name || 'Fee Income';

      // Find general expense account
      const expenseAccount = (accountsRes.data || []).find((a: any) =>
        a.account_type === 'Expense' && a.account_code?.startsWith('5')
      );
      const expenseId = expenseAccount?.id || '';
      const expenseCode = expenseAccount?.account_code || '—';
      const expenseName = expenseAccount?.account_name || 'Expense';

      // Prepayment account for overpayments (matches TB logic for 2103)
      const prepayAccount = (accountsRes.data || []).find((a: any) => a.account_code === '2103');

      const allTransactions: DoubleEntryTransaction[] = [];

      // 1. Fee Invoices → Dr Debtors, Cr Income (per vote head)
      (invoicesRes.data || []).forEach((inv: any) => {
        const studentName = studentMap.get(inv.student_id) || 'Unknown Student';
        const items = inv.fee_invoice_items || [];
        const lines: DoubleEntryTransaction['lines'] = [];

        // Debit: Student Debtors for total amount
        lines.push({
          account_code: debtorsCode,
          account_name: debtorsName,
          account_id: debtorsId,
          debit: Number(inv.total_amount) || 0,
          credit: 0,
        });

        // Credit: Each vote head (income line)
        if (items.length > 0) {
          items.forEach((item: any) => {
            const coaId = item.fee_account_id ? (feeAccToCoaMap.get(item.fee_account_id) || '') : '';
            const acc = coaId ? accountMap.get(coaId) : null;
            lines.push({
              account_code: acc?.code || feeIncomeCode,
              account_name: acc?.name || item.description || feeIncomeName,
              account_id: coaId || feeIncomeId,
              debit: 0,
              credit: Number(item.total) || 0,
            });
          });
        } else {
          lines.push({
            account_code: feeIncomeCode,
            account_name: feeIncomeName,
            account_id: feeIncomeId,
            debit: 0,
            credit: Number(inv.total_amount) || 0,
          });
        }

        allTransactions.push({
          id: `inv-${inv.id}`,
          date: inv.invoice_date,
          reference: inv.invoice_number,
          narration: `Fee invoice for ${studentName}`,
          lines,
        });
      });

      // 2. Fee Payments → Dr Cash/Bank, Cr Debtors (using batched payment mode map)
      (paymentsRes.data || []).forEach((pmt: any) => {
        const studentName = studentMap.get(pmt.student_id) || 'Unknown Student';
        const lines: DoubleEntryTransaction['lines'] = [];

        // Determine cash/bank account from payment mode (no more sequential awaits!)
        let cashAccCode = cashBankCode;
        let cashAccName = cashBankName;
        let cashAccId = cashBankId;

        if (pmt.payment_mode_id) {
          const pmData = paymentModeMap.get(pmt.payment_mode_id);
          if (pmData?.asset_account_id) {
            const acc = accountMap.get(pmData.asset_account_id);
            if (acc) {
              cashAccCode = acc.code;
              cashAccName = acc.name;
              cashAccId = pmData.asset_account_id;
            }
          } else if (pmData?.name) {
            cashAccName = pmData.name;
          }
        }

        // Dr Cash/Bank
        lines.push({
          account_code: cashAccCode,
          account_name: cashAccName,
          account_id: cashAccId,
          debit: Number(pmt.amount) || 0,
          credit: 0,
        });

        // Cr Debtors
        lines.push({
          account_code: debtorsCode,
          account_name: debtorsName,
          account_id: debtorsId,
          debit: 0,
          credit: Number(pmt.amount) || 0,
        });

        allTransactions.push({
          id: `pmt-${pmt.id}`,
          date: pmt.payment_date,
          reference: pmt.receipt_number,
          narration: `Payment received from ${studentName}`,
          lines,
        });
      });

      // 3. Payment Vouchers → Dr Expense, Cr Cash/Bank
      (vouchersRes.data || []).forEach((pv: any) => {
        if (pv.status === 'Draft') return;
        const pvAmount = Number(pv.amount) || 0;

        allTransactions.push({
          id: `pv-${pv.id}`,
          date: pv.voucher_date,
          reference: pv.voucher_number,
          narration: `Payment to ${pv.vendor_name || 'Vendor'} - ${pv.description || ''}`,
          lines: [
            {
              account_code: expenseCode,
              account_name: pv.description || expenseName,
              account_id: expenseId,
              debit: pvAmount,
              credit: 0,
            },
            {
              account_code: cashBankCode,
              account_name: cashBankName,
              account_id: cashBankId,
              debit: 0,
              credit: pvAmount,
            },
          ],
        });
      });

      // 4. Existing GL entries grouped by journal_entry_id
      const glData = glRes.data || [];
      if (glData.length > 0) {
        const jeMap = new Map<string, any[]>();
        glData.forEach((gl: any) => {
          if (gl.journal_entry_id) {
            if (!jeMap.has(gl.journal_entry_id)) jeMap.set(gl.journal_entry_id, []);
            jeMap.get(gl.journal_entry_id)!.push(gl);
          }
        });

        jeMap.forEach((glLines, jeId) => {
          const first = glLines[0];
          allTransactions.push({
            id: `gl-${jeId}`,
            date: first.transaction_date,
            reference: first.journal_entries?.entry_number || 'JE',
            narration: first.journal_entries?.narration || first.description || '',
            lines: glLines.map((gl: any) => {
              const acc = accountMap.get(gl.account_id);
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

      // Sort all by date descending
      allTransactions.sort((a, b) => b.date.localeCompare(a.date));
      setTransactions(allTransactions);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load ledger entries');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    if (selectedAccount && selectedAccount !== 'all') {
      // Show only transactions that touch this account (but display full double-entry)
      filtered = filtered.filter(t =>
        t.lines.some(l => l.account_id === selectedAccount)
      );
    }

    if (startDate) {
      filtered = filtered.filter(t => t.date >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter(t => t.date <= endDate);
    }

    return filtered;
  }, [transactions, selectedAccount, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / ROWS_PER_PAGE));
  const paginatedTx = filteredTransactions.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  // Compute totals - when filtered by account, only sum that account's lines
  const { totalDebits, totalCredits } = useMemo(() => {
    let dr = 0, cr = 0;
    filteredTransactions.forEach(t => {
      t.lines.forEach(l => {
        if (selectedAccount && selectedAccount !== 'all') {
          if (l.account_id === selectedAccount) {
            dr += l.debit;
            cr += l.credit;
          }
        } else {
          dr += l.debit;
          cr += l.credit;
        }
      });
    });
    return { totalDebits: dr, totalCredits: cr };
  }, [filteredTransactions, selectedAccount]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);

  const handleFilter = () => {
    setCurrentPage(1);
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">You don't have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">General Ledger</h1>
          <p className="text-muted-foreground">All transactions in double-entry format</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Vote Head (Account)</Label>
              <Select value={selectedAccount} onValueChange={(v) => { setSelectedAccount(v); setCurrentPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="All accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.account_code} - {acc.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }} />
            </div>
            <div className="flex items-end">
              <Button onClick={handleFilter} className="w-full">
                <Search className="mr-2 h-4 w-4" />
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Balance Summary - show when filtered by specific account */}
      {selectedAccount && selectedAccount !== 'all' && !loading && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Debits</p>
                <p className="text-lg font-bold">{formatCurrency(totalDebits)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Credits</p>
                <p className="text-lg font-bold">{formatCurrency(totalCredits)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net Balance</p>
                <p className="text-lg font-bold">{formatCurrency(Math.abs(totalDebits - totalCredits))} {totalDebits >= totalCredits ? 'Dr' : 'Cr'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ledger Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Ledger Transactions
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({filteredTransactions.length} {filteredTransactions.length === 1 ? 'entry' : 'entries'})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Narration</TableHead>
                    <TableHead className="text-right">Debit (KES)</TableHead>
                    <TableHead className="text-right">Credit (KES)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTx.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedTx.map((tx, ti) => (
                      <React.Fragment key={tx.id}>
                        {tx.lines.map((line, li) => (
                          <TableRow
                            key={`${tx.id}-${li}`}
                            className={li === 0 && ti > 0 ? 'border-t-2 border-border' : ''}
                          >
                            {li === 0 ? (
                              <>
                                <TableCell rowSpan={tx.lines.length} className="align-top font-medium whitespace-nowrap">
                                  {format(new Date(tx.date), 'dd/MM/yyyy')}
                                </TableCell>
                                <TableCell rowSpan={tx.lines.length} className="align-top font-mono text-xs whitespace-nowrap">
                                  {tx.reference}
                                </TableCell>
                              </>
                            ) : null}
                            <TableCell className="font-mono text-sm">{line.account_code}</TableCell>
                            <TableCell>{line.account_name}</TableCell>
                            {li === 0 ? (
                              <TableCell rowSpan={tx.lines.length} className="align-top max-w-xs text-sm text-muted-foreground">
                                {tx.narration}
                              </TableCell>
                            ) : null}
                            <TableCell className="text-right font-medium">
                              {line.debit > 0 ? formatCurrency(line.debit) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {line.credit > 0 ? formatCurrency(line.credit) : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Totals */}
              {filteredTransactions.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-end gap-8">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total Debits</p>
                      <p className="text-lg font-bold">{formatCurrency(totalDebits)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total Credits</p>
                      <p className="text-lg font-bold">{formatCurrency(totalCredits)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Pagination */}
              {filteredTransactions.length > ROWS_PER_PAGE && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * ROWS_PER_PAGE + 1} to{' '}
                    {Math.min(currentPage * ROWS_PER_PAGE, filteredTransactions.length)} of{' '}
                    {filteredTransactions.length} entries
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <span className="flex items-center text-sm px-2">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
