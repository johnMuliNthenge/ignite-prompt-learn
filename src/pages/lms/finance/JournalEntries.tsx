import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Eye, Check, X, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface JournalEntry {
  id: string;
  entry_number: string;
  transaction_date: string;
  narration: string;
  entry_type: string;
  status: string;
  total_debit: number;
  total_credit: number;
}

interface JournalLine {
  id?: string;
  account_id: string;
  account_name?: string;
  description: string;
  debit: number;
  credit: number;
}

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
}

export default function JournalEntries() {
  const { isAdmin, user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newEntry, setNewEntry] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    narration: '',
    entry_type: 'Standard',
  });

  const [lines, setLines] = useState<JournalLine[]>([
    { account_id: '', description: '', debit: 0, credit: 0 },
    { account_id: '', description: '', debit: 0, credit: 0 },
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([fetchEntries(), fetchAccounts()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEntries = async () => {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .order('transaction_date', { ascending: false });

    if (error) {
      console.error('Error fetching journal entries:', error);
      toast.error('Failed to load journal entries');
      return;
    }

    setEntries((data || []).map((e: any) => ({
      ...e,
      total_debit: Number(e.total_debit) || 0,
      total_credit: Number(e.total_credit) || 0,
    })));
  };

  const fetchAccounts = async () => {
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('id, account_code, account_name, account_type')
      .eq('is_active', true)
      .order('account_code');

    if (error) {
      console.error('Error fetching accounts:', error);
      return;
    }

    setAccounts(data || []);
  };

  const addLine = () => {
    setLines([...lines, { account_id: '', description: '', debit: 0, credit: 0 }]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 2) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const updateLine = (index: number, field: keyof JournalLine, value: string | number) => {
    const newLines = [...lines];
    (newLines[index] as any)[field] = value;
    setLines(newLines);
  };

  const getTotalDebit = () => lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
  const getTotalCredit = () => lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
  const isBalanced = () => Math.abs(getTotalDebit() - getTotalCredit()) < 0.01;

  const handleCreateEntry = async () => {
    if (!newEntry.narration) {
      toast.error('Please enter a narration');
      return;
    }

    if (!isBalanced()) {
      toast.error('Journal entry must be balanced (Debits = Credits)');
      return;
    }

    const validLines = lines.filter(line => line.account_id && (line.debit > 0 || line.credit > 0));
    if (validLines.length < 2) {
      toast.error('At least two lines with accounts are required');
      return;
    }

    setSubmitting(true);
    try {
      // Generate entry number
      const { data: entryNumber } = await supabase.rpc('generate_journal_number');

      // Create journal entry
      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          entry_number: entryNumber,
          transaction_date: newEntry.transaction_date,
          narration: newEntry.narration,
          entry_type: newEntry.entry_type,
          status: 'Draft',
          total_debit: getTotalDebit(),
          total_credit: getTotalCredit(),
          prepared_by: user?.id,
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // Create journal lines
      const lineInserts = validLines.map(line => ({
        journal_entry_id: entry.id,
        account_id: line.account_id,
        description: line.description,
        debit: line.debit || 0,
        credit: line.credit || 0,
      }));

      const { error: linesError } = await supabase
        .from('journal_lines')
        .insert(lineInserts);

      if (linesError) throw linesError;

      toast.success('Journal entry created successfully');
      setCreateDialogOpen(false);
      setNewEntry({
        transaction_date: new Date().toISOString().split('T')[0],
        narration: '',
        entry_type: 'Standard',
      });
      setLines([
        { account_id: '', description: '', debit: 0, credit: 0 },
        { account_id: '', description: '', debit: 0, credit: 0 },
      ]);
      fetchEntries();
    } catch (error: any) {
      console.error('Error creating journal entry:', error);
      toast.error(error.message || 'Failed to create journal entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (entry: JournalEntry) => {
    try {
      const { error } = await supabase
        .from('journal_entries')
        .update({
          status: 'Approved',
          approved_by: user?.id,
        })
        .eq('id', entry.id);

      if (error) throw error;

      toast.success('Journal entry approved');
      fetchEntries();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve entry');
    }
  };

  const handlePost = async (entry: JournalEntry) => {
    try {
      // First get journal lines
      const { data: journalLines, error: linesError } = await supabase
        .from('journal_lines')
        .select('*')
        .eq('journal_entry_id', entry.id);

      if (linesError) throw linesError;

      // Create general ledger entries
      const ledgerEntries = (journalLines || []).map(line => ({
        journal_entry_id: entry.id,
        journal_line_id: line.id,
        account_id: line.account_id,
        student_id: line.student_id,
        vendor_id: line.vendor_id,
        transaction_date: entry.transaction_date,
        debit: Number(line.debit) || 0,
        credit: Number(line.credit) || 0,
        description: line.description,
      }));

      const { error: ledgerError } = await supabase
        .from('general_ledger')
        .insert(ledgerEntries);

      if (ledgerError) throw ledgerError;

      // Update entry status
      const { error: updateError } = await supabase
        .from('journal_entries')
        .update({
          status: 'Posted',
          posted_at: new Date().toISOString(),
        })
        .eq('id', entry.id);

      if (updateError) throw updateError;

      toast.success('Journal entry posted to ledger');
      fetchEntries();
    } catch (error: any) {
      toast.error(error.message || 'Failed to post entry');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Posted':
        return <Badge className="bg-green-500">Posted</Badge>;
      case 'Approved':
        return <Badge className="bg-blue-500">Approved</Badge>;
      case 'Pending':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'Rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  const filteredEntries = entries.filter(
    (entry) =>
      entry.entry_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.narration.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold">Journal Entries</h1>
          <p className="text-muted-foreground">Record and manage accounting journal entries</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Journal Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Journal Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={newEntry.transaction_date}
                    onChange={(e) => setNewEntry({ ...newEntry, transaction_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Entry Type</Label>
                  <Select
                    value={newEntry.entry_type}
                    onValueChange={(value) => setNewEntry({ ...newEntry, entry_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Standard">Standard</SelectItem>
                      <SelectItem value="Adjustment">Adjustment</SelectItem>
                      <SelectItem value="Accrual">Accrual</SelectItem>
                      <SelectItem value="Prepayment">Prepayment</SelectItem>
                      <SelectItem value="Correction">Correction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Narration *</Label>
                <Textarea
                  value={newEntry.narration}
                  onChange={(e) => setNewEntry({ ...newEntry, narration: e.target.value })}
                  placeholder="Description of this journal entry"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Journal Lines</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLine}>
                    <Plus className="h-4 w-4 mr-1" /> Add Line
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">Account</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[120px]">Debit</TableHead>
                      <TableHead className="w-[120px]">Credit</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Select
                            value={line.account_id}
                            onValueChange={(value) => updateLine(index, 'account_id', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                            <SelectContent>
                              {accounts.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.account_code} - {account.account_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={line.description}
                            onChange={(e) => updateLine(index, 'description', e.target.value)}
                            placeholder="Line description"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={line.debit || ''}
                            onChange={(e) => updateLine(index, 'debit', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={line.credit || ''}
                            onChange={(e) => updateLine(index, 'credit', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                          />
                        </TableCell>
                        <TableCell>
                          {lines.length > 2 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeLine(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold">
                      <TableCell colSpan={2} className="text-right">Totals:</TableCell>
                      <TableCell>{formatCurrency(getTotalDebit())}</TableCell>
                      <TableCell>{formatCurrency(getTotalCredit())}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                {!isBalanced() && (
                  <p className="text-destructive text-sm">
                    ⚠️ Entry is not balanced. Difference: {formatCurrency(Math.abs(getTotalDebit() - getTotalCredit()))}
                  </p>
                )}
              </div>

              <Button onClick={handleCreateEntry} className="w-full" disabled={submitting || !isBalanced()}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Journal Entry
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Journal Entries</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entry #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Narration</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No journal entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono">{entry.entry_number}</TableCell>
                      <TableCell>{format(new Date(entry.transaction_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="max-w-xs truncate">{entry.narration}</TableCell>
                      <TableCell>{entry.entry_type}</TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.total_debit)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.total_credit)}</TableCell>
                      <TableCell>{getStatusBadge(entry.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" title="View">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {entry.status === 'Draft' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Approve"
                              onClick={() => handleApprove(entry)}
                            >
                              <Check className="h-4 w-4 text-green-500" />
                            </Button>
                          )}
                          {entry.status === 'Approved' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Post to Ledger"
                              onClick={() => handlePost(entry)}
                            >
                              <Check className="h-4 w-4 text-blue-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
