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
      const data = await fetchFinanceDataSources({
        includeGroups: true,
        dateFilter: { startDate, endDate },
      });
      const transactions = buildSyntheticTransactions(data);
      const balanceMap = buildBalanceMap(transactions, data.prepayAccId, data.debtorsId);

      const buildSection = (type: string): GroupedSection[] => {
        const items: LineItem[] = data.accounts
          .filter(a => a.account_type === type)
          .map(a => {
            const bal = balanceMap.get(a.id);
            if (!bal) return null;
            const net = bal.debit - bal.credit;
            const amount = type === 'Income' ? Math.abs(net) : (net > 0 ? net : 0);
            if (amount < 0.01) return null;
            return {
              account_code: a.account_code,
              account_name: a.account_name,
              group_name: a.group_name || 'Other',
              amount,
            };
          })
          .filter((i): i is LineItem => i !== null);

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
        ) : sections.map(group => (
          <React.Fragment key={group.group}>
            <TableRow className="bg-muted/30">
              <TableCell colSpan={2} className="font-semibold">{group.group}</TableCell>
              <TableCell className="text-right font-semibold">{formatKES(group.total)}</TableCell>
            </TableRow>
            {group.items.map((item, i) => (
              <TableRow key={i}>
                <TableCell className="font-mono pl-8">{item.account_code}</TableCell>
                <TableCell className="pl-8">{item.account_name}</TableCell>
                <TableCell className="text-right">{formatKES(item.amount)}</TableCell>
              </TableRow>
            ))}
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
            IPSAS Accrual — {format(new Date(startDate), 'dd MMM yyyy')} to {format(new Date(endDate), 'dd MMM yyyy')}
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
            <CardHeader><CardTitle>Revenue</CardTitle></CardHeader>
            <CardContent>{renderGroupedTable(incomeGroups)}</CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Expenditure</CardTitle></CardHeader>
            <CardContent>{renderGroupedTable(expenseGroups)}</CardContent>
          </Card>

          <Card className={netSurplus >= 0 ? 'border-green-500' : 'border-destructive'}>
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4">
                <div><p className="text-sm text-muted-foreground">Total Revenue</p><p className="text-lg font-bold">{formatKES(totalIncome)}</p></div>
                <div><p className="text-sm text-muted-foreground">Total Expenditure</p><p className="text-lg font-bold">{formatKES(totalExpenses)}</p></div>
                <div>
                  <p className="text-sm text-muted-foreground">Net {netSurplus >= 0 ? 'Surplus' : 'Deficit'}</p>
                  <p className={`text-lg font-bold ${netSurplus >= 0 ? 'text-green-600' : 'text-destructive'}`}>{formatKES(Math.abs(netSurplus))}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
