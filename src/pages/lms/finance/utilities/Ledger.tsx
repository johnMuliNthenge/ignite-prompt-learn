import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Loader2, Download, BookMarked, Plus, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface LedgerEntry {
  id: string;
  transaction_date: string;
  account_code: string;
  account_name: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  reference: string;
}

interface ChartAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  normal_balance: string | null;
  parent_id: string | null;
  description: string | null;
  is_active: boolean;
}

const ACCOUNT_TYPES = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];

const getDefaultNormalBalance = (type: string) => {
  return (type === 'Asset' || type === 'Expense') ? 'Debit' : 'Credit';
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'Asset': return 'bg-blue-500';
    case 'Liability': return 'bg-red-500';
    case 'Equity': return 'bg-purple-500';
    case 'Income': return 'bg-green-500';
    case 'Expense': return 'bg-orange-500';
    default: return 'bg-gray-500';
  }
};

const defaultForm = {
  account_code: '',
  account_name: '',
  account_type: 'Asset',
  normal_balance: 'Debit',
  parent_id: '',
  description: '',
};

export default function Ledger() {
  const { isAdmin } = useAuth();

  // ─── Ledger view state ───────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // ─── Add Ledger Account state ─────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ChartAccount | null>(null);
  const [formData, setFormData] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [accountFilter, setAccountFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAccounts();
    fetchLedger();
  }, []);

  const fetchAccounts = async () => {
    const { data } = await supabase
      .from('chart_of_accounts')
      .select('id, account_code, account_name, account_type, normal_balance, parent_id, description, is_active')
      .order('account_code');
    setAccounts(data || []);
  };

  const fetchLedger = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('general_ledger')
        .select(`
          id,
          transaction_date,
          description,
          debit,
          credit,
          balance,
          chart_of_accounts!inner (
            account_code,
            account_name
          ),
          journal_entries (
            entry_number
          )
        `)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
        .order('transaction_date', { ascending: true });

      if (selectedAccount !== 'all') {
        query = query.eq('account_id', selectedAccount);
      }

      const { data, error } = await query;
      if (error) throw error;

      const formatted: LedgerEntry[] = (data || []).map((entry: any) => ({
        id: entry.id,
        transaction_date: entry.transaction_date,
        account_code: entry.chart_of_accounts?.account_code || '',
        account_name: entry.chart_of_accounts?.account_name || '',
        description: entry.description || '',
        debit: Number(entry.debit) || 0,
        credit: Number(entry.credit) || 0,
        balance: Number(entry.balance) || 0,
        reference: entry.journal_entries?.entry_number || '',
      }));

      setEntries(formatted);
    } catch (error) {
      console.error('Error fetching ledger:', error);
      toast.error('Failed to load ledger entries');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.account_code.trim() || !formData.account_name.trim()) {
      toast.error('Account Code and Name are required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        account_code: formData.account_code.trim(),
        account_name: formData.account_name.trim(),
        account_type: formData.account_type,
        normal_balance: formData.normal_balance,
        parent_id: formData.parent_id || null,
        description: formData.description || null,
        is_active: true,
      };

      if (editingAccount) {
        const { error } = await supabase.from('chart_of_accounts').update(payload).eq('id', editingAccount.id);
        if (error) throw error;
        toast.success('Ledger account updated');
      } else {
        const { error } = await supabase.from('chart_of_accounts').insert(payload);
        if (error) throw error;
        toast.success('Ledger account created');
      }
      setDialogOpen(false);
      resetForm();
      fetchAccounts();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save ledger account');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData(defaultForm);
    setEditingAccount(null);
  };

  const openEdit = (acc: ChartAccount) => {
    setEditingAccount(acc);
    setFormData({
      account_code: acc.account_code,
      account_name: acc.account_name,
      account_type: acc.account_type,
      normal_balance: acc.normal_balance || 'Debit',
      parent_id: acc.parent_id || '',
      description: acc.description || '',
    });
    setDialogOpen(true);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);

  const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);

  const parentAccounts = accounts.filter(
    a => a.account_type === formData.account_type && (!editingAccount || a.id !== editingAccount.id)
  );

  const filteredAccounts = accounts.filter(a => {
    const matchSearch = a.account_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.account_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = accountFilter === 'all' || a.account_type === accountFilter;
    return matchSearch && matchType;
  });

  if (!isAdmin) {
    return <div className="p-6"><p className="text-muted-foreground">Access denied.</p></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Ledger</h1>
          <p className="text-muted-foreground">Manage ledger accounts and view transaction history</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Ledger Account
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingAccount ? 'Edit' : 'Add'} Ledger Account</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Account Code *</Label>
                    <Input
                      value={formData.account_code}
                      onChange={(e) => setFormData({ ...formData, account_code: e.target.value })}
                      placeholder="e.g. 1100-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Name *</Label>
                    <Input
                      value={formData.account_name}
                      onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                      placeholder="e.g. Bank - KCB"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ledger Type *</Label>
                    <Select
                      value={formData.account_type}
                      onValueChange={(v) => setFormData({ ...formData, account_type: v, normal_balance: getDefaultNormalBalance(v), parent_id: '' })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ACCOUNT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Normal Balance</Label>
                    <Select
                      value={formData.normal_balance}
                      onValueChange={(v) => setFormData({ ...formData, normal_balance: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Debit">Debit</SelectItem>
                        <SelectItem value="Credit">Credit</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Auto-set by type</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Parent Account (optional)</Label>
                  <Select
                    value={formData.parent_id || 'none'}
                    onValueChange={(v) => setFormData({ ...formData, parent_id: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="No parent (top-level)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Parent (Top-level)</SelectItem>
                      {parentAccounts.map(a => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.account_code} — {a.account_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional notes about this account..."
                    rows={2}
                  />
                </div>
                <Button onClick={handleSubmit} className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingAccount ? 'Update Account' : 'Create Ledger Account'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={() => {}}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">
            <BookOpen className="mr-2 h-4 w-4" />
            Ledger Accounts
          </TabsTrigger>
          <TabsTrigger value="transactions">
            <BookMarked className="mr-2 h-4 w-4" />
            Transaction History
          </TabsTrigger>
        </TabsList>

        {/* ── Ledger Accounts tab ── */}
        <TabsContent value="accounts" className="space-y-4">
          {/* Summary chips */}
          <div className="flex flex-wrap gap-3 pt-2">
            {ACCOUNT_TYPES.map(type => {
              const count = accounts.filter(a => a.account_type === type && a.is_active).length;
              return (
                <button
                  key={type}
                  onClick={() => setAccountFilter(accountFilter === type ? 'all' : type)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${accountFilter === type ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-background hover:bg-muted'}`}
                >
                  {type}
                  <Badge className={`text-xs ${getTypeColor(type)}`}>{count}</Badge>
                </button>
              );
            })}
          </div>

          <Card>
            <CardContent className="pt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="Search by code or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Chart of Accounts — {filteredAccounts.length} account{filteredAccounts.length !== 1 ? 's' : ''}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Normal Balance</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No ledger accounts found. Click "Add Ledger Account" to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAccounts.map(acc => {
                      const parent = accounts.find(a => a.id === acc.parent_id);
                      return (
                        <TableRow key={acc.id}>
                          <TableCell className="font-mono text-sm">{acc.account_code}</TableCell>
                          <TableCell>
                            {acc.parent_id && <span className="text-muted-foreground mr-1">↳</span>}
                            {acc.account_name}
                          </TableCell>
                          <TableCell>
                            <Badge className={getTypeColor(acc.account_type)}>{acc.account_type}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{acc.normal_balance}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {parent ? `${parent.account_code} — ${parent.account_name}` : '—'}
                          </TableCell>
                          <TableCell>
                            {acc.is_active
                              ? <Badge variant="default">Active</Badge>
                              : <Badge variant="secondary">Inactive</Badge>}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => openEdit(acc)}>Edit</Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Transaction History tab ── */}
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Search Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end flex-wrap">
                <div className="space-y-2 w-64">
                  <Label>Account</Label>
                  <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                    <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
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
                  <Label>From Date</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>To Date</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <Button onClick={fetchLedger}>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookMarked className="h-5 w-5" />
                Ledger Entries
              </CardTitle>
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
                      <TableHead>Date</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No ledger entries found for the selected period
                        </TableCell>
                      </TableRow>
                    ) : (
                      entries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>{format(new Date(entry.transaction_date), 'dd MMM yyyy')}</TableCell>
                          <TableCell className="font-mono text-sm">{entry.reference}</TableCell>
                          <TableCell>
                            <div className="font-mono text-xs text-muted-foreground">{entry.account_code}</div>
                            <div className="text-sm">{entry.account_name}</div>
                          </TableCell>
                          <TableCell>{entry.description}</TableCell>
                          <TableCell className="text-right">
                            {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(entry.balance)}</TableCell>
                        </TableRow>
                      ))
                    )}
                    <TableRow className="font-bold bg-muted">
                      <TableCell colSpan={4}>TOTALS</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalDebit)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalCredit)}</TableCell>
                      <TableCell className="text-right">—</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
