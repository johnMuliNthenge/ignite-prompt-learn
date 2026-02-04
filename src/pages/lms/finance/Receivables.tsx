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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Search, DollarSign, Loader2, Receipt, Printer, ChevronLeft, ChevronRight, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ProtectedPage, ActionButton, useModulePermissions } from '@/components/auth/ProtectedPage';
import PaymentReceipt from '@/components/lms/finance/PaymentReceipt';

const MODULE_CODE = 'finance.receivables';

interface Payment {
  id: string;
  receipt_number: string;
  student_id: string;
  student_name: string;
  student_no: string;
  payment_date: string;
  amount: number;
  reference_number: string | null;
  notes: string | null;
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
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [feeAccounts, setFeeAccounts] = useState<FeeAccount[]>([]);
  const [incomeAccounts, setIncomeAccounts] = useState<IncomeAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [receivePaymentDialogOpen, setReceivePaymentDialogOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const receiptRef = useRef<HTMLDivElement>(null);

  // M-Pesa state
  const [mpesaDialogOpen, setMpesaDialogOpen] = useState(false);
  const [mpesaEnabled, setMpesaEnabled] = useState(false);
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [mpesaAmount, setMpesaAmount] = useState('');
  const [mpesaStudentId, setMpesaStudentId] = useState('');
  const [mpesaSubmitting, setMpesaSubmitting] = useState(false);

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

  useEffect(() => {
    fetchData();
    checkMpesaSettings();
  }, []);

  const checkMpesaSettings = async () => {
    const { data } = await supabase
      .from('mpesa_settings')
      .select('is_active')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    
    setMpesaEnabled(!!data?.is_active);
  };

  const handleMpesaPayment = async () => {
    if (!mpesaStudentId || !mpesaPhone || !mpesaAmount) {
      toast.error('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(mpesaAmount);
    if (amount < 1) {
      toast.error('Minimum amount is KES 1');
      return;
    }

    setMpesaSubmitting(true);
    try {
      // Get student's oldest unpaid invoice for reference
      const { data: invoices } = await supabase
        .from('fee_invoices')
        .select('id')
        .eq('student_id', mpesaStudentId)
        .gt('balance_due', 0)
        .order('invoice_date', { ascending: true })
        .limit(1);

      const student = students.find(s => s.id === mpesaStudentId);

      const { data, error } = await supabase.functions.invoke('mpesa-stk-push', {
        body: {
          phone_number: mpesaPhone,
          amount: amount,
          student_id: mpesaStudentId,
          invoice_id: invoices && invoices.length > 0 ? invoices[0].id : null,
          account_reference: student?.student_no || 'SchoolFees',
          transaction_desc: `Fee payment for ${student?.other_name} ${student?.surname}`,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('STK Push sent! Please check your phone and enter your M-Pesa PIN.');
        setMpesaDialogOpen(false);
        setMpesaPhone('');
        setMpesaAmount('');
        setMpesaStudentId('');
      } else {
        toast.error(data?.error || 'Failed to initiate M-Pesa payment');
      }
    } catch (error: any) {
      console.error('M-Pesa error:', error);
      toast.error(error.message || 'Failed to initiate M-Pesa payment');
    } finally {
      setMpesaSubmitting(false);
    }
  };

  const fetchData = async () => {
    try {
      await Promise.all([fetchPayments(), fetchStudents(), fetchFeeAccounts(), fetchIncomeAccounts()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    const { data, error } = await supabase
      .from('fee_payments')
      .select(`
        id,
        receipt_number,
        student_id,
        payment_date,
        amount,
        reference_number,
        notes,
        status,
        students(student_no, other_name, surname)
      `)
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payments');
      return;
    }

    const formattedPayments: Payment[] = (data || []).map((pay: any) => ({
      id: pay.id,
      receipt_number: pay.receipt_number,
      student_id: pay.student_id,
      student_name: pay.students ? `${pay.students.other_name} ${pay.students.surname}` : 'Unknown',
      student_no: pay.students?.student_no || '',
      payment_date: pay.payment_date,
      amount: Number(pay.amount) || 0,
      reference_number: pay.reference_number,
      notes: pay.notes,
      status: pay.status || 'Completed',
    }));

    setPayments(formattedPayments);
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
      .order('invoice_date', { ascending: true });

    if (!invoices || invoices.length === 0) {
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
      fetchPayments(); // Refresh the list
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
      const newStatus = newBalanceDue < 0 ? 'Overpaid' : newBalanceDue === 0 ? 'Paid' : 'Partial';

      await supabase
        .from('fee_invoices')
        .update({
          amount_paid: newAmountPaid,
          balance_due: newBalanceDue,
          status: newStatus,
        })
        .eq('id', invoice.id);

      remainingPayment -= amountToApply;
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
            .receipt-container { max-width: 400px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .mb-4 { margin-bottom: 1rem; }
            .mt-4 { margin-top: 1rem; }
            .border-t { border-top: 1px solid #ddd; padding-top: 0.5rem; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleViewReceipt = async (payment: Payment) => {
    // Fetch vote heads for the receipt
    const voteHeads = await fetchVoteHeadsForStudent(payment.student_id, payment.amount);

    setReceiptData({
      receiptNumber: payment.receipt_number,
      studentName: payment.student_name,
      studentNo: payment.student_no,
      paymentDate: payment.payment_date,
      amount: payment.amount,
      referenceNumber: payment.reference_number || undefined,
      notes: payment.notes || undefined,
      voteHeads,
    });
    setReceiptDialogOpen(true);
  };

  // Filter payments based on search
  const filteredPayments = payments.filter(payment =>
    payment.receipt_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.student_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedPayments = filteredPayments.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return <Badge variant="default">Completed</Badge>;
      case 'Pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'Cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculate totals
  const totalReceived = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <ProtectedPage moduleCode={MODULE_CODE}>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Receivables</h1>
            <p className="text-muted-foreground">Manage student fee payments and receipts</p>
          </div>
          <div className="flex gap-2">
            {mpesaEnabled && (
              <Dialog open={mpesaDialogOpen} onOpenChange={setMpesaDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary">
                    <Smartphone className="mr-2 h-4 w-4" />
                    Prompt Payment
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>M-Pesa Payment Prompt</DialogTitle>
                    <DialogDescription>Send an STK push to the student's phone</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Student *</Label>
                      <Select
                        value={mpesaStudentId}
                        onValueChange={setMpesaStudentId}
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
                      <Label>Phone Number *</Label>
                      <Input
                        placeholder="e.g., 0712345678"
                        value={mpesaPhone}
                        onChange={(e) => setMpesaPhone(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Enter the M-Pesa registered phone number</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Amount (KES) *</Label>
                      <Input
                        type="number"
                        placeholder="Enter amount"
                        value={mpesaAmount}
                        onChange={(e) => setMpesaAmount(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setMpesaDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleMpesaPayment} disabled={mpesaSubmitting}>
                      {mpesaSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Send STK Push
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            <ActionButton moduleCode={MODULE_CODE} action="add">
              <Dialog open={receivePaymentDialogOpen} onOpenChange={setReceivePaymentDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Receive Payment
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Receive Payment</DialogTitle>
                    <DialogDescription>Record a fee payment from a student</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Student *</Label>
                      <Select
                        value={newPayment.student_id}
                        onValueChange={(value) => setNewPayment({ ...newPayment, student_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a student" />
                        </SelectTrigger>
                        <SelectContent>
                          {students.map((student) => (
                            <SelectItem key={student.id} value={student.id}>
                              {student.other_name} {student.surname} ({student.student_no})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Income Account</Label>
                      <Select
                        value={newPayment.income_account_id}
                        onValueChange={(value) => setNewPayment({ ...newPayment, income_account_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an income account (optional)" />
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
                        placeholder="Enter payment amount"
                        value={newPayment.amount}
                        onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Reference Number</Label>
                      <Input
                        placeholder="Bank/MPESA reference (optional)"
                        value={newPayment.reference_number}
                        onChange={(e) => setNewPayment({ ...newPayment, reference_number: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Input
                        placeholder="Additional notes (optional)"
                        value={newPayment.notes}
                        onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setReceivePaymentDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleReceivePayment} disabled={submitting}>
                      {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Receive Payment
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </ActionButton>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Total Receipts</div>
              <div className="text-2xl font-bold">{filteredPayments.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Total Amount Received</div>
          <div className="text-2xl font-bold text-primary">{formatCurrency(totalReceived)}</div>
        </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Showing</div>
              <div className="text-2xl font-bold">{paginatedPayments.length} of {filteredPayments.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by receipt number, student name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Payment Receipts ({filteredPayments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : paginatedPayments.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No Receipts Found</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'No receipts match your search' : 'No payments have been recorded yet'}
                </p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt No.</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono font-medium">{payment.receipt_number}</TableCell>
                        <TableCell>{format(new Date(payment.payment_date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{payment.student_name}</p>
                            <p className="text-xs text-muted-foreground">{payment.student_no}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium text-primary">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>{payment.reference_number || '-'}</TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewReceipt(payment)}
                          >
                            <Printer className="h-4 w-4 mr-1" />
                            Print Receipt
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </div>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                          </Button>
                        </PaginationItem>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                onClick={() => setCurrentPage(pageNum)}
                                isActive={currentPage === pageNum}
                                className="cursor-pointer"
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        <PaginationItem>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                          >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Receipt Dialog */}
        <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Payment Receipt</DialogTitle>
              <DialogDescription>Print or save this receipt</DialogDescription>
            </DialogHeader>
            <div ref={receiptRef}>
              {receiptData && (
                <PaymentReceipt
                  receiptNumber={receiptData.receiptNumber}
                  studentName={receiptData.studentName}
                  studentNo={receiptData.studentNo}
                  paymentDate={receiptData.paymentDate}
                  amount={receiptData.amount}
                  referenceNumber={receiptData.referenceNumber}
                  notes={receiptData.notes}
                  voteHeads={receiptData.voteHeads}
                />
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setReceiptDialogOpen(false)}>
                Close
              </Button>
              <Button onClick={handlePrintReceipt}>
                <Printer className="mr-2 h-4 w-4" />
                Print Receipt
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedPage>
  );
}
