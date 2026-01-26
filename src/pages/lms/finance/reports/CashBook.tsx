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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface CashEntry {
  id: string;
  date: string;
  reference: string;
  description: string;
  receipts: number;
  payments: number;
  balance: number;
}

export default function CashBook() {
  const { isAdmin } = useAuth();
  const [cashEntries, setCashEntries] = useState<CashEntry[]>([]);
  const [bankEntries, setBankEntries] = useState<CashEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch fee payments (receipts) with bank account info
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('fee_payments')
        .select(`
          id,
          payment_date,
          receipt_number,
          amount,
          notes,
          bank_account_id,
          cash_account_id,
          students(other_name, surname)
        `)
        .eq('status', 'Completed')
        .gte('payment_date', startDate)
        .lte('payment_date', endDate)
        .order('payment_date', { ascending: true });

      if (paymentsError) throw paymentsError;

      // Fetch payable payments (expenses)
      const { data: expensesData, error: expensesError } = await supabase
        .from('payable_payments')
        .select(`
          id,
          payment_date,
          payment_number,
          amount,
          notes,
          bank_account_id,
          cash_account_id,
          vendors(name)
        `)
        .eq('status', 'Completed')
        .gte('payment_date', startDate)
        .lte('payment_date', endDate)
        .order('payment_date', { ascending: true });

      // Combine and separate cash vs bank transactions
      const cashTxns: CashEntry[] = [];
      const bankTxns: CashEntry[] = [];
      let cashBalance = 0;
      let bankBalance = 0;

      // Process fee payments (receipts)
      (paymentsData || []).forEach((pay: any) => {
        const studentName = pay.students ? `${pay.students.other_name} ${pay.students.surname}` : 'Unknown';
        const entry: Omit<CashEntry, 'balance'> = {
          id: pay.id,
          date: pay.payment_date,
          reference: pay.receipt_number,
          description: `Fee from ${studentName}`,
          receipts: Number(pay.amount),
          payments: 0,
        };

        if (pay.bank_account_id) {
          bankBalance += Number(pay.amount);
          bankTxns.push({ ...entry, balance: bankBalance });
        } else {
          cashBalance += Number(pay.amount);
          cashTxns.push({ ...entry, balance: cashBalance });
        }
      });

      // Process payable payments (expenses)
      (expensesData || []).forEach((exp: any) => {
        const vendorName = exp.vendors?.name || 'Unknown Vendor';
        const entry: Omit<CashEntry, 'balance'> = {
          id: exp.id,
          date: exp.payment_date,
          reference: exp.payment_number,
          description: `Payment to ${vendorName}`,
          receipts: 0,
          payments: Number(exp.amount),
        };

        if (exp.bank_account_id) {
          bankBalance -= Number(exp.amount);
          bankTxns.push({ ...entry, balance: bankBalance });
        } else {
          cashBalance -= Number(exp.amount);
          cashTxns.push({ ...entry, balance: cashBalance });
        }
      });

      // Sort by date
      cashTxns.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      bankTxns.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Recalculate running balances
      let runningCash = 0;
      cashTxns.forEach(txn => {
        runningCash += txn.receipts - txn.payments;
        txn.balance = runningCash;
      });

      let runningBank = 0;
      bankTxns.forEach(txn => {
        runningBank += txn.receipts - txn.payments;
        txn.balance = runningBank;
      });

      setCashEntries(cashTxns);
      setBankEntries(bankTxns);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load cash book');
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

  const totalCashReceipts = cashEntries.reduce((sum, e) => sum + e.receipts, 0);
  const totalCashPayments = cashEntries.reduce((sum, e) => sum + e.payments, 0);
  const totalBankReceipts = bankEntries.reduce((sum, e) => sum + e.receipts, 0);
  const totalBankPayments = bankEntries.reduce((sum, e) => sum + e.payments, 0);

  if (!isAdmin) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">You don't have access to this page.</p>
      </div>
    );
  }

  const renderTransactionTable = (entries: CashEntry[], type: 'cash' | 'bank') => (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Receipts</TableHead>
            <TableHead className="text-right">Payments</TableHead>
            <TableHead className="text-right">Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No {type} transactions found for this period
              </TableCell>
            </TableRow>
          ) : (
            entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{format(new Date(entry.date), 'dd/MM/yyyy')}</TableCell>
                <TableCell className="font-mono">{entry.reference}</TableCell>
                <TableCell>{entry.description}</TableCell>
                <TableCell className="text-right text-green-600">
                  {entry.receipts > 0 ? formatCurrency(entry.receipts) : '-'}
                </TableCell>
                <TableCell className="text-right text-destructive">
                  {entry.payments > 0 ? formatCurrency(entry.payments) : '-'}
                </TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(entry.balance)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {entries.length > 0 && (
        <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Total Receipts</p>
            <p className="text-lg font-bold text-green-600">
              {formatCurrency(type === 'cash' ? totalCashReceipts : totalBankReceipts)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Total Payments</p>
            <p className="text-lg font-bold text-destructive">
              {formatCurrency(type === 'cash' ? totalCashPayments : totalBankPayments)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Net Movement</p>
            <p className="text-lg font-bold">
              {formatCurrency(type === 'cash' 
                ? totalCashReceipts - totalCashPayments 
                : totalBankReceipts - totalBankPayments)}
            </p>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Cash Book</h1>
          <p className="text-muted-foreground">Record of all cash and bank transactions</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
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
            <Button onClick={handleGenerate}>
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="cash" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cash">Cash Account ({cashEntries.length})</TabsTrigger>
          <TabsTrigger value="bank">Bank Account ({bankEntries.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="cash">
          <Card>
            <CardHeader>
              <CardTitle>Cash Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : renderTransactionTable(cashEntries, 'cash')}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bank">
          <Card>
            <CardHeader>
              <CardTitle>Bank Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : renderTransactionTable(bankEntries, 'bank')}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
