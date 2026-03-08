import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
import {
  fetchFinanceDataSources,
  buildSyntheticTransactions,
  buildBalanceMap,
  formatKES,
} from '@/lib/finance-utils';

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
      const data = await fetchFinanceDataSources({
        dateFilter: { startDate, endDate },
      });
      const transactions = buildSyntheticTransactions(data);
      const balanceMap = buildBalanceMap(transactions, data.prepayAccId, data.debtorsId);

      const incomeItems: LineItem[] = [];
      const expenseItems: LineItem[] = [];

      data.accounts.forEach(acc => {
        const bal = balanceMap.get(acc.id);
        if (!bal) return;
        const net = bal.debit - bal.credit;

        if (acc.account_type === 'Income') {
          // Income normal_balance = Credit, so credit > debit means positive income
          const amount = Math.abs(net);
          if (amount >= 0.01) incomeItems.push({ account_code: acc.account_code, name: acc.account_name, amount });
        } else if (acc.account_type === 'Expense') {
          // Expense normal_balance = Debit, so debit > credit means positive expense
          const amount = net > 0 ? net : 0;
          if (amount >= 0.01) expenseItems.push({ account_code: acc.account_code, name: acc.account_name, amount });
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
                      <TableCell className="font-mono">{item.account_code}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">{formatKES(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted">
                    <TableCell colSpan={2}>Total Income</TableCell>
                    <TableCell className="text-right">{formatKES(totalIncome)}</TableCell>
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
                      <TableCell className="font-mono">{item.account_code}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">{formatKES(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted">
                    <TableCell colSpan={2}>Total Expenses</TableCell>
                    <TableCell className="text-right">{formatKES(totalExpenses)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className={netIncome >= 0 ? 'border-green-500' : 'border-destructive'}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">Net {netIncome >= 0 ? 'Surplus' : 'Deficit'}</span>
                <span className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {formatKES(Math.abs(netIncome))}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
