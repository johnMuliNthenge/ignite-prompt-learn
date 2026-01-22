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
import { Search, Plus, Edit, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  normal_balance: string | null;
  is_active: boolean;
}

export default function ChartOfAccounts() {
  const { isAdmin } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const [formData, setFormData] = useState({
    account_code: '',
    account_name: '',
    account_type: 'Asset',
    normal_balance: 'Debit',
  });

  useEffect(() => { fetchAccounts(); }, []);

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
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.account_code || !formData.account_name) {
      toast.error('Please fill required fields');
      return;
    }

    setSubmitting(true);
    try {
      if (editingAccount) {
        const { error } = await supabase
          .from('chart_of_accounts')
          .update(formData)
          .eq('id', editingAccount.id);
        if (error) throw error;
        toast.success('Account updated');
      } else {
        const { error } = await supabase
          .from('chart_of_accounts')
          .insert({ ...formData, is_active: true });
        if (error) throw error;
        toast.success('Account created');
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

  const resetForm = () => {
    setFormData({ account_code: '', account_name: '', account_type: 'Asset', normal_balance: 'Debit' });
    setEditingAccount(null);
  };

  const openEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      account_code: account.account_code,
      account_name: account.account_name,
      account_type: account.account_type,
      normal_balance: account.normal_balance || 'Debit',
    });
    setDialogOpen(true);
  };

  const filtered = accounts.filter(a =>
    a.account_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.account_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) return <div className="p-6"><p className="text-muted-foreground">Access denied</p></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Chart of Accounts</h1>
          <p className="text-muted-foreground">Manage your accounting structure</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Account</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingAccount ? 'Edit' : 'Add'} Account</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Account Code *</Label>
                <Input value={formData.account_code} onChange={(e) => setFormData({...formData, account_code: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Account Name *</Label>
                <Input value={formData.account_name} onChange={(e) => setFormData({...formData, account_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Account Type</Label>
                <Select value={formData.account_type} onValueChange={(v) => setFormData({...formData, account_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Asset', 'Liability', 'Equity', 'Income', 'Expense'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Normal Balance</Label>
                <Select value={formData.normal_balance} onValueChange={(v) => setFormData({...formData, normal_balance: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Debit">Debit</SelectItem>
                    <SelectItem value="Credit">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSubmit} className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingAccount ? 'Update' : 'Create'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between">
            <CardTitle>Accounts</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
          </div>
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
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-mono">{account.account_code}</TableCell>
                    <TableCell>{account.account_name}</TableCell>
                    <TableCell>{account.account_type}</TableCell>
                    <TableCell>{account.normal_balance}</TableCell>
                    <TableCell><Badge variant={account.is_active ? 'default' : 'secondary'}>{account.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => openEdit(account)}><Edit className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
