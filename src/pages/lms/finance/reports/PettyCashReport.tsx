import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PettyCashEntry {
  date: string;
  reference: string;
  description: string;
  receipts: number;
  payments: number;
  balance: number;
}

interface CashAccountSummary {
  id: string;
  name: string;
  imprestLimit: number;
  currentBalance: number;
  entries: PettyCashEntry[];
}

export default function PettyCashReport() {
  const { isAdmin } = useAuth();
  const [accounts, setAccounts] = useState<CashAccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch petty cash accounts
      const { data: cashAccounts } = await supabase
        .from('cash_accounts')
        .select('id, name, imprest_limit, current_balance, opening_balance')
        .eq('is_petty_cash', true)
        .eq('is_active', true)
        .order('name');

      if (!cashAccounts || cashAccounts.length === 0) {
        // Also check regular cash accounts
        const { data: allCash } = await supabase
          .from('cash_accounts')
          .select('id, name, imprest_limit, current_balance, opening_balance')
          .eq('is_active', true)
          .order('name');

        if (!allCash || allCash.length === 0) {
          setAccounts([]);
          setLoading(false);
          return;
        }
      }

      const allAccounts = cashAccounts || [];

      // Fetch payments linked to cash accounts
      const { data: feePayments } = await supabase
        .from('fee_payments')
        .select('id, receipt_number, payment_date, amount, notes, cash_account_id, students(other_name, surname)')
        .not('cash_account_id', 'is', null)
        .gte('payment_date', startDate)
        .lte('payment_date', endDate)
        .order('payment_date');

      const { data: expPayments } = await supabase
        .from('payable_payments')
        .select('id, payment_number, payment_date, amount, notes, cash_account_id, vendors(name)')
        .not('cash_account_id', 'is', null)
        .gte('payment_date', startDate)
        .lte('payment_date', endDate)
        .order('payment_date');

      const summaries: CashAccountSummary[] = allAccounts.map((ca: any) => {
        const entries: PettyCashEntry[] = [];
        let balance = Number(ca.opening_balance) || 0;

        // Fee receipts to this cash account
        (feePayments || [])
          .filter((p: any) => p.cash_account_id === ca.id)
          .forEach((p: any) => {
            const amt = Number(p.amount) || 0;
            balance += amt;
            entries.push({
              date: p.payment_date,
              reference: p.receipt_number,
              description: `Fee from ${p.students ? `${p.students.other_name} ${p.students.surname}` : 'Student'}`,
              receipts: amt,
              payments: 0,
              balance,
            });
          });

        // Expense payments from this cash account
        (expPayments || [])
          .filter((p: any) => p.cash_account_id === ca.id)
          .forEach((p: any) => {
            const amt = Number(p.amount) || 0;
            balance -= amt;
            entries.push({
              date: p.payment_date,
              reference: p.payment_number,
              description: `Payment to ${p.vendors?.name || 'Vendor'}`,
              receipts: 0,
              payments: amt,
              balance,
            });
          });

        entries.sort((a, b) => a.date.localeCompare(b.date));

        // Recalculate running balance
        let rb = Number(ca.opening_balance) || 0;
        entries.forEach(e => { rb += e.receipts - e.payments; e.balance = rb; });

        return {
          id: ca.id,
          name: ca.name,
          imprestLimit: Number(ca.imprest_limit) || 0,
          currentBalance: balance,
          entries,
        };
      });

      setAccounts(summaries);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load petty cash report');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(n);

  if (!isAdmin) return <div className="p-6"><p className="text-muted-foreground">Access denied.</p></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Petty Cash Report</h1>
          <p className="text-muted-foreground">Petty cash movements and reconciliation</p>
        </div>
        <Button variant="outline"><Download className="mr-2 h-4 w-4" />Export</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Report Period</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
            <div className="space-y-2"><Label>End Date</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
            <Button onClick={fetchData}>Generate</Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : accounts.length === 0 ? (
        <Card><CardContent className="pt-6"><p className="text-center text-muted-foreground py-8">No petty cash accounts configured. Set up cash accounts under Cash & Bank Management.</p></CardContent></Card>
      ) : (
        accounts.map(acc => (
          <Card key={acc.id}>
            <CardHeader>
              <CardTitle className="flex justify-between">
                <span>{acc.name}</span>
                <span className="text-sm font-normal text-muted-foreground">
                  Imprest Limit: {fmt(acc.imprestLimit)} | Current Balance: {fmt(acc.currentBalance)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                  {acc.entries.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No transactions</TableCell></TableRow>
                  ) : acc.entries.map((e, i) => (
                    <TableRow key={i}>
                      <TableCell>{format(new Date(e.date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="font-mono text-xs">{e.reference}</TableCell>
                      <TableCell>{e.description}</TableCell>
                      <TableCell className="text-right text-green-600">{e.receipts > 0 ? fmt(e.receipts) : '-'}</TableCell>
                      <TableCell className="text-right text-destructive">{e.payments > 0 ? fmt(e.payments) : '-'}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(e.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {acc.entries.length > 0 && (
                <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
                  <div><p className="text-sm text-muted-foreground">Total Receipts</p><p className="font-bold text-green-600">{fmt(acc.entries.reduce((s, e) => s + e.receipts, 0))}</p></div>
                  <div><p className="text-sm text-muted-foreground">Total Payments</p><p className="font-bold text-destructive">{fmt(acc.entries.reduce((s, e) => s + e.payments, 0))}</p></div>
                  <div><p className="text-sm text-muted-foreground">Imprest Utilization</p><p className="font-bold">{acc.imprestLimit > 0 ? `${Math.round((acc.entries.reduce((s, e) => s + e.payments, 0) / acc.imprestLimit) * 100)}%` : 'N/A'}</p></div>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
