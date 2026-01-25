import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Edit, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  normal_balance: string | null;
  group_id: string | null;
  sub_group_id: string | null;
  parent_id: string | null;
  description: string | null;
  is_active: boolean;
}

interface AccountGroup {
  id: string;
  name: string;
  account_type: string;
}

interface AccountSubGroup {
  id: string;
  name: string;
  group_id: string;
}

const ACCOUNT_TYPES = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];
const NORMAL_BALANCES = ['Debit', 'Credit'];

// Cash flow classifications per IPSAS
const CASH_FLOW_GROUPS = ['Operating', 'Investing', 'Financing', 'Non-Cash'];
const CASH_FLOW_SUBGROUPS: Record<string, string[]> = {
  'Operating': ['Receipts from Fees', 'Receipts from Grants', 'Payments to Suppliers', 'Payments to Employees', 'Other Operating'],
  'Investing': ['Purchase of Assets', 'Sale of Assets', 'Investments', 'Other Investing'],
  'Financing': ['Borrowings', 'Loan Repayments', 'Capital Contributions', 'Other Financing'],
  'Non-Cash': ['Depreciation', 'Provisions', 'Other Non-Cash'],
};

export default function ChartOfAccounts() {
  const { isAdmin } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [groups, setGroups] = useState<AccountGroup[]>([]);
  const [subGroups, setSubGroups] = useState<AccountSubGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const [formData, setFormData] = useState({
    account_code: '',
    account_name: '',
    account_type: 'Asset',
    normal_balance: 'Debit',
    group_id: '',
    sub_group_id: '',
    parent_id: '',
    description: '',
    cash_flow_group: '',
    cash_flow_subgroup: '',
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    await Promise.all([fetchAccounts(), fetchGroups(), fetchSubGroups()]);
    setLoading(false);
  };

  const fetchAccounts = async () => {
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .order('account_code');

    if (error) {
      toast.error('Failed to load accounts');
      return;
    }
    setAccounts(data || []);
  };

  const fetchGroups = async () => {
    const { data, error } = await supabase
      .from('account_groups')
      .select('*')
      .order('name');
    if (!error) setGroups(data || []);
  };

  const fetchSubGroups = async () => {
    const { data, error } = await supabase
      .from('account_sub_groups')
      .select('*')
      .order('name');
    if (!error) setSubGroups(data || []);
  };

  // Auto-set normal balance based on account type (double-entry rule)
  const getDefaultNormalBalance = (accountType: string) => {
    switch (accountType) {
      case 'Asset':
      case 'Expense':
        return 'Debit';
      case 'Liability':
      case 'Equity':
      case 'Income':
        return 'Credit';
      default:
        return 'Debit';
    }
  };

  const handleAccountTypeChange = (type: string) => {
    setFormData({
      ...formData,
      account_type: type,
      normal_balance: getDefaultNormalBalance(type),
      group_id: '', // Reset group when type changes
      sub_group_id: '',
    });
  };

  const handleSubmit = async () => {
    if (!formData.account_code || !formData.account_name) {
      toast.error('Please fill Account Code and Account Name');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        account_code: formData.account_code,
        account_name: formData.account_name,
        account_type: formData.account_type,
        normal_balance: formData.normal_balance,
        group_id: formData.group_id || null,
        sub_group_id: formData.sub_group_id || null,
        parent_id: formData.parent_id || null,
        description: formData.description || null,
      };

      if (editingAccount) {
        const { error } = await supabase
          .from('chart_of_accounts')
          .update(payload)
          .eq('id', editingAccount.id);
        if (error) throw error;
        toast.success('Account updated successfully');
      } else {
        const { error } = await supabase
          .from('chart_of_accounts')
          .insert({ ...payload, is_active: true });
        if (error) throw error;
        toast.success('Account created successfully');
      }
      setDialogOpen(false);
      resetForm();
      fetchAccounts();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save account');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAccountStatus = async (account: Account) => {
    try {
      const { error } = await supabase
        .from('chart_of_accounts')
        .update({ is_active: !account.is_active })
        .eq('id', account.id);
      if (error) throw error;
      toast.success(`Account ${account.is_active ? 'deactivated' : 'activated'}`);
      fetchAccounts();
    } catch (error: any) {
      toast.error('Failed to update account status');
    }
  };

  const resetForm = () => {
    setFormData({
      account_code: '',
      account_name: '',
      account_type: 'Asset',
      normal_balance: 'Debit',
      group_id: '',
      sub_group_id: '',
      parent_id: '',
      description: '',
      cash_flow_group: '',
      cash_flow_subgroup: '',
    });
    setEditingAccount(null);
  };

  const openEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      account_code: account.account_code,
      account_name: account.account_name,
      account_type: account.account_type,
      normal_balance: account.normal_balance || 'Debit',
      group_id: account.group_id || '',
      sub_group_id: account.sub_group_id || '',
      parent_id: account.parent_id || '',
      description: account.description || '',
      cash_flow_group: '',
      cash_flow_subgroup: '',
    });
    setDialogOpen(true);
  };

  // Filter groups by selected account type
  const filteredGroups = groups.filter(g => g.account_type === formData.account_type);
  
  // Filter sub-groups by selected group
  const filteredSubGroups = subGroups.filter(sg => sg.group_id === formData.group_id);

  // Filter parent accounts (same type, excluding current if editing)
  const parentAccounts = accounts.filter(a => 
    a.account_type === formData.account_type && 
    (!editingAccount || a.id !== editingAccount.id)
  );

  const filtered = accounts.filter(a => {
    const matchesSearch = a.account_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.account_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || a.account_type === filterType;
    return matchesSearch && matchesType;
  });

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

  if (!isAdmin) return <div className="p-6"><p className="text-muted-foreground">Access denied</p></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Chart of Accounts</h1>
          <p className="text-muted-foreground">Manage your accounting structure (Vote Heads)</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Account</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingAccount ? 'Edit' : 'Add'} Account</DialogTitle></DialogHeader>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Account Code (Number) *</Label>
                <Input 
                  value={formData.account_code} 
                  onChange={(e) => setFormData({...formData, account_code: e.target.value})}
                  placeholder="e.g., 10-00-001"
                />
              </div>
              <div className="space-y-2">
                <Label>Account Name *</Label>
                <Input 
                  value={formData.account_name} 
                  onChange={(e) => setFormData({...formData, account_name: e.target.value})}
                  placeholder="e.g., Student Debtors"
                />
              </div>
              <div className="space-y-2">
                <Label>Account Type *</Label>
                <Select value={formData.account_type} onValueChange={handleAccountTypeChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Normal Balance</Label>
                <Select value={formData.normal_balance} onValueChange={(v) => setFormData({...formData, normal_balance: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NORMAL_BALANCES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Auto-set based on account type (double-entry)</p>
              </div>
              <div className="space-y-2">
                <Label>Cash Flow Group</Label>
                <Select value={formData.cash_flow_group} onValueChange={(v) => setFormData({...formData, cash_flow_group: v, cash_flow_subgroup: ''})}>
                  <SelectTrigger><SelectValue placeholder="Select cash flow category" /></SelectTrigger>
                  <SelectContent>
                    {CASH_FLOW_GROUPS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cash Flow Subgroup</Label>
                <Select 
                  value={formData.cash_flow_subgroup} 
                  onValueChange={(v) => setFormData({...formData, cash_flow_subgroup: v})}
                  disabled={!formData.cash_flow_group}
                >
                  <SelectTrigger><SelectValue placeholder="Select subgroup" /></SelectTrigger>
                  <SelectContent>
                    {(CASH_FLOW_SUBGROUPS[formData.cash_flow_group] || []).map(s => 
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Group</Label>
                <Select value={formData.group_id} onValueChange={(v) => setFormData({...formData, group_id: v, sub_group_id: ''})}>
                  <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                  <SelectContent>
                    {filteredGroups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sub Group</Label>
                <Select 
                  value={formData.sub_group_id} 
                  onValueChange={(v) => setFormData({...formData, sub_group_id: v})}
                  disabled={!formData.group_id}
                >
                  <SelectTrigger><SelectValue placeholder="Select sub group" /></SelectTrigger>
                  <SelectContent>
                    {filteredSubGroups.map(sg => <SelectItem key={sg.id} value={sg.id}>{sg.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Child of (Parent Account)</Label>
                <Select value={formData.parent_id} onValueChange={(v) => setFormData({...formData, parent_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select parent account" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Parent</SelectItem>
                    {parentAccounts.map(a => 
                      <SelectItem key={a.id} value={a.id}>
                        {a.account_code} - {a.account_name}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Description</Label>
                <Textarea 
                  value={formData.description} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Account description..."
                  rows={2}
                />
              </div>
              <div className="md:col-span-2">
                <Button onClick={handleSubmit} className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingAccount ? 'Update Account' : 'Create Account'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by code or name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Filter by type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {ACCOUNT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {ACCOUNT_TYPES.map(type => {
          const count = accounts.filter(a => a.account_type === type && a.is_active).length;
          return (
            <Card key={type} className="cursor-pointer hover:shadow-md" onClick={() => setFilterType(type)}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{type}</span>
                  <Badge className={getTypeColor(type)}>{count}</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Accounts ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Normal Balance</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">No accounts found</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((account) => {
                    const group = groups.find(g => g.id === account.group_id);
                    return (
                      <TableRow key={account.id}>
                        <TableCell className="font-mono font-medium">{account.account_code}</TableCell>
                        <TableCell>
                          <div>
                            <p>{account.account_name}</p>
                            {account.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-xs">{account.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell><Badge className={getTypeColor(account.account_type)}>{account.account_type}</Badge></TableCell>
                        <TableCell>{account.normal_balance}</TableCell>
                        <TableCell>{group?.name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={account.is_active ? 'default' : 'secondary'}>
                            {account.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(account)} title="Edit">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => toggleAccountStatus(account)}
                              title={account.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {account.is_active ? <ToggleRight className="h-4 w-4 text-green-500" /> : <ToggleLeft className="h-4 w-4" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
