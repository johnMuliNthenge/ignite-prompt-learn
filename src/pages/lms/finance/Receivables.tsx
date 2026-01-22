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
import { Search, Plus, Eye, DollarSign, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Invoice {
  id: string;
  invoice_number: string;
  student_id: string;
  student_name: string;
  student_no: string;
  invoice_date: string;
  due_date: string | null;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: string;
}

interface Student {
  id: string;
  student_no: string;
  full_name: string;
}

interface FeeAccount {
  id: string;
  name: string;
}

export default function Receivables() {
  const { isAdmin, user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [feeAccounts, setFeeAccounts] = useState<FeeAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [newInvoice, setNewInvoice] = useState({
    student_id: '',
    fee_account_id: '',
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
      await Promise.all([fetchInvoices(), fetchStudents(), fetchFeeAccounts()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    const { data, error } = await supabase
      .from('fee_invoices')
      .select(`
        id,
        invoice_number,
        student_id,
        invoice_date,
        due_date,
        total_amount,
        amount_paid,
        balance_due,
        status,
        students(student_no, full_name)
      `)
      .order('invoice_date', { ascending: false });

    if (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to load invoices');
      return;
    }

    const formattedInvoices: Invoice[] = (data || []).map((inv: any) => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      student_id: inv.student_id,
      student_name: inv.students?.full_name || 'Unknown',
      student_no: inv.students?.student_no || '',
      invoice_date: inv.invoice_date,
      due_date: inv.due_date,
      total_amount: Number(inv.total_amount) || 0,
      amount_paid: Number(inv.amount_paid) || 0,
      balance_due: Number(inv.balance_due) || 0,
      status: inv.status,
    }));

    setInvoices(formattedInvoices);
  };

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from('students')
      .select('id, student_no, full_name')
      .order('full_name');

    if (error) {
      console.error('Error fetching students:', error);
      return;
    }

    setStudents((data as Student[]) || []);
  };

  const fetchFeeAccounts = async () => {
    const { data, error } = await supabase
      .from('fee_accounts')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching fee accounts:', error);
      return;
    }

    setFeeAccounts(data || []);
  };

  const handleCreateInvoice = async () => {
    if (!newInvoice.student_id || !newInvoice.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      // Generate invoice number
      const { data: invoiceNumber } = await supabase.rpc('generate_invoice_number');

      const amount = parseFloat(newInvoice.amount);

      const { data, error } = await supabase
        .from('fee_invoices')
        .insert({
          invoice_number: invoiceNumber,
          student_id: newInvoice.student_id,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: newInvoice.due_date || null,
          subtotal: amount,
          total_amount: amount,
          balance_due: amount,
          status: 'Unpaid',
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Create invoice item if fee account selected
      if (newInvoice.fee_account_id && data) {
        await supabase.from('fee_invoice_items').insert({
          invoice_id: data.id,
          fee_account_id: newInvoice.fee_account_id,
          description: newInvoice.description || 'Fee charge',
          quantity: 1,
          unit_price: amount,
          total: amount,
        });
      }

      toast.success('Invoice created successfully');
      setCreateDialogOpen(false);
      setNewInvoice({ student_id: '', fee_account_id: '', amount: '', description: '', due_date: '' });
      fetchInvoices();
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      toast.error(error.message || 'Failed to create invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice || !paymentAmount) {
      toast.error('Please enter payment amount');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || amount > selectedInvoice.balance_due) {
      toast.error('Invalid payment amount');
      return;
    }

    setSubmitting(true);
    try {
      // Generate receipt number
      const { data: receiptNumber } = await supabase.rpc('generate_receipt_number');

      // Create payment record
      const { error: paymentError } = await supabase.from('fee_payments').insert({
        receipt_number: receiptNumber,
        student_id: selectedInvoice.student_id,
        invoice_id: selectedInvoice.id,
        payment_date: new Date().toISOString().split('T')[0],
        amount: amount,
        status: 'Completed',
        received_by: user?.id,
      });

      if (paymentError) throw paymentError;

      // Update invoice
      const newAmountPaid = selectedInvoice.amount_paid + amount;
      const newBalance = selectedInvoice.total_amount - newAmountPaid;
      const newStatus = newBalance <= 0 ? 'Paid' : 'Partial';

      const { error: updateError } = await supabase
        .from('fee_invoices')
        .update({
          amount_paid: newAmountPaid,
          balance_due: newBalance,
          status: newStatus,
        })
        .eq('id', selectedInvoice.id);

      if (updateError) throw updateError;

      toast.success('Payment recorded successfully');
      setPaymentDialogOpen(false);
      setPaymentAmount('');
      setSelectedInvoice(null);
      fetchInvoices();
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

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.student_no.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-3xl font-bold">Receivables</h1>
          <p className="text-muted-foreground">Manage student fee invoices and payments</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Student *</Label>
                <Select
                  value={newInvoice.student_id}
                  onValueChange={(value) => setNewInvoice({ ...newInvoice, student_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.student_no} - {student.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fee Account</Label>
                <Select
                  value={newInvoice.fee_account_id}
                  onValueChange={(value) => setNewInvoice({ ...newInvoice, fee_account_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fee account" />
                  </SelectTrigger>
                  <SelectContent>
                    {feeAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount (KES) *</Label>
                <Input
                  type="number"
                  value={newInvoice.amount}
                  onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={newInvoice.description}
                  onChange={(e) => setNewInvoice({ ...newInvoice, description: e.target.value })}
                  placeholder="Fee description"
                />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={newInvoice.due_date}
                  onChange={(e) => setNewInvoice({ ...newInvoice, due_date: e.target.value })}
                />
              </div>
              <Button onClick={handleCreateInvoice} className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Invoice
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Invoices</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
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
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Student</TableHead>
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
                {filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      No invoices found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{invoice.student_name}</p>
                          <p className="text-xs text-muted-foreground">{invoice.student_no}</p>
                        </div>
                      </TableCell>
                      <TableCell>{format(new Date(invoice.invoice_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        {invoice.due_date ? format(new Date(invoice.due_date), 'dd/MM/yyyy') : '-'}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(invoice.total_amount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(invoice.amount_paid)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(invoice.balance_due)}
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" title="View Details">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {invoice.balance_due > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Record Payment"
                              onClick={() => {
                                setSelectedInvoice(invoice);
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

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p><strong>Invoice:</strong> {selectedInvoice.invoice_number}</p>
                <p><strong>Student:</strong> {selectedInvoice.student_name}</p>
                <p><strong>Balance Due:</strong> {formatCurrency(selectedInvoice.balance_due)}</p>
              </div>
              <div className="space-y-2">
                <Label>Payment Amount (KES) *</Label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  max={selectedInvoice.balance_due}
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
