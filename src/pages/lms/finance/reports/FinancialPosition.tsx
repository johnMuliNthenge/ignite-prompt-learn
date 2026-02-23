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
import { Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface BalanceItem {
  account_code: string;
  account_name: string;
  group_name: string;
  amount: number;
}

interface GroupedSection {
  group: string;
  items: BalanceItem[];
  total: number;
}

export default function FinancialPosition() {
  const { isAdmin } = useAuth();
  const [assets, setAssets] = useState<GroupedSection[]>([]);
  const [liabilities, setLiabilities] = useState<GroupedSection[]>([]);
  const [equity, setEquity] = useState<GroupedSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch accounts with groups
      const { data: accountsData, error: accErr } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name, account_type, normal_balance, account_groups(name)')
        .eq('is_active', true)
        .order('account_code');
      if (accErr) throw accErr;

      // Fetch ALL ledger entries up to asOfDate
      const { data: ledgerData, error: ledErr } = await supabase
        .from('general_ledger')
        .select('account_id, debit, credit')
        .lte('transaction_date', asOfDate);
      if (ledErr) throw ledErr;

      // Build balance map from GL
      const balanceMap = new Map<string, number>();
      (ledgerData || []).forEach((e: any) => {
        const existing = balanceMap.get(e.account_id) || 0;
        balanceMap.set(e.account_id, existing + (Number(e.debit) || 0) - (Number(e.credit) || 0));
      });

      // Supplement: Student Debtors from fee_invoices/fee_payments
      const { data: invoices } = await supabase
        .from('fee_invoices')
        .select('total_amount')
        .lte('invoice_date', asOfDate);
      const { data: payments } = await supabase
        .from('fee_payments')
        .select('amount')
        .eq('status', 'Completed')
        .lte('payment_date', asOfDate);

      const totalInvoiced = (invoices || []).reduce((s, i) => s + (Number(i.total_amount) || 0), 0);
      const totalPaid = (payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const netReceivable = totalInvoiced - totalPaid;

      // Find student debtors account and prepayment account
      const debtorsAcc = (accountsData || []).find((a: any) => a.account_code === '1201');
      const prepayAcc = (accountsData || []).find((a: any) => a.account_code === '2103');

      // Add synthetic balances if not already in GL
      if (debtorsAcc && netReceivable > 0) {
        const glBal = balanceMap.get(debtorsAcc.id) || 0;
        if (glBal === 0) balanceMap.set(debtorsAcc.id, netReceivable);
      }
      if (prepayAcc && netReceivable < 0) {
        const glBal = balanceMap.get(prepayAcc.id) || 0;
        if (glBal === 0) balanceMap.set(prepayAcc.id, Math.abs(netReceivable));
      }

      // Cash/Bank from fee payments received
      const cashAcc = (accountsData || []).find((a: any) => a.account_code === '1102');
      if (cashAcc) {
        const glBal = balanceMap.get(cashAcc.id) || 0;
        if (glBal === 0 && totalPaid > 0) {
          // Check if voucher payments exist
          const { data: voucherPayments } = await supabase
            .from('payable_payments')
            .select('amount')
            .eq('status', 'Completed')
            .lte('payment_date', asOfDate);
          const totalExpensePaid = (voucherPayments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
          balanceMap.set(cashAcc.id, totalPaid - totalExpensePaid);
        }
      }

      // Build grouped sections
      const buildSection = (type: string): GroupedSection[] => {
        const items: BalanceItem[] = (accountsData || [])
          .filter((a: any) => a.account_type === type)
          .map((a: any) => {
            let rawBalance = balanceMap.get(a.id) || 0;
            // For normal debit accounts, positive = debit balance
            // For normal credit accounts, positive net means debit (unusual), negative means credit (normal)
            let amount = 0;
            if (a.normal_balance === 'Debit') {
              amount = rawBalance; // Debit balance is positive
            } else {
              amount = -rawBalance; // Credit balance shown as positive
            }
            return {
              account_code: a.account_code,
              account_name: a.account_name,
              group_name: (a as any).account_groups?.name || 'Other',
              amount,
            };
          })
          .filter(i => Math.abs(i.amount) >= 0.01);

        // Group by group_name
        const groups = new Map<string, BalanceItem[]>();
        items.forEach(i => {
          if (!groups.has(i.group_name)) groups.set(i.group_name, []);
          groups.get(i.group_name)!.push(i);
        });

        return Array.from(groups.entries()).map(([group, groupItems]) => ({
          group,
          items: groupItems,
          total: groupItems.reduce((s, i) => s + i.amount, 0),
        }));
      };

      setAssets(buildSection('Asset'));
      setLiabilities(buildSection('Liability'));
      setEquity(buildSection('Equity'));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(n);
  const totalAssets = assets.reduce((s, g) => s + g.total, 0);
  const totalLiabilities = liabilities.reduce((s, g) => s + g.total, 0);
  const totalEquity = equity.reduce((s, g) => s + g.total, 0);
  const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1;

  if (!isAdmin) return <div className="p-6"><p className="text-muted-foreground">Access denied.</p></div>;

  const renderSection = (sections: GroupedSection[], colorClass: string) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Account Code</TableHead>
          <TableHead>Account Name</TableHead>
          <TableHead className="text-right">Amount (KES)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sections.length === 0 ? (
          <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No data</TableCell></TableRow>
        ) : sections.map((group) => (
          <React.Fragment key={group.group}>
            <TableRow className="bg-muted/30">
              <TableCell colSpan={2} className="font-semibold">{group.group}</TableCell>
              <TableCell />
            </TableRow>
            {group.items.map((item, i) => (
              <TableRow key={i}>
                <TableCell className="font-mono text-xs pl-8">{item.account_code}</TableCell>
                <TableCell className="pl-8">{item.account_name}</TableCell>
                <TableCell className="text-right">{fmt(item.amount)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="border-t">
              <TableCell colSpan={2} className="font-medium pl-8">Sub-total: {group.group}</TableCell>
              <TableCell className="text-right font-medium">{fmt(group.total)}</TableCell>
            </TableRow>
          </React.Fragment>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Statement of Financial Position</h1>
          <p className="text-muted-foreground">IPSAS-compliant Balance Sheet as at {format(new Date(asOfDate), 'dd MMMM yyyy')}</p>
        </div>
        <Button variant="outline"><Download className="mr-2 h-4 w-4" />Export</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Report Date</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <Label>As of Date</Label>
              <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
            </div>
            <Button onClick={fetchData}>Generate Report</Button>
          </div>
        </CardContent>
      </Card>

      {/* Balance Check */}
      <Card className={isBalanced ? 'border-green-500' : 'border-destructive'}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            {isBalanced ? (
              <><CheckCircle className="h-5 w-5 text-green-600" /><span className="text-green-600 font-medium">Balance Sheet is balanced (A = L + E)</span></>
            ) : (
              <><AlertCircle className="h-5 w-5 text-destructive" /><span className="text-destructive font-medium">Unbalanced — Difference: {fmt(Math.abs(totalAssets - totalLiabilities - totalEquity))}</span></>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : (
        <div className="space-y-6">
          {/* Assets */}
          <Card>
            <CardHeader><CardTitle>Assets</CardTitle></CardHeader>
            <CardContent>
              {renderSection(assets, 'blue')}
              <div className="mt-4 pt-4 border-t flex justify-between font-bold text-lg">
                <span>Total Assets</span><span>{fmt(totalAssets)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Liabilities */}
          <Card>
            <CardHeader><CardTitle>Liabilities</CardTitle></CardHeader>
            <CardContent>
              {renderSection(liabilities, 'orange')}
              <div className="mt-4 pt-4 border-t flex justify-between font-bold text-lg">
                <span>Total Liabilities</span><span>{fmt(totalLiabilities)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Equity */}
          <Card>
            <CardHeader><CardTitle>Net Assets / Equity</CardTitle></CardHeader>
            <CardContent>
              {renderSection(equity, 'purple')}
              <div className="mt-4 pt-4 border-t flex justify-between font-bold text-lg">
                <span>Total Equity</span><span>{fmt(totalEquity)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="border-primary">
            <CardContent className="pt-6 space-y-2">
              <div className="flex justify-between"><span>Total Assets</span><span className="font-bold">{fmt(totalAssets)}</span></div>
              <div className="flex justify-between"><span>Total Liabilities</span><span className="font-bold">{fmt(totalLiabilities)}</span></div>
              <div className="flex justify-between"><span>Total Equity</span><span className="font-bold">{fmt(totalEquity)}</span></div>
              <div className="border-t pt-2 flex justify-between text-lg">
                <span className="font-bold">Liabilities + Equity</span>
                <span className="font-bold">{fmt(totalLiabilities + totalEquity)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
