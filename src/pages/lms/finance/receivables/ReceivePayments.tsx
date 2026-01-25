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
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Search, DollarSign, Loader2, CreditCard, Receipt, Printer } from 'lucide-react';
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

  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_mode_id: '',
    bank_account_id: '',
    reference_number: '',
    notes: '',
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    invoice_id: '', // Optional - allocate to specific invoice
  });

  useEffect(() => {
    fetchData();
  }, []);

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
    // Fetch students with their outstanding balances
    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select('id, student_no, other_name, surname')
      .order('surname');

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      return;
    }

    // Get balances from invoices
    const { data: invoicesData, error: invoicesError } = await supabase
      .from('fee_invoices')
      .select('student_id, balance_due')
      .gt('balance_due', 0);

    if (!invoicesError && studentsData) {
      const balanceMap = new Map<string, number>();
      (invoicesData || []).forEach((inv: any) => {
        const current = balanceMap.get(inv.student_id) || 0;
        balanceMap.set(inv.student_id, current + Number(inv.balance_due));
      });

      const studentsWithBalance: Student[] = studentsData.map((s: any) => ({
        id: s.id,
        student_no: s.student_no || '',
        other_name: s.other_name,
        surname: s.surname,
        total_balance: balanceMap.get(s.id) || 0,
      }));

      setStudents(studentsWithBalance.filter(s => s.total_balance > 0));
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

      // If specific invoice selected, update it
      if (paymentData.invoice_id) {
        const invoice = invoices.find(i => i.id === paymentData.invoice_id);
        if (invoice) {
          const newBalance = invoice.balance_due - amount;
          const newStatus = newBalance <= 0 ? 'Paid' : 'Partial';

          await supabase
            .from('fee_invoices')
            .update({
              amount_paid: invoice.total_amount - newBalance,
              balance_due: Math.max(0, newBalance),
              status: newStatus,
            })
            .eq('id', paymentData.invoice_id);
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
              amount_paid: invoice.total_amount - newBalance,
              balance_due: Math.max(0, newBalance),
              status: newStatus,
            })
            .eq('id', invoice.id);

          remainingAmount -= paymentToInvoice;
        }
      }

      toast.success(`Payment of KES ${amount.toLocaleString()} received. Receipt: ${receiptNumber}`);
      setPaymentDialogOpen(false);
      resetPaymentForm();
      fetchStudentsWithBalance();
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
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
              <CardTitle>Students with Outstanding Balance</CardTitle>
              <CardDescription>Select a student to receive payment</CardDescription>
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
                    <TableCell className="text-right font-bold text-red-600">
                      {formatCurrency(student.total_balance)}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => openPaymentDialog(student)}>
                        <DollarSign className="mr-2 h-4 w-4" />
                        Receive Payment
                      </Button>
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
                <p className="text-lg font-bold text-red-600 mt-2">
                  Outstanding: {formatCurrency(selectedStudent.total_balance)}
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
                <Select value={paymentData.bank_account_id} onValueChange={(v) => setPaymentData({ ...paymentData, bank_account_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select bank account" /></SelectTrigger>
                  <SelectContent>
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
                  <Select value={paymentData.invoice_id} onValueChange={(v) => setPaymentData({ ...paymentData, invoice_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Auto-allocate (FIFO)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Auto-allocate (FIFO)</SelectItem>
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
    </div>
  );
}
