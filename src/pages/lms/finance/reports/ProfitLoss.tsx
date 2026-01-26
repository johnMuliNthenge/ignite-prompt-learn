import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface LineItem {
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch income from fee payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('fee_payments')
        .select('amount, payment_date')
        .eq('status', 'Completed')
        .gte('payment_date', startDate)
        .lte('payment_date', endDate);

      if (paymentsError) throw paymentsError;

      const totalFeeIncome = (paymentsData || []).reduce((sum, p) => sum + Number(p.amount), 0);

      // Get fee breakdown by fee account
      const { data: invoiceItemsData } = await supabase
        .from('fee_invoice_items')
        .select(`
          total,
          fee_accounts(name),
          fee_invoices!inner(invoice_date)
        `)
        .gte('fee_invoices.invoice_date', startDate)
        .lte('fee_invoices.invoice_date', endDate);

      const incomeByCategory = new Map<string, number>();
      (invoiceItemsData || []).forEach((item: any) => {
        const name = item.fee_accounts?.name || 'School Fees';
        const current = incomeByCategory.get(name) || 0;
        incomeByCategory.set(name, current + Number(item.total));
      });

      const incomeItems: LineItem[] = [];
      if (incomeByCategory.size > 0) {
        incomeByCategory.forEach((amount, name) => {
          incomeItems.push({ name, amount });
        });
      } else if (totalFeeIncome > 0) {
        incomeItems.push({ name: 'School Fees', amount: totalFeeIncome });
      }

      // Fetch expenses from payable payments
      const { data: expensesData, error: expensesError } = await supabase
        .from('payable_payments')
        .select(`
          amount,
          vendors(name, vendor_types(name))
        `)
        .eq('status', 'Completed')
        .gte('payment_date', startDate)
        .lte('payment_date', endDate);

      const expensesByCategory = new Map<string, number>();
      (expensesData || []).forEach((exp: any) => {
        const category = exp.vendors?.vendor_types?.name || 'Operating Expenses';
        const current = expensesByCategory.get(category) || 0;
        expensesByCategory.set(category, current + Number(exp.amount));
      });

      const expenseItems: LineItem[] = [];
      expensesByCategory.forEach((amount, name) => {
        expenseItems.push({ name, amount });
      });

      // Fetch from general ledger for more detailed breakdown
      const { data: ledgerData } = await supabase
        .from('general_ledger')
        .select(`
          debit,
          credit,
          chart_of_accounts(account_name, account_type)
        `)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate);

      (ledgerData || []).forEach((entry: any) => {
        const account = entry.chart_of_accounts;
        if (!account) return;

        if (account.account_type === 'Revenue') {
          const credit = Number(entry.credit) || 0;
          if (credit > 0) {
            const existing = incomeItems.find(i => i.name === account.account_name);
            if (existing) {
              existing.amount += credit;
            } else {
              incomeItems.push({ name: account.account_name, amount: credit });
            }
          }
        } else if (account.account_type === 'Expense') {
          const debit = Number(entry.debit) || 0;
          if (debit > 0) {
            const existing = expenseItems.find(e => e.name === account.account_name);
            if (existing) {
              existing.amount += debit;
            } else {
              expenseItems.push({ name: account.account_name, amount: debit });
            }
          }
        }
      });

      setIncome(incomeItems);
      setExpenses(expenseItems);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load profit & loss data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => {
    fetchData();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  };

  const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netIncome = totalIncome - totalExpenses;

  if (!isAdmin) {
    return <div className="p-6"><p className="text-muted-foreground">Access denied.</p></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Profit and Loss Statement</h1>
          <p className="text-muted-foreground">Income and expenses summary</p>
        </div>
        <Button variant="outline"><Download className="mr-2 h-4 w-4" />Export</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Period</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button onClick={handleGenerate}>Generate Report</Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Income */}
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">Income</CardTitle>
            </CardHeader>
            <CardContent>
              {income.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No income recorded for this period</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {income.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted">
                      <TableCell>Total Income</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(totalIncome)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Expenses */}
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No expenses recorded for this period</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted">
                      <TableCell>Total Expenses</TableCell>
                      <TableCell className="text-right text-destructive">{formatCurrency(totalExpenses)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Net Income Summary */}
      <Card className={netIncome >= 0 ? 'border-green-500' : 'border-destructive'}>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium">Net {netIncome >= 0 ? 'Profit' : 'Loss'}</span>
            <span className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              {formatCurrency(Math.abs(netIncome))}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            For the period {format(new Date(startDate), 'dd MMM yyyy')} to {format(new Date(endDate), 'dd MMM yyyy')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
