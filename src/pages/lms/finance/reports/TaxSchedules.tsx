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

interface TaxLine {
  account_code: string;
  account_name: string;
  debit_total: number;
  credit_total: number;
  net_payable: number;
}

export default function TaxSchedules() {
  const { isAdmin } = useAuth();
  const [taxLines, setTaxLines] = useState<TaxLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch tax-related accounts (VAT, WHT, PAYE, statutory)
      const taxCodes = ['2201', '2202', '2203', '2204', '2205', '2206', '2207', '2208'];
      const { data: taxAccounts } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name')
        .in('account_code', taxCodes)
        .eq('is_active', true)
        .order('account_code');

      if (!taxAccounts || taxAccounts.length === 0) {
        setTaxLines([]);
        setLoading(false);
        return;
      }

      const accountIds = taxAccounts.map(a => a.id);

      // Fetch GL entries for tax accounts
      const { data: ledger } = await supabase
        .from('general_ledger')
        .select('account_id, debit, credit')
        .in('account_id', accountIds)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate);

      const balanceMap = new Map<string, { debit: number; credit: number }>();
      (ledger || []).forEach((e: any) => {
        const existing = balanceMap.get(e.account_id) || { debit: 0, credit: 0 };
        existing.debit += Number(e.debit) || 0;
        existing.credit += Number(e.credit) || 0;
        balanceMap.set(e.account_id, existing);
      });

      const lines: TaxLine[] = taxAccounts.map((acc: any) => {
        const bal = balanceMap.get(acc.id) || { debit: 0, credit: 0 };
        return {
          account_code: acc.account_code,
          account_name: acc.account_name,
          debit_total: bal.debit,
          credit_total: bal.credit,
          net_payable: bal.credit - bal.debit, // Liability: credit > debit means payable
        };
      });

      setTaxLines(lines);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load tax schedules');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(n);
  const totalPayable = taxLines.reduce((s, l) => s + Math.max(l.net_payable, 0), 0);

  if (!isAdmin) return <div className="p-6"><p className="text-muted-foreground">Access denied.</p></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tax Schedules</h1>
          <p className="text-muted-foreground">Statutory deductions and tax obligations summary</p>
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

      <Card>
        <CardHeader><CardTitle>Tax Obligations</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Tax Type</TableHead>
                  <TableHead className="text-right">Debits (Payments)</TableHead>
                  <TableHead className="text-right">Credits (Accrued)</TableHead>
                  <TableHead className="text-right">Net Payable</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taxLines.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No tax entries for this period. Tax obligations will appear when payroll is processed.</TableCell></TableRow>
                ) : taxLines.map((line, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{line.account_code}</TableCell>
                    <TableCell className="font-medium">{line.account_name}</TableCell>
                    <TableCell className="text-right">{line.debit_total > 0 ? fmt(line.debit_total) : '-'}</TableCell>
                    <TableCell className="text-right">{line.credit_total > 0 ? fmt(line.credit_total) : '-'}</TableCell>
                    <TableCell className={`text-right font-medium ${line.net_payable > 0 ? 'text-destructive' : ''}`}>
                      {line.net_payable > 0 ? fmt(line.net_payable) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted">
                  <TableCell colSpan={4}>Total Tax Payable</TableCell>
                  <TableCell className="text-right text-destructive">{fmt(totalPayable)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
