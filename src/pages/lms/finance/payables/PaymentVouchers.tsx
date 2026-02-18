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
import { Search, Plus, Eye, CheckCircle, XCircle, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ProtectedPage, ActionButton, useModulePermissions } from '@/components/auth/ProtectedPage';

const MODULE_CODE = 'finance.payables';

interface PaymentVoucher {
  id: string;
  voucher_number: string;
  vendor_name: string;
  voucher_date: string;
  amount: number;
  description: string;
  status: 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Paid';
  payment_mode_id: string | null;
  reference_number: string | null;
  payment_modes?: { name: string } | null;
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

export default function PaymentVouchers() {
  const { user } = useAuth();
  const { canAdd, canEdit, canChangeStatus } = useModulePermissions(MODULE_CODE);
  const [vouchers, setVouchers] = useState<PaymentVoucher[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Vendor mode: 'select' = choose from list, 'new' = type new vendor
  const [vendorMode, setVendorMode] = useState<'select' | 'new'>('select');

  const [formData, setFormData] = useState({
    vendor_id: '',
    vendor_name_new: '',
    amount: '',
    description: '',
    payment_mode_id: '',
    reference_number: '',
    voucher_date: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([fetchVouchers(), fetchVendors(), fetchPaymentModes()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchVouchers = async () => {
    const { data, error } = await supabase
      .from('payment_vouchers')
      .select('id, voucher_number, vendor_name, voucher_date, amount, description, status, payment_mode_id, reference_number, payment_modes(name)')
      .order('created_at', { ascending: false });
    if (!error) setVouchers((data as any) || []);
  };

  const fetchVendors = async () => {
    const { data, error } = await supabase
      .from('vendors')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    if (!error) setVendors(data || []);
  };

  const fetchPaymentModes = async () => {
    const { data, error } = await supabase
      .from('payment_modes')
      .select('id, name, asset_account_id')
      .eq('is_active', true)
      .order('name');
    if (!error) setPaymentModes((data as any) || []);
  };

  const handleCreate = async () => {
    const vendorName = vendorMode === 'new' ? formData.vendor_name_new.trim() : vendors.find(v => v.id === formData.vendor_id)?.name || '';

    if (!vendorName) {
      toast.error('Please select or enter a vendor/payee name');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!formData.payment_mode_id) {
      toast.error('Payment mode is required');
      return;
    }

    setSubmitting(true);
    try {
      // Generate voucher number via DB function
      const { data: vNumData } = await supabase.rpc('generate_voucher_number');
      const voucherNumber = vNumData || `PV-${Date.now()}`;
      const amount = parseFloat(formData.amount);

      // Get selected payment mode (has linked asset account)
      const selectedMode = paymentModes.find(pm => pm.id === formData.payment_mode_id);

      // Post journal entry if asset account is linked
      let journalEntryId: string | null = null;
      if (selectedMode?.asset_account_id) {
        const jeNumber = await supabase.rpc('generate_journal_number');

        // Insert journal entry header
        const { data: jeData, error: jeError } = await supabase
          .from('journal_entries')
          .insert({
            entry_number: jeNumber.data || `JE-PV-${Date.now()}`,
            transaction_date: formData.voucher_date,
            reference: voucherNumber,
            narration: `Payment to ${vendorName} — ${formData.description || 'Vendor payment'}`,
            entry_type: 'payment_voucher',
            status: 'Posted',
            total_debit: amount,
            total_credit: amount,
            prepared_by: user?.id,
          })
          .select('id')
          .single();

        if (!jeError && jeData) {
          journalEntryId = jeData.id;

          // Post to general_ledger:
          // CREDIT the asset account (money going out)
          await supabase.from('general_ledger').insert([
            {
              journal_entry_id: jeData.id,
              account_id: selectedMode.asset_account_id,
              vendor_id: vendorMode === 'select' ? formData.vendor_id || null : null,
              transaction_date: formData.voucher_date,
              debit: 0,
              credit: amount,
              balance: 0,
              description: `Payment to ${vendorName} via ${selectedMode.name}`,
            },
          ]);
        }
      }

      // Insert voucher record
      const { error: vError } = await supabase.from('payment_vouchers').insert({
        voucher_number: voucherNumber,
        vendor_id: vendorMode === 'select' ? formData.vendor_id || null : null,
        vendor_name: vendorName,
        voucher_date: formData.voucher_date,
        amount,
        description: formData.description || null,
        payment_mode_id: formData.payment_mode_id,
        reference_number: formData.reference_number || null,
        status: 'Paid', // Direct payment — mark as Paid immediately
        journal_entry_id: journalEntryId,
        prepared_by: user?.id,
        paid_at: new Date().toISOString(),
      });

      if (vError) throw vError;

      toast.success(`Payment Voucher ${voucherNumber} created and recorded`);
      setCreateDialogOpen(false);
      resetForm();
      fetchVouchers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create voucher');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      vendor_id: '',
      vendor_name_new: '',
      amount: '',
      description: '',
      payment_mode_id: '',
      reference_number: '',
      voucher_date: format(new Date(), 'yyyy-MM-dd'),
    });
    setVendorMode('select');
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      Draft: 'bg-muted text-muted-foreground',
      Pending: 'bg-yellow-500 text-white',
      Approved: 'bg-blue-500 text-white',
      Rejected: 'bg-destructive text-destructive-foreground',
      Paid: 'bg-green-500 text-white',
    };
    return <Badge className={colors[status] || 'bg-muted'}>{status}</Badge>;
  };

  const filtered = vouchers.filter(v =>
    v.voucher_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.vendor_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ProtectedPage moduleCode={MODULE_CODE} title="Payment Vouchers">
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Payment Vouchers</h1>
            <p className="text-muted-foreground">Create and manage payment vouchers for vendor payments</p>
          </div>
          <ActionButton moduleCode={MODULE_CODE} action="add">
            <Dialog open={createDialogOpen} onOpenChange={(open) => { setCreateDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />Create Voucher</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Payment Voucher</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Date */}
                  <div className="space-y-2">
                    <Label>Voucher Date *</Label>
                    <Input
                      type="date"
                      value={formData.voucher_date}
                      onChange={(e) => setFormData({ ...formData, voucher_date: e.target.value })}
                    />
                  </div>

                  {/* Vendor selection */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Vendor / Payee *</Label>
                      <button
                        type="button"
                        className="text-xs text-primary underline"
                        onClick={() => {
                          setVendorMode(vendorMode === 'select' ? 'new' : 'select');
                          setFormData({ ...formData, vendor_id: '', vendor_name_new: '' });
                        }}
                      >
                        {vendorMode === 'select' ? '+ Type new vendor' : '← Choose from list'}
                      </button>
                    </div>
                    {vendorMode === 'select' ? (
                      <Select value={formData.vendor_id} onValueChange={(v) => setFormData({ ...formData, vendor_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                        <SelectContent>
                          {vendors.length === 0 ? (
                            <SelectItem value="none" disabled>No vendors found</SelectItem>
                          ) : (
                            vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)
                          )}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={formData.vendor_name_new}
                        onChange={(e) => setFormData({ ...formData, vendor_name_new: e.target.value })}
                        placeholder="Enter vendor or payee name"
                      />
                    )}
                  </div>

                  {/* Amount */}
                  <div className="space-y-2">
                    <Label>Amount (KES) *</Label>
                    <Input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                      min="0"
                    />
                  </div>

                  {/* Payment Mode */}
                  <div className="space-y-2">
                    <Label>Payment Mode *</Label>
                    <Select value={formData.payment_mode_id} onValueChange={(v) => setFormData({ ...formData, payment_mode_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select payment mode" /></SelectTrigger>
                      <SelectContent>
                        {paymentModes.length === 0 ? (
                          <SelectItem value="none" disabled>No payment modes configured</SelectItem>
                        ) : (
                          paymentModes.map((pm) => (
                            <SelectItem key={pm.id} value={pm.id}>
                              {pm.name}
                              {!pm.asset_account_id && ' ⚠️'}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {formData.payment_mode_id && !paymentModes.find(pm => pm.id === formData.payment_mode_id)?.asset_account_id && (
                      <p className="text-xs text-yellow-600">⚠️ This payment mode has no linked asset account. Transaction will not be posted to the ledger.</p>
                    )}
                  </div>

                  {/* Reference */}
                  <div className="space-y-2">
                    <Label>Reference / Cheque No.</Label>
                    <Input
                      value={formData.reference_number}
                      onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                      placeholder="Cheque no., transaction ref, etc."
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label>Description / Narration</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Payment details..."
                      rows={3}
                    />
                  </div>

                  <Button onClick={handleCreate} className="w-full" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create & Record Payment
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </ActionButton>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Payment Vouchers</CardTitle>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search vouchers..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No Payment Vouchers</h3>
                <p className="text-muted-foreground">Create your first payment voucher to get started</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Voucher #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Vendor / Payee</TableHead>
                    <TableHead>Payment Mode</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((voucher) => (
                    <TableRow key={voucher.id}>
                      <TableCell className="font-mono text-sm">{voucher.voucher_number}</TableCell>
                      <TableCell>{format(new Date(voucher.voucher_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="font-medium">{voucher.vendor_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{(voucher as any).payment_modes?.name || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{voucher.reference_number || '—'}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(voucher.amount)}</TableCell>
                      <TableCell>{getStatusBadge(voucher.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedPage>
  );
}
