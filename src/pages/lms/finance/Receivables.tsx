import React, { useEffect, useState, useRef } from 'react';
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
  DialogDescription,
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
import { Search, Eye, DollarSign, Loader2, Receipt, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ProtectedPage, ActionButton, useModulePermissions } from '@/components/auth/ProtectedPage';
import PaymentReceipt from '@/components/lms/finance/PaymentReceipt';

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
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  // Receipt data state
  const [receiptData, setReceiptData] = useState<{
    receiptNumber: string;
    studentName: string;
    studentNo: string;
    paymentDate: string;
    amount: number;
    referenceNumber?: string;
    notes?: string;
    voteHeads: { name: string; amount: number }[];
  } | null>(null);

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

  // Fetch vote heads (fee accounts) for a student's invoices
  const fetchVoteHeadsForStudent = async (studentId: string, paymentAmount: number): Promise<{ name: string; amount: number }[]> => {
    // Get invoice items from unpaid/partial invoices for the student
    const { data: invoices } = await supabase
      .from('fee_invoices')
      .select('id')
      .eq('student_id', studentId)
      .gt('balance_due', 0)
      .order('invoice_date', { ascending: true });

    if (!invoices || invoices.length === 0) {
      // If no invoices, check if there's an income account selected
      if (newPayment.income_account_id) {
        const account = incomeAccounts.find(a => a.id === newPayment.income_account_id);
        if (account) {
          return [{ name: `${account.account_code} - ${account.account_name}`, amount: paymentAmount }];
        }
      }
      return [];
    }

    const invoiceIds = invoices.map(inv => inv.id);

    // Get invoice items with fee account details
    const { data: items } = await supabase
      .from('fee_invoice_items')
      .select(`
        description,
        total,
        fee_account_id,
        fee_accounts(name)
      `)
      .in('invoice_id', invoiceIds);

    if (!items || items.length === 0) {
      if (newPayment.income_account_id) {
        const account = incomeAccounts.find(a => a.id === newPayment.income_account_id);
        if (account) {
          return [{ name: `${account.account_code} - ${account.account_name}`, amount: paymentAmount }];
        }
      }
      return [];
    }

    // Aggregate by fee account
    const voteHeadMap = new Map<string, number>();
    let remainingPayment = paymentAmount;

    for (const item of items) {
      if (remainingPayment <= 0) break;
      const itemAmount = Number(item.total) || 0;
      const amountToAllocate = Math.min(remainingPayment, itemAmount);
      const accountName = (item as any).fee_accounts?.name || item.description || 'General Fee';
      
      voteHeadMap.set(accountName, (voteHeadMap.get(accountName) || 0) + amountToAllocate);
      remainingPayment -= amountToAllocate;
    }

    return Array.from(voteHeadMap.entries()).map(([name, amount]) => ({ name, amount }));
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

      // Get student details for receipt
      const student = students.find(s => s.id === newPayment.student_id);
      const studentName = student ? `${student.other_name} ${student.surname}` : 'Unknown';
      const studentNo = student?.student_no || '';

      // Fetch vote heads for the receipt
      const voteHeads = await fetchVoteHeadsForStudent(newPayment.student_id, amount);

      // Set receipt data for printing
      setReceiptData({
        receiptNumber: receiptNumber || 'N/A',
        studentName,
        studentNo,
        paymentDate: new Date().toISOString().split('T')[0],
        amount,
        referenceNumber: newPayment.reference_number || undefined,
        notes: newPayment.notes || undefined,
        voteHeads,
      });

      toast.success(`Payment of ${formatCurrency(amount)} received successfully`);
      setReceivePaymentDialogOpen(false);
      setNewPayment({ student_id: '', income_account_id: '', amount: '', reference_number: '', notes: '' });
      setReceiptDialogOpen(true); // Open receipt dialog
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  };

  const handlePrintReceipt = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow pop-ups to print the receipt');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .bg-white { background-color: white; }
            .p-8 { padding: 2rem; }
            .max-w-md { max-width: 28rem; }
            .mx-auto { margin-left: auto; margin-right: auto; }
            .text-black { color: black; }
            .text-center { text-align: center; }
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            .text-2xl { font-size: 1.5rem; }
            .text-sm { font-size: 0.875rem; }
            .text-xs { font-size: 0.75rem; }
            .font-bold { font-weight: bold; }
            .font-semibold { font-weight: 600; }
            .font-medium { font-weight: 500; }
            .font-mono { font-family: monospace; }
            .uppercase { text-transform: uppercase; }
            .border { border: 1px solid #e5e7eb; }
            .border-t { border-top: 1px solid #e5e7eb; }
            .border-b { border-bottom: 1px solid #e5e7eb; }
            .border-t-2 { border-top: 2px solid black; }
            .border-b-2 { border-bottom: 2px solid black; }
            .border-black { border-color: black; }
            .border-gray-200 { border-color: #e5e7eb; }
            .rounded-lg { border-radius: 0.5rem; }
            .p-4 { padding: 1rem; }
            .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
            .pt-1 { padding-top: 0.25rem; }
            .pt-4 { padding-top: 1rem; }
            .pb-4 { padding-bottom: 1rem; }
            .mt-1 { margin-top: 0.25rem; }
            .mt-8 { margin-top: 2rem; }
            .mb-2 { margin-bottom: 0.5rem; }
            .mb-4 { margin-bottom: 1rem; }
            .mb-6 { margin-bottom: 1.5rem; }
            .mb-8 { margin-bottom: 2rem; }
            .space-y-1 > * + * { margin-top: 0.25rem; }
            .space-y-2 > * + * { margin-top: 0.5rem; }
            .space-y-3 > * + * { margin-top: 0.75rem; }
            .bg-gray-50 { background-color: #f9fafb; }
            .text-gray-500 { color: #6b7280; }
            .text-gray-600 { color: #4b5563; }
            .w-full { width: 100%; }
            .w-32 { width: 8rem; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            table { border-collapse: collapse; width: 100%; }
            th, td { padding: 0.5rem; }
            @media print {
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
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
                <DialogDescription>Record a payment from a student</DialogDescription>
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
            <DialogDescription>Record a payment against this invoice</DialogDescription>
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

      {/* Receipt Print Dialog */}
      <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Receipt</DialogTitle>
            <DialogDescription>Review and print the payment receipt</DialogDescription>
          </DialogHeader>
          {receiptData && (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <PaymentReceipt
                  ref={receiptRef}
                  receiptNumber={receiptData.receiptNumber}
                  studentName={receiptData.studentName}
                  studentNo={receiptData.studentNo}
                  paymentDate={receiptData.paymentDate}
                  amount={receiptData.amount}
                  referenceNumber={receiptData.referenceNumber}
                  notes={receiptData.notes}
                  voteHeads={receiptData.voteHeads}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setReceiptDialogOpen(false)}>
                  Close
                </Button>
                <Button onClick={handlePrintReceipt}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print Receipt
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </ProtectedPage>
  );
}
