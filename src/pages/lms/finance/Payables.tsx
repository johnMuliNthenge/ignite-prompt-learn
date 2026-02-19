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
import { Search, Plus, DollarSign, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ProtectedPage, ActionButton, useModulePermissions } from '@/components/auth/ProtectedPage';

const MODULE_CODE = 'finance.payables';

interface Payable {
  id: string;
  bill_number: string;
  vendor_name: string;
  bill_date: string;
  due_date: string | null;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: string;
}

interface Vendor {
  id: string;
  name: string;
}

interface PaymentMode {
  id: string;
  name: string;
  asset_account_id: string | null;
}

export default function Payables() {
  const { user } = useAuth();
  const { canAdd } = useModulePermissions(MODULE_CODE);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState<Payable | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // vendor toggle: 'select' from list, 'new' = type custom
  const [vendorMode, setVendorMode] = useState<'select' | 'new'>('select');

  const [newBill, setNewBill] = useState({
    vendor_id: '',
    vendor_name_new: '',
    amount: '',
    description: '',
    due_date: '',
    payment_mode_id: '',
    reference_number: '',
  });

  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_mode_id: '',
    reference_number: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([fetchPayables(), fetchVendors(), fetchPaymentModes()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayables = async () => {
    const { data, error } = await supabase
      .from('payables')
      .select('id, bill_number, vendor_id, bill_date, due_date, total_amount, amount_paid, balance_due, status, vendors(name)')
      .order('bill_date', { ascending: false });

    if (error) { toast.error('Failed to load payables'); return; }

    setPayables((data || []).map((pay: any) => ({
      id: pay.id,
      bill_number: pay.bill_number,
      vendor_name: pay.vendors?.name || 'Unknown',
      bill_date: pay.bill_date,
      due_date: pay.due_date,
      total_amount: Number(pay.total_amount) || 0,
      amount_paid: Number(pay.amount_paid) || 0,
      balance_due: Number(pay.balance_due) || 0,
      status: pay.status,
    })));
  };

  const fetchVendors = async () => {
    const { data } = await supabase.from('vendors').select('id, name').eq('is_active', true).order('name');
    setVendors(data || []);
  };

  const fetchPaymentModes = async () => {
    const { data } = await supabase.from('payment_modes').select('id, name, asset_account_id').eq('is_active', true).order('name');
    setPaymentModes((data as any) || []);
  };

  const handleCreateBill = async () => {
    const vendorName = vendorMode === 'new'
      ? newBill.vendor_name_new.trim()
      : vendors.find(v => v.id === newBill.vendor_id)?.name || '';

    if (!vendorName) { toast.error('Please select or enter a vendor'); return; }
    if (!newBill.amount || parseFloat(newBill.amount) <= 0) { toast.error('Please enter a valid amount'); return; }
    if (!newBill.payment_mode_id) { toast.error('Please select a payment mode'); return; }

    setSubmitting(true);
    try {
      const amount = parseFloat(newBill.amount);
      const billNumber = `BILL-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;

      // Resolve or create vendor
      let vendorId = vendorMode === 'select' ? newBill.vendor_id : null;
      if (vendorMode === 'new') {
        const { data: newVendor } = await supabase
          .from('vendors')
          .insert({ name: vendorName, is_active: true })
          .select('id')
          .single();
        vendorId = newVendor?.id || null;
      }

      const { error } = await supabase.from('payables').insert({
        bill_number: billNumber,
        vendor_id: vendorId,
        bill_date: new Date().toISOString().split('T')[0],
        due_date: newBill.due_date || null,
        subtotal: amount,
        total_amount: amount,
        balance_due: amount,
        status: 'Unpaid',
        notes: newBill.description || null,
        created_by: user?.id,
      });
      if (error) throw error;

      // Post to general ledger if payment mode has asset account
      const selectedMode = paymentModes.find(pm => pm.id === newBill.payment_mode_id);
      if (selectedMode?.asset_account_id) {
        const { data: jeNum } = await supabase.rpc('generate_journal_number');
        const { data: jeData } = await supabase.from('journal_entries').insert({
          entry_number: jeNum || `JE-BILL-${Date.now()}`,
          transaction_date: new Date().toISOString().split('T')[0],
          reference: billNumber,
          narration: `Bill from ${vendorName} — ${newBill.description || 'Vendor bill'}`,
          entry_type: 'payable_bill',
          status: 'Posted',
          total_debit: amount,
          total_credit: amount,
          prepared_by: user?.id,
        }).select('id').single();

        if (jeData) {
          await supabase.from('general_ledger').insert({
            journal_entry_id: jeData.id,
            account_id: selectedMode.asset_account_id,
            transaction_date: new Date().toISOString().split('T')[0],
            debit: 0,
            credit: amount,
            balance: -amount,
            description: `Payment to ${vendorName} via ${selectedMode.name}`,
          });
        }
      }

      toast.success(`Bill ${billNumber} created successfully`);
      setCreateDialogOpen(false);
      setNewBill({ vendor_id: '', vendor_name_new: '', amount: '', description: '', due_date: '', payment_mode_id: '', reference_number: '' });
      setVendorMode('select');
      fetchPayables();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create bill');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedPayable || !paymentData.amount) {
      toast.error('Please enter payment amount');
      return;
    }
    if (!paymentData.payment_mode_id) {
      toast.error('Please select a payment mode');
      return;
    }
    const amount = parseFloat(paymentData.amount);
    if (amount <= 0 || amount > selectedPayable.balance_due) {
      toast.error('Invalid payment amount');
      return;
    }

    setSubmitting(true);
    try {
      const paymentNumber = `PAY-${Date.now()}`;

      const { error: paymentError } = await supabase.from('payable_payments').insert({
        payment_number: paymentNumber,
        payable_id: selectedPayable.id,
        payment_date: new Date().toISOString().split('T')[0],
        amount,
        payment_mode_id: paymentData.payment_mode_id,
        reference_number: paymentData.reference_number || null,
        status: 'Completed',
        paid_by: user?.id,
      });
      if (paymentError) throw paymentError;

      const newAmountPaid = selectedPayable.amount_paid + amount;
      const newBalance = selectedPayable.total_amount - newAmountPaid;

      await supabase.from('payables').update({
        amount_paid: newAmountPaid,
        balance_due: newBalance,
        status: newBalance <= 0 ? 'Paid' : 'Partial',
      }).eq('id', selectedPayable.id);

      // Post to general ledger
      const selectedMode = paymentModes.find(pm => pm.id === paymentData.payment_mode_id);
      if (selectedMode?.asset_account_id) {
        const { data: jeNum } = await supabase.rpc('generate_journal_number');
        const { data: jeData } = await supabase.from('journal_entries').insert({
          entry_number: jeNum || `JE-PAY-${Date.now()}`,
          transaction_date: new Date().toISOString().split('T')[0],
          reference: paymentNumber,
          narration: `Payment for bill ${selectedPayable.bill_number} to ${selectedPayable.vendor_name}`,
          entry_type: 'payable_payment',
          status: 'Posted',
          total_debit: amount,
          total_credit: amount,
          prepared_by: user?.id,
        }).select('id').single();

        if (jeData) {
          await supabase.from('general_ledger').insert({
            journal_entry_id: jeData.id,
            account_id: selectedMode.asset_account_id,
            transaction_date: new Date().toISOString().split('T')[0],
            debit: 0,
            credit: amount,
            balance: -amount,
            description: `Payment to ${selectedPayable.vendor_name} via ${selectedMode.name}`,
          });
        }
      }

      toast.success('Payment recorded and ledger updated');
      setPaymentDialogOpen(false);
      setPaymentData({ amount: '', payment_mode_id: '', reference_number: '' });
      setSelectedPayable(null);
      fetchPayables();
    } catch (error: any) {
      toast.error(error.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      Paid: 'bg-green-500 text-white',
      Partial: 'bg-yellow-500 text-white',
      Overdue: 'bg-destructive text-destructive-foreground',
      Cancelled: 'bg-muted text-muted-foreground',
    };
    return <Badge className={map[status] || 'border border-input bg-background text-foreground'}>{status || 'Unpaid'}</Badge>;
  };

  const filtered = payables.filter(p =>
    p.bill_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.vendor_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ProtectedPage moduleCode={MODULE_CODE} title="Payables">
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Payables</h1>
            <p className="text-muted-foreground">Manage vendor bills and payments</p>
          </div>
          <ActionButton moduleCode={MODULE_CODE} action="add">
            <Dialog open={createDialogOpen} onOpenChange={(open) => { setCreateDialogOpen(open); if (!open) { setVendorMode('select'); setNewBill({ vendor_id: '', vendor_name_new: '', amount: '', description: '', due_date: '', payment_mode_id: '', reference_number: '' }); } }}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />Create Bill</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Bill</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Vendor */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Vendor / Payee *</Label>
                      <button
                        type="button"
                        className="text-xs text-primary underline"
                        onClick={() => { setVendorMode(vendorMode === 'select' ? 'new' : 'select'); setNewBill(prev => ({ ...prev, vendor_id: '', vendor_name_new: '' })); }}
                      >
                        {vendorMode === 'select' ? '+ Type new vendor' : '← Choose from list'}
                      </button>
                    </div>
                    {vendorMode === 'select' ? (
                      <Select value={newBill.vendor_id} onValueChange={(v) => setNewBill({ ...newBill, vendor_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                        <SelectContent>
                          {vendors.length === 0
                            ? <SelectItem value="none" disabled>No vendors found</SelectItem>
                            : vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)
                          }
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={newBill.vendor_name_new}
                        onChange={(e) => setNewBill({ ...newBill, vendor_name_new: e.target.value })}
                        placeholder="Enter vendor or payee name"
                      />
                    )}
                  </div>

                  {/* Amount */}
                  <div className="space-y-2">
                    <Label>Amount (KES) *</Label>
                    <Input
                      type="number"
                      value={newBill.amount}
                      onChange={(e) => setNewBill({ ...newBill, amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>

                  {/* Payment Mode — required */}
                  <div className="space-y-2">
                    <Label>Payment Mode <span className="text-destructive">*</span></Label>
                    <div className="grid grid-cols-2 gap-2">
                      {paymentModes.length === 0 ? (
                        <p className="col-span-2 text-sm text-destructive">No payment modes configured.</p>
                      ) : (
                        paymentModes.map(pm => (
                          <button
                            key={pm.id}
                            type="button"
                            onClick={() => setNewBill({ ...newBill, payment_mode_id: pm.id })}
                            className={`px-3 py-2.5 rounded-md border text-sm font-medium transition-colors text-left ${
                              newBill.payment_mode_id === pm.id
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background border-input hover:bg-accent hover:text-accent-foreground'
                            }`}
                          >
                            {pm.name}
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Reference */}
                  <div className="space-y-2">
                    <Label>Reference / Cheque No.</Label>
                    <Input
                      value={newBill.reference_number}
                      onChange={(e) => setNewBill({ ...newBill, reference_number: e.target.value })}
                      placeholder="Cheque no., transaction ref, etc."
                    />
                  </div>

                  {/* Due Date */}
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={newBill.due_date}
                      onChange={(e) => setNewBill({ ...newBill, due_date: e.target.value })}
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={newBill.description}
                      onChange={(e) => setNewBill({ ...newBill, description: e.target.value })}
                      placeholder="Bill description or narration..."
                      rows={2}
                    />
                  </div>

                  <Button onClick={handleCreateBill} className="w-full" disabled={submitting || !newBill.payment_mode_id}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {newBill.payment_mode_id ? 'Create Bill' : 'Select a Payment Mode to Continue'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </ActionButton>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Bills ({filtered.length})</CardTitle>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search bills..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No Bills Found</h3>
                <p className="text-muted-foreground">Create your first bill to get started</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill #</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((payable) => (
                    <TableRow key={payable.id}>
                      <TableCell className="font-mono text-sm">{payable.bill_number}</TableCell>
                      <TableCell className="font-medium">{payable.vendor_name}</TableCell>
                      <TableCell>{format(new Date(payable.bill_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{payable.due_date ? format(new Date(payable.due_date), 'dd/MM/yyyy') : '—'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(payable.total_amount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(payable.amount_paid)}</TableCell>
                      <TableCell className="text-right font-medium text-destructive">{formatCurrency(payable.balance_due)}</TableCell>
                      <TableCell>{getStatusBadge(payable.status)}</TableCell>
                      <TableCell>
                        {payable.balance_due > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedPayable(payable);
                              setPaymentData({ amount: payable.balance_due.toString(), payment_mode_id: '', reference_number: '' });
                              setPaymentDialogOpen(true);
                            }}
                          >
                            <DollarSign className="mr-1 h-4 w-4" />
                            Pay
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* ── Record Payment Dialog ── */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
            </DialogHeader>
            {selectedPayable && (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg space-y-1 text-sm">
                  <p><strong>Bill:</strong> {selectedPayable.bill_number}</p>
                  <p><strong>Vendor:</strong> {selectedPayable.vendor_name}</p>
                  <p><strong>Balance Due:</strong> <span className="font-bold text-destructive">{formatCurrency(selectedPayable.balance_due)}</span></p>
                </div>

                {/* Payment Mode — required */}
                <div className="space-y-2">
                  <Label className="font-semibold">Payment Mode <span className="text-destructive">*</span></Label>
                  {paymentModes.length === 0 ? (
                    <p className="text-sm text-destructive">No payment modes configured.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {paymentModes.map(pm => (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => setPaymentData({ ...paymentData, payment_mode_id: pm.id })}
                          className={`px-3 py-2.5 rounded-md border text-sm font-medium transition-colors text-left ${
                            paymentData.payment_mode_id === pm.id
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background border-input hover:bg-accent hover:text-accent-foreground'
                          }`}
                        >
                          {pm.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Payment Amount (KES) *</Label>
                  <Input
                    type="number"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                    placeholder="0.00"
                    max={selectedPayable.balance_due}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Reference / Cheque No.</Label>
                  <Input
                    value={paymentData.reference_number}
                    onChange={(e) => setPaymentData({ ...paymentData, reference_number: e.target.value })}
                    placeholder="Transaction reference"
                  />
                </div>

                <Button onClick={handleRecordPayment} className="w-full" disabled={submitting || !paymentData.payment_mode_id}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {paymentData.payment_mode_id ? 'Record Payment' : 'Select a Payment Mode to Continue'}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedPage>
  );
}
