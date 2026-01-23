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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Building2, Wallet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BankAccount {
  id: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  branch: string | null;
  opening_balance: number;
  current_balance: number;
  is_active: boolean;
}

interface CashAccount {
  id: string;
  name: string;
  opening_balance: number;
  current_balance: number;
  is_petty_cash: boolean;
  imprest_limit: number | null;
  is_active: boolean;
}

export default function CashBankManagement() {
  const { isAdmin, user } = useAuth();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [cashDialogOpen, setCashDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [bankForm, setBankForm] = useState({
    account_name: '',
    account_number: '',
    bank_name: '',
    branch: '',
    opening_balance: '',
  });

  const [cashForm, setCashForm] = useState({
    name: '',
    opening_balance: '',
    is_petty_cash: false,
    imprest_limit: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([fetchBankAccounts(), fetchCashAccounts()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBankAccounts = async () => {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .order('account_name');

    if (error) {
      console.error('Error fetching bank accounts:', error);
      return;
    }

    setBankAccounts(data || []);
  };

  const fetchCashAccounts = async () => {
    const { data, error } = await supabase
      .from('cash_accounts')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching cash accounts:', error);
      return;
    }

    setCashAccounts(data || []);
  };

  const handleCreateBankAccount = async () => {
    if (!bankForm.account_name || !bankForm.account_number || !bankForm.bank_name) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const openingBalance = parseFloat(bankForm.opening_balance) || 0;
      const { error } = await supabase.from('bank_accounts').insert({
        account_name: bankForm.account_name,
        account_number: bankForm.account_number,
        bank_name: bankForm.bank_name,
        branch: bankForm.branch || null,
        opening_balance: openingBalance,
        current_balance: openingBalance,
        is_active: true,
      });

      if (error) throw error;

      toast.success('Bank account created successfully');
      setBankDialogOpen(false);
      setBankForm({ account_name: '', account_number: '', bank_name: '', branch: '', opening_balance: '' });
      fetchBankAccounts();
    } catch (error: any) {
      console.error('Error creating bank account:', error);
      toast.error(error.message || 'Failed to create bank account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCashAccount = async () => {
    if (!cashForm.name) {
      toast.error('Please enter account name');
      return;
    }

    setSubmitting(true);
    try {
      const openingBalance = parseFloat(cashForm.opening_balance) || 0;
      const { error } = await supabase.from('cash_accounts').insert({
        name: cashForm.name,
        opening_balance: openingBalance,
        current_balance: openingBalance,
        is_petty_cash: cashForm.is_petty_cash,
        imprest_limit: cashForm.is_petty_cash ? (parseFloat(cashForm.imprest_limit) || null) : null,
        is_active: true,
      });

      if (error) throw error;

      toast.success('Cash account created successfully');
      setCashDialogOpen(false);
      setCashForm({ name: '', opening_balance: '', is_petty_cash: false, imprest_limit: '' });
      fetchCashAccounts();
    } catch (error: any) {
      console.error('Error creating cash account:', error);
      toast.error(error.message || 'Failed to create cash account');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  };

  const totalBankBalance = bankAccounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
  const totalCashBalance = cashAccounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);

  if (!isAdmin) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">You don't have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cash & Bank Management</h1>
        <p className="text-muted-foreground">Manage bank accounts, cash points, and petty cash</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bank Balance</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBankBalance)}</div>
            <p className="text-xs text-muted-foreground">{bankAccounts.length} bank accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cash Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCashBalance)}</div>
            <p className="text-xs text-muted-foreground">{cashAccounts.length} cash accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Combined Total</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBankBalance + totalCashBalance)}</div>
            <p className="text-xs text-muted-foreground">All accounts</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="bank" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bank">Bank Accounts</TabsTrigger>
          <TabsTrigger value="cash">Cash Accounts</TabsTrigger>
        </TabsList>

        <TabsContent value="bank">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Bank Accounts</CardTitle>
                <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Bank Account
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Bank Account</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Account Name *</Label>
                        <Input
                          value={bankForm.account_name}
                          onChange={(e) => setBankForm({ ...bankForm, account_name: e.target.value })}
                          placeholder="e.g., Main Operating Account"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Bank Name *</Label>
                        <Input
                          value={bankForm.bank_name}
                          onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                          placeholder="e.g., Equity Bank"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Account Number *</Label>
                        <Input
                          value={bankForm.account_number}
                          onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })}
                          placeholder="Account number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Branch</Label>
                        <Input
                          value={bankForm.branch}
                          onChange={(e) => setBankForm({ ...bankForm, branch: e.target.value })}
                          placeholder="Branch name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Opening Balance (KES)</Label>
                        <Input
                          type="number"
                          value={bankForm.opening_balance}
                          onChange={(e) => setBankForm({ ...bankForm, opening_balance: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                      <Button onClick={handleCreateBankAccount} className="w-full" disabled={submitting}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Bank Account
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
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
                      <TableHead>Account Name</TableHead>
                      <TableHead>Bank</TableHead>
                      <TableHead>Account Number</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead className="text-right">Current Balance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bankAccounts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No bank accounts found
                        </TableCell>
                      </TableRow>
                    ) : (
                      bankAccounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell className="font-medium">{account.account_name}</TableCell>
                          <TableCell>{account.bank_name}</TableCell>
                          <TableCell className="font-mono">{account.account_number}</TableCell>
                          <TableCell>{account.branch || '-'}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(account.current_balance)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={account.is_active ? 'default' : 'secondary'}>
                              {account.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cash">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Cash Accounts</CardTitle>
                <Dialog open={cashDialogOpen} onOpenChange={setCashDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Cash Account
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Cash Account</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Account Name *</Label>
                        <Input
                          value={cashForm.name}
                          onChange={(e) => setCashForm({ ...cashForm, name: e.target.value })}
                          placeholder="e.g., Main Cash"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Opening Balance (KES)</Label>
                        <Input
                          type="number"
                          value={cashForm.opening_balance}
                          onChange={(e) => setCashForm({ ...cashForm, opening_balance: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="petty-cash"
                          checked={cashForm.is_petty_cash}
                          onCheckedChange={(checked) => setCashForm({ ...cashForm, is_petty_cash: checked })}
                        />
                        <Label htmlFor="petty-cash">This is a Petty Cash account</Label>
                      </div>
                      {cashForm.is_petty_cash && (
                        <div className="space-y-2">
                          <Label>Imprest Limit (KES)</Label>
                          <Input
                            type="number"
                            value={cashForm.imprest_limit}
                            onChange={(e) => setCashForm({ ...cashForm, imprest_limit: e.target.value })}
                            placeholder="0.00"
                          />
                        </div>
                      )}
                      <Button onClick={handleCreateCashAccount} className="w-full" disabled={submitting}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Cash Account
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
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
                      <TableHead>Account Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Current Balance</TableHead>
                      <TableHead className="text-right">Imprest Limit</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cashAccounts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No cash accounts found
                        </TableCell>
                      </TableRow>
                    ) : (
                      cashAccounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell className="font-medium">{account.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {account.is_petty_cash ? 'Petty Cash' : 'Cash'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(account.current_balance)}
                          </TableCell>
                          <TableCell className="text-right">
                            {account.imprest_limit ? formatCurrency(account.imprest_limit) : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={account.is_active ? 'default' : 'secondary'}>
                              {account.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
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
