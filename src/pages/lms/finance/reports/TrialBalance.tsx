import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TrialBalanceEntry {
  account_id: string | null;
  account_code: string;
  account_name: string;
  account_type: string;
  debit_balance: number;
  credit_balance: number;
}


export default function TrialBalance() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<TrialBalanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    fetchTrialBalance();
  }, []);

  const fetchTrialBalance = async () => {
    setLoading(true);
    try {
      const { data: accountsData, error: accountsError } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name, account_type, normal_balance')
        .eq('is_active', true)
        .order('account_code');

      if (accountsError) throw accountsError;

      const { data: ledgerData, error: ledgerError } = await supabase
        .from('general_ledger')
        .select('account_id, debit, credit')
        .lte('transaction_date', asOfDate);

      if (ledgerError) throw ledgerError;

      const balanceMap = new Map<string, { debit: number; credit: number }>();
      (ledgerData || []).forEach((entry: any) => {
        const existing = balanceMap.get(entry.account_id) || { debit: 0, credit: 0 };
        existing.debit += Number(entry.debit) || 0;
        existing.credit += Number(entry.credit) || 0;
        balanceMap.set(entry.account_id, existing);
      });

      // IPSAS Accrual: Compute receivables from total invoiced - total paid
      const { data: invoicesData } = await supabase
        .from('fee_invoices')
        .select('total_amount')
        .lte('invoice_date', asOfDate);

      const { data: paymentsData } = await supabase
        .from('fee_payments')
        .select('amount')
        .lte('payment_date', asOfDate)
        .eq('status', 'Completed');

      const totalInvoiced = (invoicesData || []).reduce((sum, inv) => sum + Number(inv.total_amount), 0);
      const totalPaid = (paymentsData || []).reduce((sum, pay) => sum + Number(pay.amount), 0);
      const netReceivable = totalInvoiced - totalPaid;

      // Expense payments (cash outflow)
      const { data: expensePayments } = await supabase
        .from('payable_payments')
        .select('amount')
        .eq('status', 'Completed')
        .lte('payment_date', asOfDate);
      const totalExpensePaid = (expensePayments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      // IPSAS: Supplement COA accounts with synthetic balances where GL is empty
      // Student Debtors (1201)
      const debtorsAcc = (accountsData || []).find((a: any) => a.account_code === '1201');
      if (debtorsAcc && netReceivable > 0) {
        const glBal = balanceMap.get(debtorsAcc.id) || { debit: 0, credit: 0 };
        if (glBal.debit === 0 && glBal.credit === 0) {
          balanceMap.set(debtorsAcc.id, { debit: totalInvoiced, credit: totalPaid });
        }
      }

      // Student Prepayments (2103) - overpayment liability
      const prepayAcc = (accountsData || []).find((a: any) => a.account_code === '2103');
      if (prepayAcc && netReceivable < 0) {
        const glBal = balanceMap.get(prepayAcc.id) || { debit: 0, credit: 0 };
        if (glBal.debit === 0 && glBal.credit === 0) {
          balanceMap.set(prepayAcc.id, { debit: 0, credit: Math.abs(netReceivable) });
        }
      }

      // Cash/Bank (1102)
      const cashAcc = (accountsData || []).find((a: any) => a.account_code === '1102');
      if (cashAcc) {
        const glBal = balanceMap.get(cashAcc.id) || { debit: 0, credit: 0 };
        if (glBal.debit === 0 && glBal.credit === 0 && (totalPaid > 0 || totalExpensePaid > 0)) {
          balanceMap.set(cashAcc.id, { debit: totalPaid, credit: totalExpensePaid });
        }
      }

      // Fee Income: supplement from invoice items mapped to COA via fee_accounts
      const { data: invoiceItemsData } = await supabase
        .from('fee_invoice_items')
        .select('total, fee_accounts(account_id)')
        .lte('fee_invoices.invoice_date', asOfDate);

      const incomeByAccount = new Map<string, number>();
      (invoiceItemsData || []).forEach((item: any) => {
        const accId = item.fee_accounts?.account_id;
        if (accId) {
          incomeByAccount.set(accId, (incomeByAccount.get(accId) || 0) + (Number(item.total) || 0));
        }
      });

      incomeByAccount.forEach((amount, accId) => {
        const glBal = balanceMap.get(accId) || { debit: 0, credit: 0 };
        if (glBal.debit === 0 && glBal.credit === 0) {
          balanceMap.set(accId, { debit: 0, credit: amount });
        }
      });

      // Fallback: if no specific income accounts, use a general fee income account
      if (incomeByAccount.size === 0 && totalInvoiced > 0) {
        const feeIncomeAcc = (accountsData || []).find((a: any) =>
          a.account_type === 'Income' && (a.account_name?.toLowerCase().includes('fee') || a.account_code?.startsWith('4'))
        );
        if (feeIncomeAcc) {
          const glBal = balanceMap.get(feeIncomeAcc.id) || { debit: 0, credit: 0 };
          if (glBal.debit === 0 && glBal.credit === 0) {
            balanceMap.set(feeIncomeAcc.id, { debit: 0, credit: totalInvoiced });
          }
        }
      }

      // Expense from approved/paid vouchers (accrual recognition)
      const { data: voucherData } = await supabase
        .from('payment_vouchers')
        .select('amount, voucher_date, status')
        .neq('status', 'Draft')
        .lte('voucher_date', asOfDate);

      // Find a general expense account to supplement if no per-item breakdown
      const totalVoucherExpense = (voucherData || []).reduce((s, v) => s + (Number(v.amount) || 0), 0);
      if (totalVoucherExpense > 0) {
        const expenseAcc = (accountsData || []).find((a: any) =>
          a.account_type === 'Expense' && a.account_code?.startsWith('5')
        );
        if (expenseAcc) {
          const glBal = balanceMap.get(expenseAcc.id) || { debit: 0, credit: 0 };
          if (glBal.debit === 0 && glBal.credit === 0) {
            balanceMap.set(expenseAcc.id, { debit: totalVoucherExpense, credit: 0 });
          }
        }
      }

      const formattedEntries: TrialBalanceEntry[] = (accountsData || []).map((acc: any) => {
        const ledgerBalance = balanceMap.get(acc.id) || { debit: 0, credit: 0 };
        const netBalance = ledgerBalance.debit - ledgerBalance.credit;

        let debit_balance = 0;
        let credit_balance = 0;

        if (acc.normal_balance === 'Debit') {
          if (netBalance >= 0) debit_balance = netBalance;
          else credit_balance = Math.abs(netBalance);
        } else {
          if (netBalance <= 0) credit_balance = Math.abs(netBalance);
          else debit_balance = netBalance;
        }

        return {
          account_id: acc.id,
          account_code: acc.account_code,
          account_name: acc.account_name,
          account_type: acc.account_type,
          debit_balance,
          credit_balance,
        };
      });

      const nonZeroEntries = formattedEntries.filter(e => e.debit_balance > 0 || e.credit_balance > 0);
      setEntries(nonZeroEntries.length > 0 ? nonZeroEntries : formattedEntries);
    } catch (error) {
      console.error('Error fetching trial balance:', error);
      toast.error('Failed to load trial balance');
    } finally {
      setLoading(false);
    }
  };

  const handleAccountClick = (entry: TrialBalanceEntry) => {
    if (entry.account_id) {
      navigate(`/lms/finance/reports/general-ledger?accountId=${entry.account_id}&endDate=${asOfDate}`);
    }
  };

  const handleGenerate = () => {
    fetchTrialBalance();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
  };

  const totalDebits = entries.reduce((sum, e) => sum + e.debit_balance, 0);
  const totalCredits = entries.reduce((sum, e) => sum + e.credit_balance, 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;


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
          <h1 className="text-3xl font-bold">Trial Balance</h1>
          <p className="text-muted-foreground">View account balances as of a specific date</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <Label>As of Date</Label>
              <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
            </div>
            <Button onClick={handleGenerate}>Generate Report</Button>
          </div>
        </CardContent>
      </Card>

      <Card className={isBalanced ? 'border-green-500' : 'border-destructive'}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            {isBalanced ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-600 font-medium">Trial Balance is balanced</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-destructive" />
                <span className="text-destructive font-medium">
                  Trial Balance is NOT balanced - Difference: {formatCurrency(Math.abs(totalDebits - totalCredits))}
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trial Balance as of {format(new Date(asOfDate), 'dd MMMM yyyy')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No accounts with balances found. Create transactions to see balances.
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono">{entry.account_code}</TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleAccountClick(entry)}
                          className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors text-left font-medium"
                        >
                          {entry.account_name}
                        </button>
                      </TableCell>
                      <TableCell>{entry.account_type}</TableCell>
                      <TableCell className="text-right">
                        {entry.debit_balance > 0 ? formatCurrency(entry.debit_balance) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.credit_balance > 0 ? formatCurrency(entry.credit_balance) : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
                <TableRow className="font-bold bg-muted">
                  <TableCell colSpan={3}>TOTAL</TableCell>
                  <TableCell className="text-right">{formatCurrency(totalDebits)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totalCredits)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
