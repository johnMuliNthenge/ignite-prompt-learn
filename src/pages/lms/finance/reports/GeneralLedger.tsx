import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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

interface LedgerRow {
  id: string;
  transaction_date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  account_id: string;
  account_code: string;
  account_name: string;
  journal_entry_id: string | null;
  entry_number: string;
  narration: string;
}

interface Account {
  id: string;
  account_code: string;
  account_name: string;
}

const ROWS_PER_PAGE = 10;

export default function GeneralLedger() {
  const { isAdmin } = useAuth();
  const [entries, setEntries] = useState<LedgerRow[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchAccounts();
    fetchLedgerEntries();
  }, []);

  const fetchAccounts = async () => {
    const { data } = await supabase
      .from('chart_of_accounts')
      .select('id, account_code, account_name')
      .eq('is_active', true)
      .order('account_code');
    if (data) setAccounts(data);
  };

  const fetchLedgerEntries = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('general_ledger')
        .select(`
          id, transaction_date, description, debit, credit, balance, account_id,
          journal_entry_id,
          chart_of_accounts:account_id ( account_code, account_name ),
          journal_entries:journal_entry_id ( entry_number, narration )
        `)
        .order('transaction_date', { ascending: false })
        .limit(1000);

      if (selectedAccount && selectedAccount !== 'all') {
        // When filtering by vote head, we need to get the journal_entry_ids
        // that touch this account, then show ALL lines for those entries (double-entry)
        const { data: matchingEntries } = await supabase
          .from('general_ledger')
          .select('journal_entry_id')
          .eq('account_id', selectedAccount)
          .not('journal_entry_id', 'is', null);

        if (matchingEntries && matchingEntries.length > 0) {
          const journalIds = [...new Set(matchingEntries.map(e => e.journal_entry_id).filter(Boolean))];
          // Reset query without account filter, but with journal entry filter
          query = supabase
            .from('general_ledger')
            .select(`
              id, transaction_date, description, debit, credit, balance, account_id,
              journal_entry_id,
              chart_of_accounts:account_id ( account_code, account_name ),
              journal_entries:journal_entry_id ( entry_number, narration )
            `)
            .in('journal_entry_id', journalIds)
            .order('transaction_date', { ascending: false })
            .limit(1000);
        } else {
          setEntries([]);
          setCurrentPage(1);
          setLoading(false);
          return;
        }
      }

      if (startDate) {
        query = query.gte('transaction_date', startDate);
      }
      if (endDate) {
        query = query.lte('transaction_date', endDate);
      }

      const { data, error } = await query;
      if (error) throw error;

      const formatted: LedgerRow[] = (data || []).map((e: any) => ({
        id: e.id,
        transaction_date: e.transaction_date,
        description: e.description || '',
        debit: Number(e.debit) || 0,
        credit: Number(e.credit) || 0,
        balance: Number(e.balance) || 0,
        account_id: e.account_id,
        account_code: e.chart_of_accounts?.account_code || '',
        account_name: e.chart_of_accounts?.account_name || '',
        journal_entry_id: e.journal_entry_id,
        entry_number: e.journal_entries?.entry_number || '-',
        narration: e.journal_entries?.narration || '',
      }));

      setEntries(formatted);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error fetching ledger entries:', error);
      toast.error('Failed to load ledger entries');
    } finally {
      setLoading(false);
    }
  };

  // Group entries by journal_entry_id for double-entry display
  const groupedEntries = useMemo(() => {
    const groups: { journalId: string; entryNumber: string; narration: string; date: string; lines: LedgerRow[] }[] = [];
    const map = new Map<string, LedgerRow[]>();
    const noJournal: LedgerRow[] = [];

    entries.forEach(e => {
      if (e.journal_entry_id) {
        if (!map.has(e.journal_entry_id)) map.set(e.journal_entry_id, []);
        map.get(e.journal_entry_id)!.push(e);
      } else {
        noJournal.push(e);
      }
    });

    map.forEach((lines, journalId) => {
      groups.push({
        journalId,
        entryNumber: lines[0].entry_number,
        narration: lines[0].narration,
        date: lines[0].transaction_date,
        lines,
      });
    });

    // Sort by date descending
    groups.sort((a, b) => b.date.localeCompare(a.date));

    // Add standalone entries as individual groups
    noJournal.forEach(e => {
      groups.push({
        journalId: e.id,
        entryNumber: '-',
        narration: e.description,
        date: e.transaction_date,
        lines: [e],
      });
    });

    return groups;
  }, [entries]);

  const totalPages = Math.max(1, Math.ceil(groupedEntries.length / ROWS_PER_PAGE));
  const paginatedGroups = groupedEntries.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  const totalDebits = entries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredits = entries.reduce((sum, e) => sum + e.credit, 0);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);

  if (!isAdmin) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">You don't have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">General Ledger</h1>
          <p className="text-muted-foreground">Double-entry transaction listing across all accounts</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Vote Head (Account)</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="All accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.account_code} - {acc.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchLedgerEntries} className="w-full">
                <Search className="mr-2 h-4 w-4" />
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ledger Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Ledger Transactions
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({groupedEntries.length} journal {groupedEntries.length === 1 ? 'entry' : 'entries'})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Entry #</TableHead>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Debit (KES)</TableHead>
                    <TableHead className="text-right">Credit (KES)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedGroups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No ledger entries found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedGroups.map((group, gi) => (
                      <React.Fragment key={group.journalId}>
                        {group.lines.map((line, li) => (
                          <TableRow
                            key={line.id}
                            className={li === 0 && gi > 0 ? 'border-t-2 border-border' : ''}
                          >
                            {li === 0 ? (
                              <>
                                <TableCell rowSpan={group.lines.length} className="align-top font-medium">
                                  {format(new Date(group.date), 'dd/MM/yyyy')}
                                </TableCell>
                                <TableCell rowSpan={group.lines.length} className="align-top font-mono text-xs">
                                  {group.entryNumber}
                                </TableCell>
                              </>
                            ) : null}
                            <TableCell className="font-mono text-sm">{line.account_code}</TableCell>
                            <TableCell>{line.account_name}</TableCell>
                            <TableCell className="max-w-xs truncate text-sm">
                              {line.description || group.narration}
                            </TableCell>
                            <TableCell className="text-right">
                              {line.debit > 0 ? formatCurrency(line.debit) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {line.credit > 0 ? formatCurrency(line.credit) : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Totals */}
              {entries.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-end gap-8">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total Debits</p>
                      <p className="text-lg font-bold">{formatCurrency(totalDebits)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total Credits</p>
                      <p className="text-lg font-bold">{formatCurrency(totalCredits)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Pagination */}
              {groupedEntries.length > ROWS_PER_PAGE && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * ROWS_PER_PAGE + 1} to{' '}
                    {Math.min(currentPage * ROWS_PER_PAGE, groupedEntries.length)} of{' '}
                    {groupedEntries.length} entries
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <span className="flex items-center text-sm px-2">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
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
