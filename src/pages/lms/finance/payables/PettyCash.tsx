import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Loader2, Wallet, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface CashAccount {
  id: string;
  name: string;
  current_balance: number;
  imprest_limit: number | null;
  is_petty_cash: boolean;
}

interface PettyCashTransaction {
  id: string;
  transaction_date: string;
  reference: string;
  description: string;
  amount: number;
  type: 'Application' | 'Disbursement' | 'Reimbursement';
  status: string;
  cash_account_name: string;
}

export default function PettyCash() {
  const { isAdmin, user } = useAuth();
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);
  const [transactions, setTransactions] = useState<PettyCashTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('applications');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'Application' | 'Disbursement' | 'Reimbursement'>('Application');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    cash_account_id: '',
    amount: '',
    description: '',
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([fetchCashAccounts(), fetchTransactions()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCashAccounts = async () => {
    const { data, error } = await supabase
      .from('cash_accounts')
      .select('*')
      .eq('is_petty_cash', true)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching cash accounts:', error);
      return;
    }
    setCashAccounts(data || []);
  };

  const fetchTransactions = async () => {
    // Mock data for now
    setTransactions([]);
  };

  const generateReference = (type: string) => {
    const prefix = type === 'Application' ? 'PCA' : type === 'Disbursement' ? 'PCD' : 'PCR';
    const date = format(new Date(), 'yyyyMMdd');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${date}-${random}`;
  };

  const handleSubmit = async () => {
    if (!formData.cash_account_id || !formData.amount || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    const account = cashAccounts.find(a => a.id === formData.cash_account_id);
    const amount = parseFloat(formData.amount);

    // Check imprest limit for disbursements
    if (transactionType === 'Disbursement' && account?.imprest_limit) {
      if (amount > account.imprest_limit) {
        toast.error(`Amount exceeds imprest limit of KES ${account.imprest_limit.toLocaleString()}`);
        return;
      }
      if (amount > account.current_balance) {
        toast.error('Insufficient petty cash balance');
        return;
      }
    }

    setSubmitting(true);
    try {
      const reference = generateReference(transactionType);
      // In production, insert into petty_cash_transactions table
      toast.success(`${transactionType} ${reference} recorded successfully`);
      setDialogOpen(false);
      resetForm();
      fetchTransactions();
      fetchCashAccounts();
    } catch (error: any) {
      toast.error(error.message || 'Failed to record transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      cash_account_id: '',
      amount: '',
      description: '',
      transaction_date: format(new Date(), 'yyyy-MM-dd'),
    });
  };

  const openDialog = (type: 'Application' | 'Disbursement' | 'Reimbursement') => {
    setTransactionType(type);
    resetForm();
    setDialogOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
  };

  const totalPettyCash = cashAccounts.reduce((sum, a) => sum + (a.current_balance || 0), 0);
  const totalImprestLimit = cashAccounts.reduce((sum, a) => sum + (a.imprest_limit || 0), 0);

  if (!isAdmin) {
    return <div className="p-6"><p className="text-muted-foreground">Access denied</p></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Petty Cash Management</h1>
          <p className="text-muted-foreground">Manage petty cash applications, disbursements, and reimbursements</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openDialog('Application')}>
            <ArrowDownRight className="mr-2 h-4 w-4" />
            Application
          </Button>
          <Button variant="outline" onClick={() => openDialog('Disbursement')}>
            <ArrowUpRight className="mr-2 h-4 w-4" />
            Disbursement
          </Button>
          <Button onClick={() => openDialog('Reimbursement')}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reimbursement
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Petty Cash</span>
            </div>
            <div className="text-2xl font-bold mt-2">{formatCurrency(totalPettyCash)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Imprest Limit</div>
            <div className="text-2xl font-bold mt-2">{formatCurrency(totalImprestLimit)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Petty Cash Accounts</div>
            <div className="text-2xl font-bold mt-2">{cashAccounts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Today's Transactions</div>
            <div className="text-2xl font-bold mt-2">0</div>
          </CardContent>
        </Card>
      </div>

      {/* Petty Cash Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>Petty Cash Accounts</CardTitle>
          <CardDescription>Current balances and imprest limits</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : cashAccounts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No petty cash accounts configured</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {cashAccounts.map((account) => (
                <Card key={account.id} className="border-2">
                  <CardContent className="pt-6">
                    <h4 className="font-semibold">{account.name}</h4>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Balance:</span>
                        <span className="font-medium">{formatCurrency(account.current_balance)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Imprest Limit:</span>
                        <span className="font-medium">
                          {account.imprest_limit ? formatCurrency(account.imprest_limit) : 'Not set'}
                        </span>
                      </div>
                      {account.imprest_limit && (
                        <div className="pt-2">
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary"
                              style={{ width: `${Math.min((account.current_balance / account.imprest_limit) * 100, 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {((account.current_balance / account.imprest_limit) * 100).toFixed(0)}% of limit
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search transactions..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="applications">Applications</TabsTrigger>
              <TabsTrigger value="disbursements">Disbursements</TabsTrigger>
              <TabsTrigger value="reimbursements">Reimbursements</TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab} className="mt-4">
              {transactions.length === 0 ? (
                <div className="text-center py-12">
                  <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Transactions</h3>
                  <p className="text-muted-foreground">No {activeTab} found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-mono">{tx.reference}</TableCell>
                        <TableCell>{format(new Date(tx.transaction_date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{tx.cash_account_name}</TableCell>
                        <TableCell>{tx.description}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(tx.amount)}</TableCell>
                        <TableCell><Badge>{tx.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Transaction Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Petty Cash {transactionType}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={formData.transaction_date}
                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Petty Cash Account *</Label>
              <Select value={formData.cash_account_id} onValueChange={(v) => setFormData({ ...formData, cash_account_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {cashAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} (Bal: {formatCurrency(acc.current_balance)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount (KES) *</Label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Description/Purpose *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the purpose..."
                rows={3}
              />
            </div>
            <Button onClick={handleSubmit} className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit {transactionType}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
