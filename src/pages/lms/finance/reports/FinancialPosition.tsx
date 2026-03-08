import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
import {
  fetchFinanceDataSources,
  buildSyntheticTransactions,
  buildBalanceMap,
  formatKES,
} from '@/lib/finance-utils';

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
      const data = await fetchFinanceDataSources({
        includeGroups: true,
        dateFilter: { endDate: asOfDate },
      });
      const transactions = buildSyntheticTransactions(data);
      const balanceMap = buildBalanceMap(transactions, data.prepayAccId, data.debtorsId);

      // Compute accumulated surplus for equity (IPSAS: Revenue - Expenses)
      let totalIncome = 0, totalExpense = 0;
      data.accounts.forEach(acc => {
        const bal = balanceMap.get(acc.id);
        if (!bal) return;
        const net = bal.debit - bal.credit;
        if (acc.account_type === 'Income') totalIncome += Math.abs(net);
        else if (acc.account_type === 'Expense') totalExpense += (net > 0 ? net : 0);
      });
      const netSurplus = totalIncome - totalExpense;

      // Find accumulated surplus account and set its balance
      const accSurplusAcc = data.accounts.find(a =>
        a.account_type === 'Equity' && (
          a.account_name?.toLowerCase().includes('accumulated') ||
          a.account_name?.toLowerCase().includes('surplus') ||
          a.account_name?.toLowerCase().includes('retained') ||
          a.account_code === '3100'
        )
      );
      if (accSurplusAcc && netSurplus !== 0) {
        const existing = balanceMap.get(accSurplusAcc.id) || { debit: 0, credit: 0 };
        if (existing.debit === 0 && existing.credit === 0) {
          // Equity normal credit: surplus is credit
          balanceMap.set(accSurplusAcc.id, { debit: 0, credit: netSurplus > 0 ? netSurplus : 0 });
          if (netSurplus < 0) {
            balanceMap.set(accSurplusAcc.id, { debit: Math.abs(netSurplus), credit: 0 });
          }
        }
      }

      const buildSection = (type: string): GroupedSection[] => {
        const items: BalanceItem[] = data.accounts
          .filter(a => a.account_type === type)
          .map(a => {
            const bal = balanceMap.get(a.id);
            if (!bal) return null;
            const net = bal.debit - bal.credit;
            let amount = 0;
            if (a.normal_balance === 'Debit') {
              amount = net;
            } else {
              amount = -net; // Credit balance shown as positive
            }
            if (Math.abs(amount) < 0.01) return null;
            return { account_code: a.account_code, account_name: a.account_name, group_name: a.group_name || 'Other', amount };
          })
          .filter((i): i is BalanceItem => i !== null);

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

  const totalAssets = assets.reduce((s, g) => s + g.total, 0);
  const totalLiabilities = liabilities.reduce((s, g) => s + g.total, 0);
  const totalEquity = equity.reduce((s, g) => s + g.total, 0);
  const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1;

  if (!isAdmin) return <div className="p-6"><p className="text-muted-foreground">Access denied.</p></div>;

  const renderSection = (sections: GroupedSection[]) => (
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
        ) : sections.map(group => (
          <React.Fragment key={group.group}>
            <TableRow className="bg-muted/30">
              <TableCell colSpan={2} className="font-semibold">{group.group}</TableCell>
              <TableCell />
            </TableRow>
            {group.items.map((item, i) => (
              <TableRow key={i}>
                <TableCell className="font-mono text-xs pl-8">{item.account_code}</TableCell>
                <TableCell className="pl-8">{item.account_name}</TableCell>
                <TableCell className="text-right">{formatKES(item.amount)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="border-t">
              <TableCell colSpan={2} className="font-medium pl-8">Sub-total: {group.group}</TableCell>
              <TableCell className="text-right font-medium">{formatKES(group.total)}</TableCell>
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
            <div className="space-y-2"><Label>As of Date</Label><Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} /></div>
            <Button onClick={fetchData}>Generate Report</Button>
          </div>
        </CardContent>
      </Card>

      <Card className={isBalanced ? 'border-green-500' : 'border-destructive'}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            {isBalanced ? (
              <><CheckCircle className="h-5 w-5 text-green-600" /><span className="text-green-600 font-medium">Balance Sheet is balanced (A = L + E)</span></>
            ) : (
              <><AlertCircle className="h-5 w-5 text-destructive" /><span className="text-destructive font-medium">Unbalanced — Difference: {formatKES(Math.abs(totalAssets - totalLiabilities - totalEquity))}</span></>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Assets</CardTitle></CardHeader>
            <CardContent>
              {renderSection(assets)}
              <div className="mt-4 pt-4 border-t flex justify-between font-bold text-lg"><span>Total Assets</span><span>{formatKES(totalAssets)}</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Liabilities</CardTitle></CardHeader>
            <CardContent>
              {renderSection(liabilities)}
              <div className="mt-4 pt-4 border-t flex justify-between font-bold text-lg"><span>Total Liabilities</span><span>{formatKES(totalLiabilities)}</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Net Assets / Equity</CardTitle></CardHeader>
            <CardContent>
              {renderSection(equity)}
              <div className="mt-4 pt-4 border-t flex justify-between font-bold text-lg"><span>Total Equity</span><span>{formatKES(totalEquity)}</span></div>
            </CardContent>
          </Card>

          <Card className="border-primary">
            <CardContent className="pt-6 space-y-2">
              <div className="flex justify-between"><span>Total Assets</span><span className="font-bold">{formatKES(totalAssets)}</span></div>
              <div className="flex justify-between"><span>Total Liabilities</span><span className="font-bold">{formatKES(totalLiabilities)}</span></div>
              <div className="flex justify-between"><span>Total Equity</span><span className="font-bold">{formatKES(totalEquity)}</span></div>
              <div className="border-t pt-2 flex justify-between text-lg">
                <span className="font-bold">Liabilities + Equity</span>
                <span className="font-bold">{formatKES(totalLiabilities + totalEquity)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
