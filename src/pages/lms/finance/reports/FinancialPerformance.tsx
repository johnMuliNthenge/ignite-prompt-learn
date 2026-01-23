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

interface IncomeExpenseItem {
  account_code: string;
  account_name: string;
  amount: number;
}

export default function FinancialPerformance() {
  const { isAdmin } = useAuth();
  const [incomeItems, setIncomeItems] = useState<IncomeExpenseItem[]>([]);
  const [expenseItems, setExpenseItems] = useState<IncomeExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch income accounts
      const { data: incomeData, error: incomeError } = await supabase
        .from('chart_of_accounts')
        .select('account_code, account_name')
        .eq('account_type', 'Income')
        .eq('is_active', true)
        .order('account_code');

      if (incomeError) throw incomeError;

      // Fetch expense accounts
      const { data: expenseData, error: expenseError } = await supabase
        .from('chart_of_accounts')
        .select('account_code, account_name')
        .eq('account_type', 'Expense')
        .eq('is_active', true)
        .order('account_code');

      if (expenseError) throw expenseError;

      // For now, show accounts with zero amounts - in production, calculate from ledger
      setIncomeItems((incomeData || []).map((acc: any) => ({
        account_code: acc.account_code,
        account_name: acc.account_name,
        amount: 0,
      })));

      setExpenseItems((expenseData || []).map((acc: any) => ({
        account_code: acc.account_code,
        account_name: acc.account_name,
        amount: 0,
      })));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load report data');
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

  const totalIncome = incomeItems.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = expenseItems.reduce((sum, item) => sum + item.amount, 0);
  const netIncome = totalIncome - totalExpenses;

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
          <h1 className="text-3xl font-bold">Statement of Financial Performance</h1>
          <p className="text-muted-foreground">Income and expense summary (Profit & Loss)</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Date Selection */}
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
            <Button onClick={handleGenerate}>
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Income Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">Income</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomeItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        No income accounts
                      </TableCell>
                    </TableRow>
                  ) : (
                    incomeItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <span className="font-mono text-xs mr-2">{item.account_code}</span>
                          {item.account_name}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                      </TableRow>
                    ))
                  )}
                  <TableRow className="font-bold bg-green-50">
                    <TableCell>Total Income</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalIncome)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Expenses Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        No expense accounts
                      </TableCell>
                    </TableRow>
                  ) : (
                    expenseItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <span className="font-mono text-xs mr-2">{item.account_code}</span>
                          {item.account_name}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                      </TableRow>
                    ))
                  )}
                  <TableRow className="font-bold bg-red-50">
                    <TableCell>Total Expenses</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalExpenses)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Net Income Summary */}
      <Card className={netIncome >= 0 ? 'border-green-500' : 'border-red-500'}>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold">Net Income / (Loss)</span>
            <span className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(netIncome)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
