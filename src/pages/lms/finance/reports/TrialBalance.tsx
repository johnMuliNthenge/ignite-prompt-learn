import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  computeTrialBalanceEntry,
  formatKES,
} from '@/lib/finance-utils';

interface TrialBalanceEntry {
  account_id: string | null;
  account_code: string;
  account_name: string;
  account_type: string;
  debit_balance: number;
  credit_balance: number;
}

export default function TrialBalance() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<TrialBalanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => { fetchTrialBalance(); }, []);

  const fetchTrialBalance = async () => {
    setLoading(true);
    try {
      const data = await fetchFinanceDataSources({ dateFilter: { endDate: asOfDate } });
      const transactions = buildSyntheticTransactions(data);
      const balanceMap = buildBalanceMap(transactions, data.prepayAccId, data.debtorsId);

      const formattedEntries: TrialBalanceEntry[] = data.accounts.map(acc => {
        const bal = balanceMap.get(acc.id) || { debit: 0, credit: 0 };
        const { debit_balance, credit_balance } = computeTrialBalanceEntry(
          bal.debit, bal.credit, acc.normal_balance
        );
        return {
          account_id: acc.id,
          account_code: acc.account_code,
          account_name: acc.account_name,
          account_type: acc.account_type,
          debit_balance,
          credit_balance,
        };
      });

      const nonZero = formattedEntries.filter(e => e.debit_balance > 0 || e.credit_balance > 0);
      setEntries(nonZero.length > 0 ? nonZero : formattedEntries);
    } catch (error) {
      console.error('Error fetching trial balance:', error);
      toast.error('Failed to load trial balance');
    } finally {
      setLoading(false);
    }
  };

  const handleAccountClick = (entry: TrialBalanceEntry) => {
    if (entry.account_id) {
      navigate(`/lms/finance/reports/general-ledger?accountId=${entry.account_id}&endDate=${asOfDate}`);
    }
  };

  const totalDebits = entries.reduce((sum, e) => sum + e.debit_balance, 0);
  const totalCredits = entries.reduce((sum, e) => sum + e.credit_balance, 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  if (!isAdmin) {
    return <div className="p-6"><p className="text-muted-foreground">You don't have access to this page.</p></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Trial Balance</h1>
          <p className="text-muted-foreground">View account balances as of a specific date</p>
        </div>
        <Button variant="outline"><Download className="mr-2 h-4 w-4" />Export</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Report Parameters</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <Label>As of Date</Label>
              <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
            </div>
            <Button onClick={fetchTrialBalance}>Generate Report</Button>
          </div>
        </CardContent>
      </Card>

      <Card className={isBalanced ? 'border-green-500' : 'border-destructive'}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            {isBalanced ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-600 font-medium">Trial Balance is balanced</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-destructive" />
                <span className="text-destructive font-medium">
                  Trial Balance is NOT balanced - Difference: {formatKES(Math.abs(totalDebits - totalCredits))}
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trial Balance as of {format(new Date(asOfDate), 'dd MMMM yyyy')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No accounts with balances found. Create transactions to see balances.
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono">{entry.account_code}</TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleAccountClick(entry)}
                          className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors text-left font-medium"
                        >
                          {entry.account_name}
                        </button>
                      </TableCell>
                      <TableCell>{entry.account_type}</TableCell>
                      <TableCell className="text-right">
                        {entry.debit_balance > 0 ? formatKES(entry.debit_balance) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.credit_balance > 0 ? formatKES(entry.credit_balance) : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
                <TableRow className="font-bold bg-muted">
                  <TableCell colSpan={3}>TOTAL</TableCell>
                  <TableCell className="text-right">{formatKES(totalDebits)}</TableCell>
                  <TableCell className="text-right">{formatKES(totalCredits)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
