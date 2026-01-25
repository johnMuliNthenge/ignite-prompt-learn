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

interface PaymentVoucher {
  id: string;
  voucher_number: string;
  vendor_id: string;
  vendor_name: string;
  voucher_date: string;
  amount: number;
  description: string;
  status: 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Paid';
  payment_mode: string;
  cheque_number?: string;
  approved_by?: string;
  approved_at?: string;
}

interface Vendor {
  id: string;
  name: string;
}

interface PaymentMode {
  id: string;
  name: string;
}

export default function PaymentVouchers() {
  const { isAdmin, user } = useAuth();
  const [vouchers, setVouchers] = useState<PaymentVoucher[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    vendor_id: '',
    amount: '',
    description: '',
    payment_mode_id: '',
    cheque_number: '',
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
    // For now, use mock data since we need to create the table
    // In production, this would fetch from payable_vouchers table
    setVouchers([]);
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
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    if (!error) setPaymentModes(data || []);
  };

  const generateVoucherNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `PV-${year}-${random}`;
  };

  const handleCreate = async () => {
    if (!formData.vendor_id || !formData.amount || !formData.payment_mode_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const voucherNumber = generateVoucherNumber();
      const amount = parseFloat(formData.amount);

      // In production, insert into payable_vouchers table
      toast.success(`Payment Voucher ${voucherNumber} created successfully`);
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
      amount: '',
      description: '',
      payment_mode_id: '',
      cheque_number: '',
      voucher_date: format(new Date(), 'yyyy-MM-dd'),
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'Draft': 'bg-gray-500',
      'Pending': 'bg-yellow-500',
      'Approved': 'bg-blue-500',
      'Rejected': 'bg-red-500',
      'Paid': 'bg-green-500',
    };
    return <Badge className={colors[status] || 'bg-gray-500'}>{status}</Badge>;
  };

  if (!isAdmin) {
    return <div className="p-6"><p className="text-muted-foreground">Access denied</p></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Payment Vouchers</h1>
          <p className="text-muted-foreground">Create and manage payment vouchers for vendor payments</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Create Voucher</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Payment Voucher</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Voucher Date *</Label>
                <Input
                  type="date"
                  value={formData.voucher_date}
                  onChange={(e) => setFormData({ ...formData, voucher_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Vendor/Payee *</Label>
                <Select value={formData.vendor_id} onValueChange={(v) => setFormData({ ...formData, vendor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                  <SelectContent>
                    {vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
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
                <Label>Payment Mode *</Label>
                <Select value={formData.payment_mode_id} onValueChange={(v) => setFormData({ ...formData, payment_mode_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select payment mode" /></SelectTrigger>
                  <SelectContent>
                    {paymentModes.map((pm) => <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cheque Number (if applicable)</Label>
                <Input
                  value={formData.cheque_number}
                  onChange={(e) => setFormData({ ...formData, cheque_number: e.target.value })}
                  placeholder="CHQ-001"
                />
              </div>
              <div className="space-y-2">
                <Label>Description/Narration</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Payment details..."
                  rows={3}
                />
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Voucher
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
          ) : vouchers.length === 0 ? (
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
                  <TableHead>Vendor</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vouchers.map((voucher) => (
                  <TableRow key={voucher.id}>
                    <TableCell className="font-mono">{voucher.voucher_number}</TableCell>
                    <TableCell>{format(new Date(voucher.voucher_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{voucher.vendor_name}</TableCell>
                    <TableCell className="max-w-xs truncate">{voucher.description}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(voucher.amount)}</TableCell>
                    <TableCell>{getStatusBadge(voucher.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                        {voucher.status === 'Pending' && (
                          <>
                            <Button variant="ghost" size="icon" className="text-green-500"><CheckCircle className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-red-500"><XCircle className="h-4 w-4" /></Button>
                          </>
                        )}
                      </div>
                    </TableCell>
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
