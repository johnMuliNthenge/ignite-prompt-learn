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
  account_name: string;
  group_name: string;
  amount: number;
}

interface GroupedSection {
  group: string;
  items: LineItem[];
  total: number;
}

export default function FinancialPerformance() {
  const { isAdmin } = useAuth();
  const [incomeGroups, setIncomeGroups] = useState<GroupedSection[]>([]);
  const [expenseGroups, setExpenseGroups] = useState<GroupedSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch accounts with groups
      const { data: accountsData } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name, account_type, normal_balance, account_groups(name)')
        .eq('is_active', true)
        .in('account_type', ['Income', 'Expense'])
        .order('account_code');

      // Fetch GL entries for period
      const { data: ledgerData } = await supabase
        .from('general_ledger')
        .select('account_id, debit, credit')
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate);

      // Build balance map
      const balanceMap = new Map<string, number>();
      (ledgerData || []).forEach((e: any) => {
        const existing = balanceMap.get(e.account_id) || 0;
        balanceMap.set(e.account_id, existing + (Number(e.debit) || 0) - (Number(e.credit) || 0));
      });

      // Supplement: Fee income from invoices (accrual basis)
      const { data: invoiceItems } = await supabase
        .from('fee_invoice_items')
        .select('total, fee_account_id, fee_accounts(account_id), fee_invoices!inner(invoice_date)')
        .gte('fee_invoices.invoice_date', startDate)
        .lte('fee_invoices.invoice_date', endDate);

      (invoiceItems || []).forEach((item: any) => {
        const accId = item.fee_accounts?.account_id;
        if (accId) {
          const glBal = balanceMap.get(accId) || 0;
          // Income: credit increases, so net = debit - credit should be negative for income
          // Only add if GL doesn't already have entries for this account
          if (glBal === 0) {
            balanceMap.set(accId, (balanceMap.get(accId) || 0) - (Number(item.total) || 0));
          }
        }
      });

      // Supplement: Expense from payment vouchers (accrual: when voucher created, not when paid)
      const { data: vouchers } = await supabase
        .from('payment_vouchers')
        .select('id, amount, voucher_date, status')
        .neq('status', 'Draft')
        .gte('voucher_date', startDate)
        .lte('voucher_date', endDate);

      // Build items
      const buildSection = (type: string): GroupedSection[] => {
        const items: LineItem[] = (accountsData || [])
          .filter((a: any) => a.account_type === type)
          .map((a: any) => {
            const rawBal = balanceMap.get(a.id) || 0;
            // Income: normal credit, so negative rawBal = income earned
            // Expense: normal debit, so positive rawBal = expense incurred
            const amount = type === 'Income' ? Math.abs(rawBal) : rawBal;
            return {
              account_code: a.account_code,
              account_name: a.account_name,
              group_name: (a as any).account_groups?.name || 'Other',
              amount: Math.abs(amount),
            };
          })
          .filter(i => i.amount >= 0.01);

        const groups = new Map<string, LineItem[]>();
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

      setIncomeGroups(buildSection('Income'));
      setExpenseGroups(buildSection('Expense'));
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(n);
  const totalIncome = incomeGroups.reduce((s, g) => s + g.total, 0);
  const totalExpenses = expenseGroups.reduce((s, g) => s + g.total, 0);
  const netSurplus = totalIncome - totalExpenses;

  if (!isAdmin) return <div className="p-6"><p className="text-muted-foreground">Access denied.</p></div>;

  const renderGroupedTable = (sections: GroupedSection[]) => (
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
          <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No transactions for this period</TableCell></TableRow>
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
              <TableCell colSpan={2} className="font-medium pl-8 italic">Sub-total: {group.group}</TableCell>
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
          <h1 className="text-3xl font-bold">Statement of Financial Performance</h1>
          <p className="text-muted-foreground">
            IPSAS Income & Expenditure for {format(new Date(startDate), 'dd MMM yyyy')} to {format(new Date(endDate), 'dd MMM yyyy')}
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
            <CardHeader><CardTitle className="text-green-600">Revenue</CardTitle></CardHeader>
            <CardContent>
              {renderGroupedTable(incomeGroups)}
              <div className="mt-4 pt-4 border-t flex justify-between font-bold text-lg text-green-600">
                <span>Total Revenue</span><span>{fmt(totalIncome)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-destructive">Expenditure</CardTitle></CardHeader>
            <CardContent>
              {renderGroupedTable(expenseGroups)}
              <div className="mt-4 pt-4 border-t flex justify-between font-bold text-lg text-destructive">
                <span>Total Expenditure</span><span>{fmt(totalExpenses)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className={netSurplus >= 0 ? 'border-green-500' : 'border-destructive'}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold">Net {netSurplus >= 0 ? 'Surplus' : 'Deficit'}</span>
                <span className={`text-2xl font-bold ${netSurplus >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {fmt(Math.abs(netSurplus))}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
