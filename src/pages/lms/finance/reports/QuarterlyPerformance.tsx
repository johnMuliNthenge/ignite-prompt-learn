import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfQuarter, endOfQuarter } from 'date-fns';

interface QuarterRow {
  account_code: string;
  account_name: string;
  account_type: string;
  amounts: number[]; // per quarter
}

export default function QuarterlyPerformance() {
  const { isAdmin } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [rows, setRows] = useState<QuarterRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const yr = parseInt(year);

      // Fetch Income/Expense accounts
      const { data: accounts } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name, account_type')
        .eq('is_active', true)
        .in('account_type', ['Income', 'Expense'])
        .order('account_code');

      const quarterRanges = [0, 1, 2, 3].map(q => {
        const s = startOfQuarter(new Date(yr, q * 3, 1));
        return { start: format(s, 'yyyy-MM-dd'), end: format(endOfQuarter(s), 'yyyy-MM-dd') };
      });

      // Fetch GL for full year
      const { data: ledger } = await supabase
        .from('general_ledger')
        .select('account_id, debit, credit, transaction_date')
        .gte('transaction_date', quarterRanges[0].start)
        .lte('transaction_date', quarterRanges[3].end);

      // Also supplement with fee invoices
      const { data: invoiceItems } = await supabase
        .from('fee_invoice_items')
        .select('total, fee_account_id, fee_accounts(account_id), fee_invoices!inner(invoice_date)')
        .gte('fee_invoices.invoice_date', quarterRanges[0].start)
        .lte('fee_invoices.invoice_date', quarterRanges[3].end);

      // Build quarterly balances per account
      const resultRows: QuarterRow[] = (accounts || []).map((acc: any) => {
        const amounts = quarterRanges.map((qr, qi) => {
          // GL entries for this quarter and account
          const glEntries = (ledger || []).filter((e: any) =>
            e.account_id === acc.id && e.transaction_date >= qr.start && e.transaction_date <= qr.end
          );
          let net = glEntries.reduce((s: number, e: any) => s + (Number(e.debit) || 0) - (Number(e.credit) || 0), 0);

          // Supplement income from invoices if GL is empty for this account
          if (net === 0 && acc.account_type === 'Income') {
            const invItems = (invoiceItems || []).filter((item: any) => {
              const invDate = item.fee_invoices?.invoice_date;
              return item.fee_accounts?.account_id === acc.id && invDate >= qr.start && invDate <= qr.end;
            });
            const invTotal = invItems.reduce((s: number, item: any) => s + (Number(item.total) || 0), 0);
            if (invTotal > 0) net = -invTotal; // Income is credit (negative net)
          }

          return acc.account_type === 'Income' ? Math.abs(net) : Math.max(net, 0);
        });

        return {
          account_code: acc.account_code,
          account_name: acc.account_name,
          account_type: acc.account_type,
          amounts,
        };
      }).filter((r: QuarterRow) => r.amounts.some(a => a > 0));

      setRows(resultRows);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load quarterly performance');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(n);

  if (!isAdmin) return <div className="p-6"><p className="text-muted-foreground">Access denied.</p></div>;

  const incomeRows = rows.filter(r => r.account_type === 'Income');
  const expenseRows = rows.filter(r => r.account_type === 'Expense');
  const qLabels = ['Q1', 'Q2', 'Q3', 'Q4'];

  const qTotalIncome = [0, 1, 2, 3].map(qi => incomeRows.reduce((s, r) => s + r.amounts[qi], 0));
  const qTotalExpense = [0, 1, 2, 3].map(qi => expenseRows.reduce((s, r) => s + r.amounts[qi], 0));
  const qNetSurplus = [0, 1, 2, 3].map(qi => qTotalIncome[qi] - qTotalExpense[qi]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Quarterly Statement of Financial Performance</h1>
          <p className="text-muted-foreground">IPSAS quarterly income & expenditure comparison</p>
        </div>
        <Button variant="outline"><Download className="mr-2 h-4 w-4" />Export</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Select Year</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <Label>Financial Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={fetchData}>Generate</Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : (
        <Card>
          <CardContent className="pt-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead className="min-w-[200px]">Account</TableHead>
                  {qLabels.map(q => <TableHead key={q} className="text-right">{q}</TableHead>)}
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-muted/30 font-semibold"><TableCell colSpan={7}>Revenue</TableCell></TableRow>
                {incomeRows.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No revenue</TableCell></TableRow>
                ) : incomeRows.map(r => (
                  <TableRow key={r.account_code}>
                    <TableCell className="font-mono text-xs">{r.account_code}</TableCell>
                    <TableCell>{r.account_name}</TableCell>
                    {r.amounts.map((a, i) => <TableCell key={i} className="text-right">{a > 0 ? fmt(a) : '-'}</TableCell>)}
                    <TableCell className="text-right font-medium">{fmt(r.amounts.reduce((s, a) => s + a, 0))}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold border-t bg-green-50">
                  <TableCell colSpan={2}>Total Revenue</TableCell>
                  {qTotalIncome.map((t, i) => <TableCell key={i} className="text-right text-green-600">{fmt(t)}</TableCell>)}
                  <TableCell className="text-right text-green-600">{fmt(qTotalIncome.reduce((s, t) => s + t, 0))}</TableCell>
                </TableRow>

                <TableRow className="bg-muted/30 font-semibold"><TableCell colSpan={7}>Expenditure</TableCell></TableRow>
                {expenseRows.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No expenditure</TableCell></TableRow>
                ) : expenseRows.map(r => (
                  <TableRow key={r.account_code}>
                    <TableCell className="font-mono text-xs">{r.account_code}</TableCell>
                    <TableCell>{r.account_name}</TableCell>
                    {r.amounts.map((a, i) => <TableCell key={i} className="text-right">{a > 0 ? fmt(a) : '-'}</TableCell>)}
                    <TableCell className="text-right font-medium">{fmt(r.amounts.reduce((s, a) => s + a, 0))}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold border-t bg-red-50">
                  <TableCell colSpan={2}>Total Expenditure</TableCell>
                  {qTotalExpense.map((t, i) => <TableCell key={i} className="text-right text-destructive">{fmt(t)}</TableCell>)}
                  <TableCell className="text-right text-destructive">{fmt(qTotalExpense.reduce((s, t) => s + t, 0))}</TableCell>
                </TableRow>

                <TableRow className="font-bold border-t-2 bg-muted">
                  <TableCell colSpan={2}>Net Surplus / (Deficit)</TableCell>
                  {qNetSurplus.map((t, i) => (
                    <TableCell key={i} className={`text-right ${t >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {t < 0 ? `(${fmt(Math.abs(t))})` : fmt(t)}
                    </TableCell>
                  ))}
                  <TableCell className={`text-right ${qNetSurplus.reduce((s, t) => s + t, 0) >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {fmt(qNetSurplus.reduce((s, t) => s + t, 0))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
