import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Search, Download, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  fetchFinanceDataSources,
  buildSyntheticTransactions,
  formatKES,
  type SyntheticTransaction,
  type AccountInfo,
} from '@/lib/finance-utils';

const ROWS_PER_PAGE = 10;

export default function GeneralLedger() {
  const { isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const [transactions, setTransactions] = useState<SyntheticTransaction[]>([]);
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<string>(searchParams.get('accountId') || 'all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      // Fetch ALL data (no date filter at query level - we filter client-side for flexibility)
      const data = await fetchFinanceDataSources({ includeStudents: true });
      setAccounts(data.accounts);
      const txns = buildSyntheticTransactions(data);
      setTransactions(txns);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load ledger entries');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    if (selectedAccount && selectedAccount !== 'all') {
      filtered = filtered.filter(t => t.lines.some(l => l.account_id === selectedAccount));
    }
    if (startDate) filtered = filtered.filter(t => t.date >= startDate);
    if (endDate) filtered = filtered.filter(t => t.date <= endDate);
    return filtered;
  }, [transactions, selectedAccount, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / ROWS_PER_PAGE));
  const paginatedTx = filteredTransactions.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  // Compute totals - when filtered by account, only sum that account's lines
  const { totalDebits, totalCredits } = useMemo(() => {
    let dr = 0, cr = 0;
    filteredTransactions.forEach(t => {
      t.lines.forEach(l => {
        if (selectedAccount && selectedAccount !== 'all') {
          if (l.account_id === selectedAccount) { dr += l.debit; cr += l.credit; }
        } else {
          dr += l.debit; cr += l.credit;
        }
      });
    });
    return { totalDebits: dr, totalCredits: cr };
  }, [filteredTransactions, selectedAccount]);

  if (!isAdmin) {
    return <div className="p-6"><p className="text-muted-foreground">You don't have access to this page.</p></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">General Ledger</h1>
          <p className="text-muted-foreground">All transactions in double-entry format</p>
        </div>
        <Button variant="outline"><Download className="mr-2 h-4 w-4" />Export</Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Filters</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Vote Head (Account)</Label>
              <Select value={selectedAccount} onValueChange={(v) => { setSelectedAccount(v); setCurrentPage(1); }}>
                <SelectTrigger><SelectValue placeholder="All accounts" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.account_code} - {acc.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }} />
            </div>
            <div className="flex items-end">
              <Button onClick={() => setCurrentPage(1)} className="w-full">
                <Search className="mr-2 h-4 w-4" />Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Balance Summary */}
      {selectedAccount && selectedAccount !== 'all' && !loading && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Debits</p>
                <p className="text-lg font-bold">{formatKES(totalDebits)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Credits</p>
                <p className="text-lg font-bold">{formatKES(totalCredits)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net Balance</p>
                <p className="text-lg font-bold">
                  {formatKES(Math.abs(totalDebits - totalCredits))} {totalDebits >= totalCredits ? 'Dr' : 'Cr'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ledger Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Ledger Transactions
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({filteredTransactions.length} {filteredTransactions.length === 1 ? 'entry' : 'entries'})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Narration</TableHead>
                    <TableHead className="text-right">Debit (KES)</TableHead>
                    <TableHead className="text-right">Credit (KES)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTx.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedTx.map((tx, ti) => (
                      <React.Fragment key={tx.id}>
                        {tx.lines.map((line, li) => (
                          <TableRow
                            key={`${tx.id}-${li}`}
                            className={li === 0 && ti > 0 ? 'border-t-2 border-border' : ''}
                          >
                            {li === 0 && (
                              <>
                                <TableCell rowSpan={tx.lines.length} className="align-top font-medium whitespace-nowrap">
                                  {format(new Date(tx.date), 'dd/MM/yyyy')}
                                </TableCell>
                                <TableCell rowSpan={tx.lines.length} className="align-top font-mono text-xs whitespace-nowrap">
                                  {tx.reference}
                                </TableCell>
                              </>
                            )}
                            <TableCell className="font-mono text-sm">{line.account_code}</TableCell>
                            <TableCell>{line.account_name}</TableCell>
                            {li === 0 && (
                              <TableCell rowSpan={tx.lines.length} className="align-top max-w-xs text-sm text-muted-foreground">
                                {tx.narration}
                              </TableCell>
                            )}
                            <TableCell className="text-right font-medium">
                              {line.debit > 0 ? formatKES(line.debit) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {line.credit > 0 ? formatKES(line.credit) : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Totals */}
              {filteredTransactions.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-end gap-8">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total Debits</p>
                      <p className="text-lg font-bold">{formatKES(totalDebits)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total Credits</p>
                      <p className="text-lg font-bold">{formatKES(totalCredits)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Pagination */}
              {filteredTransactions.length > ROWS_PER_PAGE && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * ROWS_PER_PAGE + 1} to{' '}
                    {Math.min(currentPage * ROWS_PER_PAGE, filteredTransactions.length)} of{' '}
                    {filteredTransactions.length} entries
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
                      <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <span className="flex items-center text-sm px-2">Page {currentPage} of {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
