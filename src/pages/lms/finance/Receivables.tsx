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
import { Search, Plus, Eye, DollarSign, Loader2, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ProtectedPage, ActionButton, useModulePermissions } from '@/components/auth/ProtectedPage';

const MODULE_CODE = 'finance.receivables';

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
  student_no: string | null;
  other_name: string;
  surname: string;
}

interface FeeAccount {
  id: string;
  name: string;
}

interface IncomeAccount {
  id: string;
  account_code: string;
  account_name: string;
}

export default function Receivables() {
  const { user } = useAuth();
  const { canAdd, canEdit } = useModulePermissions(MODULE_CODE);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [feeAccounts, setFeeAccounts] = useState<FeeAccount[]>([]);
  const [incomeAccounts, setIncomeAccounts] = useState<IncomeAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [receivePaymentDialogOpen, setReceivePaymentDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Receive Payment form state
  const [newPayment, setNewPayment] = useState({
    student_id: '',
    income_account_id: '',
    amount: '',
    reference_number: '',
    notes: '',
  });

  const [paymentAmount, setPaymentAmount] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([fetchInvoices(), fetchStudents(), fetchFeeAccounts(), fetchIncomeAccounts()]);
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
        students(student_no, other_name, surname)
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
      student_name: inv.students ? `${inv.students.other_name} ${inv.students.surname}` : 'Unknown',
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
      .select('id, student_no, other_name, surname')
      .order('surname');

    if (error) {
      console.error('Error fetching students:', error);
      return;
    }

    setStudents(data || []);
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

  const fetchIncomeAccounts = async () => {
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('id, account_code, account_name')
      .eq('account_type', 'Income')
      .eq('is_active', true)
      .order('account_code');

    if (error) {
      console.error('Error fetching income accounts:', error);
      return;
    }

    setIncomeAccounts(data || []);
  };

  // Handle Receive Payment - standalone payment not tied to a specific invoice
  const handleReceivePayment = async () => {
    if (!newPayment.student_id || !newPayment.amount) {
      toast.error('Please select a student and enter the payment amount');
      return;
    }

    const amount = parseFloat(newPayment.amount);
    if (amount <= 0) {
      toast.error('Payment amount must be greater than zero');
      return;
    }

    setSubmitting(true);
    try {
      // Generate receipt number
      const { data: receiptNumber } = await supabase.rpc('generate_receipt_number');

      // Create the payment record
      const { error: paymentError } = await supabase.from('fee_payments').insert({
        receipt_number: receiptNumber,
        student_id: newPayment.student_id,
        invoice_id: null, // Standalone payment - will be allocated via FIFO
        payment_date: new Date().toISOString().split('T')[0],
        amount: amount,
        reference_number: newPayment.reference_number || null,
        notes: newPayment.notes || null,
        status: 'Completed',
        received_by: user?.id,
      });

      if (paymentError) throw paymentError;

      // Now apply FIFO allocation - update oldest unpaid invoices first
      await applyFIFOPaymentAllocation(newPayment.student_id, amount);

      toast.success(`Payment of ${formatCurrency(amount)} received successfully`);
      setReceivePaymentDialogOpen(false);
      setNewPayment({ student_id: '', income_account_id: '', amount: '', reference_number: '', notes: '' });
      fetchInvoices();
    } catch (error: any) {
      console.error('Error receiving payment:', error);
      toast.error(error.message || 'Failed to receive payment');
    } finally {
      setSubmitting(false);
    }
  };

  // FIFO Payment Allocation - apply payment to oldest invoices first
  const applyFIFOPaymentAllocation = async (studentId: string, paymentAmount: number) => {
    // Fetch all unpaid/partial invoices for the student, ordered by date (oldest first)
    const { data: unpaidInvoices, error } = await supabase
      .from('fee_invoices')
      .select('id, total_amount, amount_paid, balance_due')
      .eq('student_id', studentId)
      .gt('balance_due', 0)
      .order('invoice_date', { ascending: true });

    if (error) {
      console.error('Error fetching unpaid invoices:', error);
      return;
    }

    let remainingPayment = paymentAmount;

    for (const invoice of (unpaidInvoices || [])) {
      if (remainingPayment <= 0) break;

      const invoiceBalance = Number(invoice.balance_due) || 0;
      const amountToApply = Math.min(remainingPayment, invoiceBalance);
      const newAmountPaid = (Number(invoice.amount_paid) || 0) + amountToApply;
      const newBalanceDue = (Number(invoice.total_amount) || 0) - newAmountPaid;
      const newStatus = newBalanceDue <= 0 ? 'Paid' : 'Partial';

      await supabase
        .from('fee_invoices')
        .update({
          amount_paid: newAmountPaid,
          balance_due: Math.max(0, newBalanceDue),
          status: newStatus,
        })
        .eq('id', invoice.id);

      remainingPayment -= amountToApply;
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
        return <Badge className="bg-green-600 hover:bg-green-700">Paid</Badge>;
      case 'Partial':
        return <Badge className="bg-yellow-600 hover:bg-yellow-700">Partial</Badge>;
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

  return (
    <ProtectedPage moduleCode={MODULE_CODE} title="Receivables">
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Receivables</h1>
          <p className="text-muted-foreground">Manage student fee invoices and payments</p>
        </div>
        <ActionButton moduleCode={MODULE_CODE} action="add">
          <Dialog open={receivePaymentDialogOpen} onOpenChange={setReceivePaymentDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Receipt className="mr-2 h-4 w-4" />
                Receive Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Receive Payment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Student *</Label>
                  <Select
                    value={newPayment.student_id}
                    onValueChange={(value) => setNewPayment({ ...newPayment, student_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.student_no} - {student.other_name} {student.surname}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Income Account (optional)</Label>
                  <Select
                    value={newPayment.income_account_id}
                    onValueChange={(value) => setNewPayment({ ...newPayment, income_account_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select income account" />
                    </SelectTrigger>
                    <SelectContent>
                      {incomeAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.account_code} - {account.account_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount (KES) *</Label>
                  <Input
                    type="number"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reference Number</Label>
                  <Input
                    value={newPayment.reference_number}
                    onChange={(e) => setNewPayment({ ...newPayment, reference_number: e.target.value })}
                    placeholder="e.g., Bank transaction ref"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input
                    value={newPayment.notes}
                    onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                    placeholder="Payment notes"
                  />
                </div>
                <Button onClick={handleReceivePayment} className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Receive Payment
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </ActionButton>
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
    </ProtectedPage>
  );
}
