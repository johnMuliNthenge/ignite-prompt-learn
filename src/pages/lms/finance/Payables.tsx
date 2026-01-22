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
import { Search, Plus, Eye, DollarSign, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Payable {
  id: string;
  bill_number: string;
  vendor_id: string;
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

export default function Payables() {
  const { isAdmin, user } = useAuth();
  const [payables, setPayables] = useState<Payable[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState<Payable | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [newBill, setNewBill] = useState({
    vendor_id: '',
    amount: '',
    description: '',
    due_date: '',
  });

  const [paymentAmount, setPaymentAmount] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([fetchPayables(), fetchVendors()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayables = async () => {
    const { data, error } = await supabase
      .from('payables')
      .select(`
        id,
        bill_number,
        vendor_id,
        bill_date,
        due_date,
        total_amount,
        amount_paid,
        balance_due,
        status,
        vendors(name)
      `)
      .order('bill_date', { ascending: false });

    if (error) {
      console.error('Error fetching payables:', error);
      toast.error('Failed to load payables');
      return;
    }

    const formattedPayables: Payable[] = (data || []).map((pay: any) => ({
      id: pay.id,
      bill_number: pay.bill_number,
      vendor_id: pay.vendor_id,
      vendor_name: pay.vendors?.name || 'Unknown',
      bill_date: pay.bill_date,
      due_date: pay.due_date,
      total_amount: Number(pay.total_amount) || 0,
      amount_paid: Number(pay.amount_paid) || 0,
      balance_due: Number(pay.balance_due) || 0,
      status: pay.status,
    }));

    setPayables(formattedPayables);
  };

  const fetchVendors = async () => {
    const { data, error } = await supabase
      .from('vendors')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching vendors:', error);
      return;
    }

    setVendors(data || []);
  };

  const generateBillNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `BILL-${year}-${random}`;
  };

  const handleCreateBill = async () => {
    if (!newBill.vendor_id || !newBill.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const amount = parseFloat(newBill.amount);
      const billNumber = generateBillNumber();

      const { error } = await supabase.from('payables').insert({
        bill_number: billNumber,
        vendor_id: newBill.vendor_id,
        bill_date: new Date().toISOString().split('T')[0],
        due_date: newBill.due_date || null,
        subtotal: amount,
        total_amount: amount,
        balance_due: amount,
        status: 'Unpaid',
        notes: newBill.description,
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success('Bill created successfully');
      setCreateDialogOpen(false);
      setNewBill({ vendor_id: '', amount: '', description: '', due_date: '' });
      fetchPayables();
    } catch (error: any) {
      console.error('Error creating bill:', error);
      toast.error(error.message || 'Failed to create bill');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedPayable || !paymentAmount) {
      toast.error('Please enter payment amount');
      return;
    }

    const amount = parseFloat(paymentAmount);
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
        vendor_id: selectedPayable.vendor_id,
        payment_date: new Date().toISOString().split('T')[0],
        amount: amount,
        status: 'Completed',
        paid_by: user?.id,
      });

      if (paymentError) throw paymentError;

      const newAmountPaid = selectedPayable.amount_paid + amount;
      const newBalance = selectedPayable.total_amount - newAmountPaid;
      const newStatus = newBalance <= 0 ? 'Paid' : 'Partial';

      const { error: updateError } = await supabase
        .from('payables')
        .update({
          amount_paid: newAmountPaid,
          balance_due: newBalance,
          status: newStatus,
        })
        .eq('id', selectedPayable.id);

      if (updateError) throw updateError;

      toast.success('Payment recorded successfully');
      setPaymentDialogOpen(false);
      setPaymentAmount('');
      setSelectedPayable(null);
      fetchPayables();
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast.error(error.message || 'Failed to record payment');
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid':
        return <Badge className="bg-green-500">Paid</Badge>;
      case 'Partial':
        return <Badge className="bg-yellow-500">Partial</Badge>;
      case 'Overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      case 'Cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Unpaid</Badge>;
    }
  };

  const filteredPayables = payables.filter(
    (pay) =>
      pay.bill_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pay.vendor_name.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-3xl font-bold">Payables</h1>
          <p className="text-muted-foreground">Manage vendor bills and payments</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Bill
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Bill</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Vendor *</Label>
                <Select
                  value={newBill.vendor_id}
                  onValueChange={(value) => setNewBill({ ...newBill, vendor_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount (KES) *</Label>
                <Input
                  type="number"
                  value={newBill.amount}
                  onChange={(e) => setNewBill({ ...newBill, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newBill.description}
                  onChange={(e) => setNewBill({ ...newBill, description: e.target.value })}
                  placeholder="Bill description"
                />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={newBill.due_date}
                  onChange={(e) => setNewBill({ ...newBill, due_date: e.target.value })}
                />
              </div>
              <Button onClick={handleCreateBill} className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Bill
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Bills</CardTitle>
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
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
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
                {filteredPayables.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      No bills found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayables.map((payable) => (
                    <TableRow key={payable.id}>
                      <TableCell className="font-mono">{payable.bill_number}</TableCell>
                      <TableCell className="font-medium">{payable.vendor_name}</TableCell>
                      <TableCell>{format(new Date(payable.bill_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        {payable.due_date ? format(new Date(payable.due_date), 'dd/MM/yyyy') : '-'}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(payable.total_amount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(payable.amount_paid)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(payable.balance_due)}
                      </TableCell>
                      <TableCell>{getStatusBadge(payable.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" title="View Details">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {payable.balance_due > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Record Payment"
                              onClick={() => {
                                setSelectedPayable(payable);
                                setPaymentDialogOpen(true);
                              }}
                            >
                              <DollarSign className="h-4 w-4" />
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

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          {selectedPayable && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p><strong>Bill:</strong> {selectedPayable.bill_number}</p>
                <p><strong>Vendor:</strong> {selectedPayable.vendor_name}</p>
                <p><strong>Balance Due:</strong> {formatCurrency(selectedPayable.balance_due)}</p>
              </div>
              <div className="space-y-2">
                <Label>Payment Amount (KES) *</Label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  max={selectedPayable.balance_due}
                />
              </div>
              <Button onClick={handleRecordPayment} className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Payment
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
