import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface LineItem {
  account_code: string;
  name: string;
  amount: number;
}

export default function ProfitLoss() {
  const { isAdmin } = useAuth();
  const [income, setIncome] = useState<LineItem[]>([]);
  const [expenses, setExpenses] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Income/Expense accounts
      const { data: accountsData } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name, account_type, normal_balance')
        .eq('is_active', true)
        .in('account_type', ['Income', 'Expense'])
        .order('account_code');

      // Fetch GL entries for period — single source of truth
      const { data: ledgerData } = await supabase
        .from('general_ledger')
        .select('account_id, debit, credit')
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate);

      const balanceMap = new Map<string, number>();
      (ledgerData || []).forEach((e: any) => {
        const existing = balanceMap.get(e.account_id) || 0;
        balanceMap.set(e.account_id, existing + (Number(e.debit) || 0) - (Number(e.credit) || 0));
      });

      // Supplement with fee invoices (accrual income) if GL doesn't have entries
      const { data: invoiceItems } = await supabase
        .from('fee_invoice_items')
        .select('total, fee_account_id, fee_accounts(account_id), fee_invoices!inner(invoice_date)')
        .gte('fee_invoices.invoice_date', startDate)
        .lte('fee_invoices.invoice_date', endDate);

      // Accumulate invoice income by GL account
      const invoiceIncomeMap = new Map<string, number>();
      (invoiceItems || []).forEach((item: any) => {
        const accId = item.fee_accounts?.account_id;
        if (accId) {
          invoiceIncomeMap.set(accId, (invoiceIncomeMap.get(accId) || 0) + (Number(item.total) || 0));
        }
      });

      // Build line items
      const incomeItems: LineItem[] = [];
      const expenseItems: LineItem[] = [];

      (accountsData || []).forEach((acc: any) => {
        let glNet = balanceMap.get(acc.id) || 0;
        let amount = 0;

        if (acc.account_type === 'Income') {
          // Income: normal credit. Net credit = negative in (debit-credit). 
          // If GL has data, use it. If not, use invoice data.
          if (glNet !== 0) {
            amount = Math.abs(glNet); // Credits produce negative net
          } else {
            amount = invoiceIncomeMap.get(acc.id) || 0;
          }
          if (amount > 0) incomeItems.push({ account_code: acc.account_code, name: acc.account_name, amount });
        } else {
          // Expense: normal debit. Positive net = expense.
          amount = glNet > 0 ? glNet : 0;
          if (amount > 0) expenseItems.push({ account_code: acc.account_code, name: acc.account_name, amount });
        }
      });

      setIncome(incomeItems);
      setExpenses(expenseItems);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load P&L data');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(n);
  const totalIncome = income.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netIncome = totalIncome - totalExpenses;

  if (!isAdmin) return <div className="p-6"><p className="text-muted-foreground">Access denied.</p></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Profit and Loss Statement</h1>
          <p className="text-muted-foreground">
            For {format(new Date(startDate), 'dd MMM yyyy')} to {format(new Date(endDate), 'dd MMM yyyy')}
          </p>
        </div>
        <Button variant="outline"><Download className="mr-2 h-4 w-4" />Export</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Report Period</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
            <div className="space-y-2"><Label>End Date</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
            <Button onClick={fetchData}>Generate Report</Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-green-600">Income</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                <TableBody>
                  {income.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No income for this period</TableCell></TableRow>
                  ) : income.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{item.account_code}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">{fmt(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted">
                    <TableCell colSpan={2}>Total Income</TableCell>
                    <TableCell className="text-right text-green-600">{fmt(totalIncome)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-destructive">Expenses</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                <TableBody>
                  {expenses.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No expenses for this period</TableCell></TableRow>
                  ) : expenses.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{item.account_code}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">{fmt(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted">
                    <TableCell colSpan={2}>Total Expenses</TableCell>
                    <TableCell className="text-right text-destructive">{fmt(totalExpenses)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className={netIncome >= 0 ? 'border-green-500' : 'border-destructive'}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium">Net {netIncome >= 0 ? 'Profit' : 'Loss'}</span>
                <span className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {fmt(Math.abs(netIncome))}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Period: {format(new Date(startDate), 'dd MMM yyyy')} to {format(new Date(endDate), 'dd MMM yyyy')}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
