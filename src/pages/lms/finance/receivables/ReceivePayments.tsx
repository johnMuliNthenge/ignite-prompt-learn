import React, { useEffect, useState, useRef } from 'react';
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
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Search, DollarSign, Loader2, CreditCard, Receipt, Printer, Phone, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Student {
  id: string;
  student_no: string;
  other_name: string;
  surname: string;
  total_balance: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  balance_due: number;
}

interface PaymentMode {
  id: string;
  name: string;
}

interface BankAccount {
  id: string;
  account_name: string;
  bank_name: string;
}

interface PaymentReceipt {
  receipt_number: string;
  payment_date: string;
  student_name: string;
  student_no: string;
  amount: number;
  payment_mode: string;
  reference_number: string;
  vote_heads: { name: string; amount: number }[];
  notes: string;
}

export default function ReceivePayments() {
  const { isAdmin, user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<PaymentReceipt | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  
  // M-Pesa state
  const [mpesaDialogOpen, setMpesaDialogOpen] = useState(false);
  const [mpesaEnabled, setMpesaEnabled] = useState(false);
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [mpesaAmount, setMpesaAmount] = useState('');
  const [mpesaSubmitting, setMpesaSubmitting] = useState(false);

  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_mode_id: '',
    bank_account_id: '',
    reference_number: '',
    notes: '',
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    invoice_id: '',
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

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchStudentsWithBalance(),
        fetchPaymentModes(),
        fetchBankAccounts(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentsWithBalance = async () => {
    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select('id, student_no, other_name, surname')
      .order('surname');

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      return;
    }

    // Fetch ALL invoices (DEBIT side)
    const { data: invoicesData } = await supabase
      .from('fee_invoices')
      .select('student_id, total_amount');

    // Fetch ALL completed payments (CREDIT side)
    const { data: paymentsData } = await supabase
      .from('fee_payments')
      .select('student_id, amount')
      .eq('status', 'Completed');

    if (studentsData) {
      const invoiceMap = new Map<string, number>();
      (invoicesData || []).forEach((inv: any) => {
        const current = invoiceMap.get(inv.student_id) || 0;
        invoiceMap.set(inv.student_id, current + (Number(inv.total_amount) || 0));
      });

      const paymentMap = new Map<string, number>();
      (paymentsData || []).forEach((pay: any) => {
        const current = paymentMap.get(pay.student_id) || 0;
        paymentMap.set(pay.student_id, current + (Number(pay.amount) || 0));
      });

      const studentsWithBalance: Student[] = studentsData.map((s: any) => {
        const totalInvoiced = invoiceMap.get(s.id) || 0;
        const totalPaid = paymentMap.get(s.id) || 0;
        return {
          id: s.id,
          student_no: s.student_no || '',
          other_name: s.other_name,
          surname: s.surname,
          total_balance: totalInvoiced - totalPaid, // Negative = overpayment
        };
      });

      // Show all students with invoices (including overpaid with negative balance)
      setStudents(studentsWithBalance.filter(s => s.total_balance !== 0 || invoiceMap.has(s.id)));
    }
  };

  const fetchStudentInvoices = async (studentId: string) => {
    const { data, error } = await supabase
      .from('fee_invoices')
      .select('id, invoice_number, invoice_date, total_amount, balance_due')
      .eq('student_id', studentId)
      .gt('balance_due', 0)
      .order('invoice_date');

    if (!error) {
      setInvoices((data || []).map((inv: any) => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date,
        total_amount: Number(inv.total_amount),
        balance_due: Number(inv.balance_due),
      })));
    }
  };

  const fetchPaymentModes = async () => {
    const { data, error } = await supabase
      .from('payment_modes')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    if (!error) setPaymentModes(data || []);
  };

  const fetchBankAccounts = async () => {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('id, account_name, bank_name')
      .eq('is_active', true)
      .order('account_name');
    if (!error) setBankAccounts(data || []);
  };

  const openPaymentDialog = async (student: Student) => {
    setSelectedStudent(student);
    setPaymentData({
      ...paymentData,
      amount: student.total_balance.toString(),
    });
    await fetchStudentInvoices(student.id);
    setPaymentDialogOpen(true);
  };

  const openMpesaDialog = async (student: Student) => {
    setSelectedStudent(student);
    setMpesaAmount(student.total_balance.toString());
    setMpesaPhone('');
    await fetchStudentInvoices(student.id);
    setMpesaDialogOpen(true);
  };

  const handleMpesaPayment = async () => {
    if (!selectedStudent || !mpesaPhone || !mpesaAmount) {
      toast.error('Please enter phone number and amount');
      return;
    }

    const amount = parseFloat(mpesaAmount);
    if (amount < 1) {
      toast.error('Minimum amount is KES 1');
      return;
    }

    setMpesaSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('mpesa-stk-push', {
        body: {
          phone_number: mpesaPhone,
          amount: amount,
          student_id: selectedStudent.id,
          invoice_id: invoices.length > 0 ? invoices[0].id : null,
          account_reference: selectedStudent.student_no || 'SchoolFees',
          transaction_desc: `Fee payment for ${selectedStudent.other_name} ${selectedStudent.surname}`,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('STK Push sent! Please check your phone and enter your M-Pesa PIN.');
        setMpesaDialogOpen(false);
        setMpesaPhone('');
        setMpesaAmount('');
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

  const generateReceiptNumber = async () => {
    const { data } = await supabase.rpc('generate_receipt_number');
    return data || `RCP-${Date.now()}`;
  };

  const handleReceivePayment = async () => {
    if (!selectedStudent || !paymentData.amount || !paymentData.payment_mode_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(paymentData.amount);
    if (amount <= 0) {
      toast.error('Amount must be greater than zero');
      return;
    }

    setSubmitting(true);
    try {
      const receiptNumber = await generateReceiptNumber();

      // Create payment record
      const { error: paymentError } = await supabase.from('fee_payments').insert({
        receipt_number: receiptNumber,
        student_id: selectedStudent.id,
        invoice_id: paymentData.invoice_id || null,
        payment_date: paymentData.payment_date,
        amount: amount,
        payment_mode_id: paymentData.payment_mode_id,
        bank_account_id: paymentData.bank_account_id || null,
        reference_number: paymentData.reference_number || null,
        notes: paymentData.notes || null,
        status: 'Completed',
        received_by: user?.id,
      });

      if (paymentError) throw paymentError;

      // Get vote heads from invoice items
      const voteHeads: { name: string; amount: number }[] = [];
      
      if (paymentData.invoice_id) {
        const invoice = invoices.find(i => i.id === paymentData.invoice_id);
        if (invoice) {
          const allocatedToInvoice = Math.min(amount, invoice.balance_due);
          const newBalanceDue = Math.max(0, invoice.balance_due - amount);
          const newAmountPaid = Math.min(invoice.total_amount, (invoice.total_amount - invoice.balance_due) + allocatedToInvoice);
          const newStatus = newBalanceDue <= 0 ? 'Paid' : 'Partial';

          await supabase
            .from('fee_invoices')
            .update({
              amount_paid: newAmountPaid,
              balance_due: newBalanceDue,
              status: newStatus,
            })
            .eq('id', paymentData.invoice_id);

          // Fetch invoice items for vote head
          const { data: items } = await supabase
            .from('fee_invoice_items')
            .select('description, total, fee_accounts(name)')
            .eq('invoice_id', paymentData.invoice_id);
          
          (items || []).forEach((item: any) => {
            voteHeads.push({
              name: item.fee_accounts?.name || item.description,
              amount: Number(item.total),
            });
          });
        }
      } else {
        // Auto-allocate to oldest invoices first (FIFO)
        let remainingAmount = amount;
        for (const invoice of invoices) {
          if (remainingAmount <= 0) break;

          const paymentToInvoice = Math.min(remainingAmount, invoice.balance_due);
          const newBalance = invoice.balance_due - paymentToInvoice;
          const newStatus = newBalance <= 0 ? 'Paid' : 'Partial';

          await supabase
            .from('fee_invoices')
            .update({
              amount_paid: Math.min(invoice.total_amount, (invoice.total_amount - invoice.balance_due) + paymentToInvoice),
              balance_due: Math.max(0, newBalance),
              status: newStatus,
            })
            .eq('id', invoice.id);

          // Fetch invoice items for vote heads
          const { data: items } = await supabase
            .from('fee_invoice_items')
            .select('description, total, fee_accounts(name)')
            .eq('invoice_id', invoice.id);
          
          (items || []).forEach((item: any) => {
            const existingVH = voteHeads.find(vh => vh.name === (item.fee_accounts?.name || item.description));
            if (existingVH) {
              existingVH.amount += Number(item.total);
            } else {
              voteHeads.push({
                name: item.fee_accounts?.name || item.description,
                amount: Number(item.total),
              });
            }
          });

          remainingAmount -= paymentToInvoice;
        }
        // Any remainingAmount > 0 is an overpayment - it's already fully recorded in fee_payments
        // The student's balance will correctly show as negative (prepayment/credit)
      }

      // Get payment mode name
      const paymentMode = paymentModes.find(pm => pm.id === paymentData.payment_mode_id);

      // Prepare receipt data for printing
      setReceiptData({
        receipt_number: receiptNumber,
        payment_date: paymentData.payment_date,
        student_name: `${selectedStudent.other_name} ${selectedStudent.surname}`,
        student_no: selectedStudent.student_no,
        amount: amount,
        payment_mode: paymentMode?.name || '',
        reference_number: paymentData.reference_number || '',
        vote_heads: voteHeads.length > 0 ? voteHeads : [{ name: 'School Fees', amount: amount }],
        notes: paymentData.notes || '',
      });

      toast.success(`Payment of KES ${amount.toLocaleString()} received. Receipt: ${receiptNumber}`);
      setPaymentDialogOpen(false);
      setPrintDialogOpen(true);
      resetPaymentForm();
      fetchStudentsWithBalance();
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintReceipt = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${receiptData?.receipt_number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .header h1 { margin: 0; font-size: 18px; }
          .header p { margin: 5px 0; font-size: 12px; }
          .receipt-no { text-align: center; font-weight: bold; margin: 15px 0; font-size: 14px; }
          .info-row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 12px; }
          .vote-heads { margin: 15px 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; }
          .vote-head-row { display: flex; justify-content: space-between; margin: 5px 0; font-size: 12px; }
          .total-row { display: flex; justify-content: space-between; margin-top: 15px; font-weight: bold; font-size: 14px; border-top: 2px solid #000; padding-top: 10px; }
          .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #666; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const resetPaymentForm = () => {
    setPaymentData({
      amount: '',
      payment_mode_id: '',
      bank_account_id: '',
      reference_number: '',
      notes: '',
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      invoice_id: '',
    });
    setSelectedStudent(null);
    setInvoices([]);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
  };

  const filtered = students.filter(s =>
    s.student_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${s.other_name} ${s.surname}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalReceivables = students.reduce((sum, s) => sum + s.total_balance, 0);

  if (!isAdmin) {
    return <div className="p-6"><p className="text-muted-foreground">Access denied</p></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Receive Payments</h1>
          <p className="text-muted-foreground">Record fee payments from students</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Receivables</span>
            </div>
            <div className="text-2xl font-bold mt-2">{formatCurrency(totalReceivables)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Students with Balance</div>
            <div className="text-2xl font-bold mt-2">{students.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Average Balance</div>
            <div className="text-2xl font-bold mt-2">
              {students.length > 0 ? formatCurrency(totalReceivables / students.length) : formatCurrency(0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Student Fee Balances</CardTitle>
              <CardDescription>Select a student to receive payment (negative balance = overpayment/prepayment)</CardDescription>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by name or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Outstanding Balances</h3>
              <p className="text-muted-foreground">All students are fully paid</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Outstanding Balance</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-mono">{student.student_no}</TableCell>
                    <TableCell className="font-medium">{student.other_name} {student.surname}</TableCell>
                    <TableCell className={`text-right font-bold ${student.total_balance < 0 ? 'text-blue-600' : 'text-destructive'}`}>
                      {student.total_balance < 0 ? `(${formatCurrency(Math.abs(student.total_balance))})` : formatCurrency(student.total_balance)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {mpesaEnabled && (
                          <Button size="sm" variant="secondary" onClick={() => openMpesaDialog(student)}>
                            <Smartphone className="mr-2 h-4 w-4" />
                            Prompt Payment
                          </Button>
                        )}
                        <Button size="sm" onClick={() => openPaymentDialog(student)}>
                          <DollarSign className="mr-2 h-4 w-4" />
                          Receive
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Receive Payment</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{selectedStudent.other_name} {selectedStudent.surname}</p>
                <p className="text-sm text-muted-foreground">ID: {selectedStudent.student_no}</p>
                <p className={`text-lg font-bold mt-2 ${selectedStudent.total_balance < 0 ? 'text-blue-600' : 'text-destructive'}`}>
                  {selectedStudent.total_balance < 0 ? `Prepayment: (${formatCurrency(Math.abs(selectedStudent.total_balance))})` : `Outstanding: ${formatCurrency(selectedStudent.total_balance)}`}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment Date *</Label>
                  <Input
                    type="date"
                    value={paymentData.payment_date}
                    onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount (KES) *</Label>
                  <Input
                    type="number"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment Mode *</Label>
                <Select value={paymentData.payment_mode_id} onValueChange={(v) => setPaymentData({ ...paymentData, payment_mode_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select payment mode" /></SelectTrigger>
                  <SelectContent>
                    {paymentModes.map((pm) => <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Bank Account (if applicable)</Label>
                <Select value={paymentData.bank_account_id || "none"} onValueChange={(v) => setPaymentData({ ...paymentData, bank_account_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Select bank account" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Bank Account</SelectItem>
                    {bankAccounts.map((ba) => (
                      <SelectItem key={ba.id} value={ba.id}>{ba.bank_name} - {ba.account_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Reference/Transaction Number</Label>
                <Input
                  value={paymentData.reference_number}
                  onChange={(e) => setPaymentData({ ...paymentData, reference_number: e.target.value })}
                  placeholder="MPESA code, cheque number, etc."
                />
              </div>

              {invoices.length > 0 && (
                <div className="space-y-2">
                  <Label>Allocate to Invoice (optional)</Label>
                  <Select value={paymentData.invoice_id || "auto"} onValueChange={(v) => setPaymentData({ ...paymentData, invoice_id: v === "auto" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Auto-allocate (FIFO)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto-allocate (FIFO)</SelectItem>
                      {invoices.map((inv) => (
                        <SelectItem key={inv.id} value={inv.id}>
                          {inv.invoice_number} - {formatCurrency(inv.balance_due)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleReceivePayment} className="flex-1" disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Receipt className="mr-2 h-4 w-4" />}
                  Receive Payment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Print Receipt Dialog */}
      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Receipt</DialogTitle>
          </DialogHeader>
          
          {receiptData && (
            <>
              <div ref={printRef} className="p-4 border rounded-lg bg-white">
                <div className="header text-center border-b-2 border-foreground pb-3 mb-4">
                  <h1 className="text-xl font-bold">OFFICIAL RECEIPT</h1>
                  <p className="text-sm text-muted-foreground">School Management System</p>
                </div>
                
                <div className="text-center font-bold text-lg mb-4">
                  Receipt No: {receiptData.receipt_number}
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span>{format(new Date(receiptData.payment_date), 'dd MMMM yyyy')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Student:</span>
                    <span>{receiptData.student_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Student No:</span>
                    <span>{receiptData.student_no}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Mode:</span>
                    <span>{receiptData.payment_mode}</span>
                  </div>
                  {receiptData.reference_number && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reference:</span>
                      <span>{receiptData.reference_number}</span>
                    </div>
                  )}
                </div>

                <div className="my-4 py-3 border-y border-dashed">
                  <p className="font-semibold mb-2">Vote Heads Paid For:</p>
                  {receiptData.vote_heads.map((vh, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{vh.name}</span>
                      <span>{formatCurrency(vh.amount)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between font-bold text-lg border-t-2 border-foreground pt-3">
                  <span>TOTAL PAID:</span>
                  <span>{formatCurrency(receiptData.amount)}</span>
                </div>

                {receiptData.notes && (
                  <div className="mt-3 text-sm">
                    <span className="text-muted-foreground">Notes: </span>
                    {receiptData.notes}
                  </div>
                )}

                <div className="mt-6 text-center text-xs text-muted-foreground">
                  <p>Thank you for your payment!</p>
                  <p>This is a computer-generated receipt.</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handlePrintReceipt} className="flex-1">
                  <Printer className="mr-2 h-4 w-4" />
                  Print Receipt
                </Button>
                <Button variant="outline" onClick={() => setPrintDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* M-Pesa Payment Dialog */}
      <Dialog open={mpesaDialogOpen} onOpenChange={setMpesaDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              M-Pesa Payment
            </DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{selectedStudent.other_name} {selectedStudent.surname}</p>
                <p className="text-sm text-muted-foreground">ID: {selectedStudent.student_no}</p>
                <p className="text-lg font-bold text-destructive mt-2">
                  Outstanding: {formatCurrency(selectedStudent.total_balance)}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Phone Number *</Label>
                <Input
                  type="tel"
                  value={mpesaPhone}
                  onChange={(e) => setMpesaPhone(e.target.value)}
                  placeholder="e.g., 0712345678 or 254712345678"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the phone number registered with M-Pesa
                </p>
              </div>

              <div className="space-y-2">
                <Label>Amount (KES) *</Label>
                <Input
                  type="number"
                  value={mpesaAmount}
                  onChange={(e) => setMpesaAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <p className="font-medium mb-1">How it works:</p>
                <ol className="list-decimal list-inside text-muted-foreground space-y-1">
                  <li>Click "Send STK Push" below</li>
                  <li>An M-Pesa prompt will appear on the phone</li>
                  <li>Enter M-Pesa PIN to complete payment</li>
                  <li>Payment will be automatically recorded</li>
                </ol>
              </div>

              <Button
                onClick={handleMpesaPayment}
                className="w-full"
                disabled={mpesaSubmitting}
              >
                {mpesaSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Smartphone className="mr-2 h-4 w-4" />
                )}
                Send STK Push
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
