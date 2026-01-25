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
import { Search, Plus, Loader2, FileCheck, ArrowRightLeft, FileWarning, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ImprestWarrant {
  id: string;
  warrant_number: string;
  purpose: string;
  amount: number;
  issued_date: string;
  due_date: string;
  status: 'Issued' | 'Partially Surrendered' | 'Surrendered' | 'Overdue';
  holder_name: string;
  surrendered_amount: number;
  balance: number;
}

export default function ImprestManagement() {
  const { isAdmin, user } = useAuth();
  const [warrants, setWarrants] = useState<ImprestWarrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('warrants');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'warrant' | 'surrender'>('warrant');
  const [selectedWarrant, setSelectedWarrant] = useState<ImprestWarrant | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    purpose: '',
    amount: '',
    holder_name: '',
    due_date: '',
    issued_date: format(new Date(), 'yyyy-MM-dd'),
  });

  const [surrenderData, setSurrenderData] = useState({
    amount_surrendered: '',
    cash_returned: '',
    description: '',
  });

  useEffect(() => {
    fetchWarrants();
  }, []);

  const fetchWarrants = async () => {
    // Mock data for now
    setWarrants([]);
    setLoading(false);
  };

  const generateWarrantNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `IW-${year}-${random}`;
  };

  const handleCreateWarrant = async () => {
    if (!formData.purpose || !formData.amount || !formData.holder_name || !formData.due_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const warrantNumber = generateWarrantNumber();
      // In production, insert into imprest_warrants table
      toast.success(`Imprest Warrant ${warrantNumber} issued successfully`);
      setDialogOpen(false);
      resetForm();
      fetchWarrants();
    } catch (error: any) {
      toast.error(error.message || 'Failed to issue warrant');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSurrender = async () => {
    if (!selectedWarrant || !surrenderData.amount_surrendered) {
      toast.error('Please enter surrender amount');
      return;
    }

    const surrenderAmount = parseFloat(surrenderData.amount_surrendered);
    const cashReturned = parseFloat(surrenderData.cash_returned || '0');

    if (surrenderAmount + cashReturned > selectedWarrant.balance) {
      toast.error('Total surrender cannot exceed outstanding balance');
      return;
    }

    setSubmitting(true);
    try {
      // In production, create surrender record and update warrant
      toast.success('Imprest surrendered successfully');
      setDialogOpen(false);
      setSurrenderData({ amount_surrendered: '', cash_returned: '', description: '' });
      setSelectedWarrant(null);
      fetchWarrants();
    } catch (error: any) {
      toast.error(error.message || 'Failed to surrender imprest');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      purpose: '',
      amount: '',
      holder_name: '',
      due_date: '',
      issued_date: format(new Date(), 'yyyy-MM-dd'),
    });
  };

  const openSurrenderDialog = (warrant: ImprestWarrant) => {
    setSelectedWarrant(warrant);
    setDialogType('surrender');
    setDialogOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'Issued': 'bg-blue-500',
      'Partially Surrendered': 'bg-yellow-500',
      'Surrendered': 'bg-green-500',
      'Overdue': 'bg-red-500',
    };
    return <Badge className={colors[status] || 'bg-gray-500'}>{status}</Badge>;
  };

  const totalOutstanding = warrants.reduce((sum, w) => sum + w.balance, 0);
  const totalIssued = warrants.reduce((sum, w) => sum + w.amount, 0);
  const overdueCount = warrants.filter(w => w.status === 'Overdue').length;

  if (!isAdmin) {
    return <div className="p-6"><p className="text-muted-foreground">Access denied</p></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Imprest Management</h1>
          <p className="text-muted-foreground">Issue and track imprest warrants and surrenders</p>
        </div>
        <Button onClick={() => { setDialogType('warrant'); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Issue Warrant
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Issued</span>
            </div>
            <div className="text-2xl font-bold mt-2">{formatCurrency(totalIssued)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Outstanding</span>
            </div>
            <div className="text-2xl font-bold mt-2 text-orange-600">{formatCurrency(totalOutstanding)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <FileWarning className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Overdue</span>
            </div>
            <div className="text-2xl font-bold mt-2 text-red-600">{overdueCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Fully Surrendered</span>
            </div>
            <div className="text-2xl font-bold mt-2 text-green-600">
              {warrants.filter(w => w.status === 'Surrendered').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Imprest Warrants</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search warrants..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="warrants">Active Warrants</TabsTrigger>
              <TabsTrigger value="surrenders">Surrenders</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab} className="mt-4">
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
              ) : warrants.length === 0 ? (
                <div className="text-center py-12">
                  <FileCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Imprest Warrants</h3>
                  <p className="text-muted-foreground">Issue your first imprest warrant to get started</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Warrant #</TableHead>
                      <TableHead>Holder</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Issued Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Surrendered</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {warrants.map((warrant) => (
                      <TableRow key={warrant.id}>
                        <TableCell className="font-mono">{warrant.warrant_number}</TableCell>
                        <TableCell>{warrant.holder_name}</TableCell>
                        <TableCell className="max-w-xs truncate">{warrant.purpose}</TableCell>
                        <TableCell>{format(new Date(warrant.issued_date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{format(new Date(warrant.due_date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="text-right">{formatCurrency(warrant.amount)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(warrant.surrendered_amount)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(warrant.balance)}</TableCell>
                        <TableCell>{getStatusBadge(warrant.status)}</TableCell>
                        <TableCell>
                          {warrant.balance > 0 && (
                            <Button variant="outline" size="sm" onClick={() => openSurrenderDialog(warrant)}>
                              Surrender
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Issue Warrant / Surrender Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'warrant' ? 'Issue Imprest Warrant' : 'Surrender Imprest'}
            </DialogTitle>
          </DialogHeader>
          {dialogType === 'warrant' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Issue Date *</Label>
                  <Input
                    type="date"
                    value={formData.issued_date}
                    onChange={(e) => setFormData({ ...formData, issued_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Due Date *</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Holder Name *</Label>
                <Input
                  value={formData.holder_name}
                  onChange={(e) => setFormData({ ...formData, holder_name: e.target.value })}
                  placeholder="Name of person receiving imprest"
                />
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
                <Label>Purpose *</Label>
                <Textarea
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="Purpose of the imprest..."
                  rows={3}
                />
              </div>
              <Button onClick={handleCreateWarrant} className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Issue Warrant
              </Button>
            </div>
          ) : selectedWarrant && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p><strong>Warrant:</strong> {selectedWarrant.warrant_number}</p>
                <p><strong>Holder:</strong> {selectedWarrant.holder_name}</p>
                <p><strong>Outstanding:</strong> {formatCurrency(selectedWarrant.balance)}</p>
              </div>
              <div className="space-y-2">
                <Label>Amount Expended (with receipts) *</Label>
                <Input
                  type="number"
                  value={surrenderData.amount_surrendered}
                  onChange={(e) => setSurrenderData({ ...surrenderData, amount_surrendered: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Cash Returned</Label>
                <Input
                  type="number"
                  value={surrenderData.cash_returned}
                  onChange={(e) => setSurrenderData({ ...surrenderData, cash_returned: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={surrenderData.description}
                  onChange={(e) => setSurrenderData({ ...surrenderData, description: e.target.value })}
                  placeholder="Details of expenditure..."
                  rows={3}
                />
              </div>
              <Button onClick={handleSurrender} className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Surrender
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
