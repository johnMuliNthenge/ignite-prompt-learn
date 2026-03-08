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
      // Fetch all data in parallel - same sources as General Ledger
      const [accountsRes, ledgerRes, invoicesRes, paymentsRes, feeAccountsRes, paymentModesRes, vouchersRes] = await Promise.all([
        supabase.from('chart_of_accounts')
          .select('id, account_code, account_name, account_type, normal_balance')
          .eq('is_active', true).order('account_code'),
        supabase.from('general_ledger')
          .select('account_id, debit, credit')
          .lte('transaction_date', asOfDate),
        supabase.from('fee_invoices')
          .select('id, invoice_date, total_amount, fee_invoice_items(total, fee_account_id)')
          .lte('invoice_date', asOfDate),
        supabase.from('fee_payments')
          .select('id, payment_date, amount, payment_mode_id')
          .lte('payment_date', asOfDate),
        supabase.from('fee_accounts').select('id, account_id'),
        supabase.from('payment_modes').select('id, name, asset_account_id'),
        supabase.from('payment_vouchers')
          .select('id, amount, voucher_date, status')
          .neq('status', 'Draft')
          .lte('voucher_date', asOfDate),
      ]);

      const accountsData = accountsRes.data || [];
      if (accountsRes.error) throw accountsRes.error;

      // Start with GL balances
      const balanceMap = new Map<string, { debit: number; credit: number }>();
      (ledgerRes.data || []).forEach((entry: any) => {
        const existing = balanceMap.get(entry.account_id) || { debit: 0, credit: 0 };
        existing.debit += Number(entry.debit) || 0;
        existing.credit += Number(entry.credit) || 0;
        balanceMap.set(entry.account_id, existing);
      });

      // Build maps - SAME as General Ledger
      const feeAccToCoaMap = new Map<string, string>();
      (feeAccountsRes.data || []).forEach((fa: any) => {
        if (fa.account_id) feeAccToCoaMap.set(fa.id, fa.account_id);
      });

      const paymentModeMap = new Map<string, string | null>();
      (paymentModesRes.data || []).forEach((pm: any) => {
        paymentModeMap.set(pm.id, pm.asset_account_id);
      });

      // Find key accounts - SAME logic as GL
      const debtorsAcc = accountsData.find((a: any) => a.account_code === '1201');
      const debtorsId = debtorsAcc?.id || '';

      const cashBankAcc = accountsData.find((a: any) => a.account_code === '1102') ||
        accountsData.find((a: any) => a.account_type === 'Asset' && a.account_name?.toLowerCase().includes('cash at bank'));
      const cashBankId = cashBankAcc?.id || '';

      const feeIncomeAcc = accountsData.find((a: any) =>
        a.account_type === 'Income' && (a.account_name?.toLowerCase().includes('fee') || a.account_code?.startsWith('4'))
      );
      const feeIncomeId = feeIncomeAcc?.id || '';

      const expenseAcc = accountsData.find((a: any) =>
        a.account_type === 'Expense' && a.account_code?.startsWith('5')
      );
      const expenseId = expenseAcc?.id || '';

      const prepayAcc = accountsData.find((a: any) => a.account_code === '2103');

      // Helper to add to balance map
      const addBalance = (accId: string, debit: number, credit: number) => {
        if (!accId) return;
        const existing = balanceMap.get(accId) || { debit: 0, credit: 0 };
        existing.debit += debit;
        existing.credit += credit;
        balanceMap.set(accId, existing);
      };

      // Check if GL already has data for these synthetic accounts
      const hasGLData = (ledgerRes.data || []).length > 0;
      const glAccountIds = new Set((ledgerRes.data || []).map((e: any) => e.account_id));

      // Only build synthetic entries for accounts NOT already in GL
      // 1. Fee Invoices: Dr Debtors, Cr Income (per vote head) - SAME as GL
      if (!glAccountIds.has(debtorsId)) {
        (invoicesRes.data || []).forEach((inv: any) => {
          const invAmount = Number(inv.total_amount) || 0;
          // Dr Debtors
          addBalance(debtorsId, invAmount, 0);

          // Cr Income per item
          const items = inv.fee_invoice_items || [];
          if (items.length > 0) {
            items.forEach((item: any) => {
              const coaId = item.fee_account_id ? (feeAccToCoaMap.get(item.fee_account_id) || '') : '';
              const targetAccId = coaId || feeIncomeId;
              if (targetAccId && !glAccountIds.has(targetAccId)) {
                addBalance(targetAccId, 0, Number(item.total) || 0);
              }
            });
          } else {
            if (feeIncomeId && !glAccountIds.has(feeIncomeId)) {
              addBalance(feeIncomeId, 0, invAmount);
            }
          }
        });

        // 2. Fee Payments: Dr Cash/Bank (per payment mode), Cr Debtors - SAME as GL
        (paymentsRes.data || []).forEach((pmt: any) => {
          const pmtAmount = Number(pmt.amount) || 0;

          // Resolve cash account from payment mode - SAME as GL
          let cashAccId = cashBankId;
          if (pmt.payment_mode_id) {
            const assetAccId = paymentModeMap.get(pmt.payment_mode_id);
            if (assetAccId) {
              cashAccId = assetAccId;
            }
          }

          // Dr Cash/Bank
          if (!glAccountIds.has(cashAccId)) {
            addBalance(cashAccId, pmtAmount, 0);
          }
          // Cr Debtors
          addBalance(debtorsId, 0, pmtAmount);
        });

        // Handle overpayment: if net debtors is negative, move to prepayment liability
        const debtorsBal = balanceMap.get(debtorsId);
        if (debtorsBal && prepayAcc) {
          const netDebtors = debtorsBal.debit - debtorsBal.credit;
          if (netDebtors < 0) {
            // Zero out debtors and move excess to prepayment
            balanceMap.set(debtorsId, { debit: 0, credit: 0 });
            addBalance(prepayAcc.id, 0, Math.abs(netDebtors));
          }
        }
      }

      // 3. Payment Vouchers: Dr Expense, Cr Cash/Bank - SAME as GL
      if (expenseId && !glAccountIds.has(expenseId)) {
        (vouchersRes.data || []).forEach((pv: any) => {
          const pvAmount = Number(pv.amount) || 0;
          addBalance(expenseId, pvAmount, 0);
          if (!glAccountIds.has(cashBankId)) {
            addBalance(cashBankId, 0, pvAmount);
          }
        });
      }

      const formattedEntries: TrialBalanceEntry[] = accountsData.map((acc: any) => {
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
