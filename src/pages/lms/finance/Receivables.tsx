import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Search, DollarSign, Loader2, Receipt, Printer, Smartphone, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ProtectedPage, ActionButton, useModulePermissions } from '@/components/auth/ProtectedPage';

const MODULE_CODE = 'finance.receivables';

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
  asset_account_id: string | null;
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

interface PaymentHistoryItem {
  id: string;
  receipt_number: string;
  payment_date: string;
  amount: number;
  reference_number: string | null;
  notes: string | null;
  status: string;
  student_id: string;
  student_name: string;
  student_no: string;
  payment_mode_name: string;
}

export default function Receivables() {
  const { user } = useAuth();
  const { canAdd } = useModulePermissions(MODULE_CODE);
  const [students, setStudents] = useState<Student[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<PaymentReceipt | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // M-Pesa
  const [mpesaDialogOpen, setMpesaDialogOpen] = useState(false);
  const [mpesaEnabled, setMpesaEnabled] = useState(false);
  const [mpesaStudent, setMpesaStudent] = useState<Student | null>(null);
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [mpesaAmount, setMpesaAmount] = useState('');
  const [mpesaSubmitting, setMpesaSubmitting] = useState(false);

  // Receipts history
  const [receipts, setReceipts] = useState<PaymentHistoryItem[]>([]);
  const [receiptsLoading, setReceiptsLoading] = useState(true);
  const [receiptSearch, setReceiptSearch] = useState('');
  const [viewingReceipt, setViewingReceipt] = useState<PaymentReceipt | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const printViewRef = useRef<HTMLDivElement>(null);

  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_mode_id: '',
    reference_number: '',
    notes: '',
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    invoice_id: '',
  });

  useEffect(() => {
    fetchData();
    fetchReceipts();
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
      await Promise.all([fetchStudentsWithBalance(), fetchPaymentModes()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchReceipts = async () => {
    setReceiptsLoading(true);
    try {
      const { data } = await supabase
        .from('fee_payments')
        .select(`
          id, receipt_number, payment_date, amount, reference_number, notes, status,
          student_id,
          students:student_id ( other_name, surname, student_no ),
          payment_modes:payment_mode_id ( name )
        `)
        .order('payment_date', { ascending: false })
        .limit(500);

      if (data) {
        setReceipts(data.map((p: any) => ({
          id: p.id,
          receipt_number: p.receipt_number || '—',
          payment_date: p.payment_date,
          amount: Number(p.amount),
          reference_number: p.reference_number,
          notes: p.notes,
          status: p.status,
          student_id: p.student_id,
          student_name: p.students ? `${p.students.other_name} ${p.students.surname}` : '—',
          student_no: p.students?.student_no || '—',
          payment_mode_name: p.payment_modes?.name || '—',
        })));
      }
    } finally {
      setReceiptsLoading(false);
    }
  };

  const fetchStudentsWithBalance = async () => {
    const { data: studentsData } = await supabase
      .from('students')
      .select('id, student_no, other_name, surname')
      .order('surname');

    const { data: invoicesData } = await supabase
      .from('fee_invoices')
      .select('student_id, total_amount');

    const { data: paymentsData } = await supabase
      .from('fee_payments')
      .select('student_id, amount')
      .eq('status', 'Completed');

    if (studentsData) {
      const invoiceMap = new Map<string, number>();
      (invoicesData || []).forEach((inv: any) => {
        invoiceMap.set(inv.student_id, (invoiceMap.get(inv.student_id) || 0) + (Number(inv.total_amount) || 0));
      });

      const paymentMap = new Map<string, number>();
      (paymentsData || []).forEach((pay: any) => {
        paymentMap.set(pay.student_id, (paymentMap.get(pay.student_id) || 0) + (Number(pay.amount) || 0));
      });

      const studentsWithBalance: Student[] = studentsData
        .filter((s: any) => invoiceMap.has(s.id))
        .map((s: any) => ({
          id: s.id,
          student_no: s.student_no || '',
          other_name: s.other_name,
          surname: s.surname,
          total_balance: (invoiceMap.get(s.id) || 0) - (paymentMap.get(s.id) || 0),
        }));

      setStudents(studentsWithBalance);
    }
  };

  const fetchStudentInvoices = async (studentId: string) => {
    const { data } = await supabase
      .from('fee_invoices')
      .select('id, invoice_number, invoice_date, total_amount, balance_due')
      .eq('student_id', studentId)
      .gt('balance_due', 0)
      .order('invoice_date');
    setInvoices((data || []).map((inv: any) => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      invoice_date: inv.invoice_date,
      total_amount: Number(inv.total_amount),
      balance_due: Number(inv.balance_due),
    })));
  };

  const fetchPaymentModes = async () => {
    const { data } = await supabase
      .from('payment_modes')
      .select('id, name, asset_account_id')
      .eq('is_active', true)
      .order('name');
    setPaymentModes((data as any) || []);
  };

  // Open "Receive Payment" — user picks a student from the table row, or no student pre-selected from header button
  const openPaymentDialog = async (student?: Student) => {
    const s = student || null;
    setSelectedStudent(s);
    setPaymentData({
      amount: s && s.total_balance > 0 ? s.total_balance.toString() : '',
      payment_mode_id: '',
      reference_number: '',
      notes: '',
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      invoice_id: '',
    });
    if (s) await fetchStudentInvoices(s.id);
    else setInvoices([]);
    setPaymentDialogOpen(true);
  };

  const handleStudentSelectInDialog = async (studentId: string) => {
    const student = students.find(s => s.id === studentId) || null;
    setSelectedStudent(student);
    if (student) {
      setPaymentData(prev => ({
        ...prev,
        amount: student.total_balance > 0 ? student.total_balance.toString() : '',
        invoice_id: '',
      }));
      await fetchStudentInvoices(student.id);
    } else {
      setInvoices([]);
    }
  };

  const openMpesaDialog = () => {
    setMpesaStudent(null);
    setMpesaAmount('');
    setMpesaPhone('');
    setMpesaDialogOpen(true);
  };

  const handleMpesaStudentSelect = async (studentId: string) => {
    const student = students.find(s => s.id === studentId) || null;
    setMpesaStudent(student);
    if (student) {
      setMpesaAmount(student.total_balance > 0 ? student.total_balance.toString() : '');
      await fetchStudentInvoices(student.id);
    }
  };

  const handleMpesaPayment = async () => {
    if (!mpesaStudent || !mpesaPhone || !mpesaAmount) {
      toast.error('Please select a student, enter phone number and amount');
      return;
    }
    const amount = parseFloat(mpesaAmount);
    if (amount < 1) { toast.error('Minimum amount is KES 1'); return; }
    setMpesaSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('mpesa-stk-push', {
        body: {
          phone_number: mpesaPhone,
          amount,
          student_id: mpesaStudent.id,
          invoice_id: invoices.length > 0 ? invoices[0].id : null,
          account_reference: mpesaStudent.student_no || 'SchoolFees',
          transaction_desc: `Fee payment for ${mpesaStudent.other_name} ${mpesaStudent.surname}`,
        },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success('STK Push sent! Please check the phone and enter M-Pesa PIN.');
        setMpesaDialogOpen(false);
      } else {
        toast.error(data?.error || 'Failed to initiate M-Pesa payment');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to initiate M-Pesa payment');
    } finally {
      setMpesaSubmitting(false);
    }
  };

  const handleReceivePayment = async () => {
    if (!selectedStudent) {
      toast.error('Please select a student');
      return;
    }
    if (!paymentData.amount) {
      toast.error('Please enter an amount');
      return;
    }
    if (!paymentData.payment_mode_id) {
      toast.error('Please select a payment mode');
      return;
    }
    const amount = parseFloat(paymentData.amount);
    if (amount <= 0) { toast.error('Amount must be greater than zero'); return; }

    setSubmitting(true);
    try {
      const { data: receiptNumber } = await supabase.rpc('generate_receipt_number');

      const { error: paymentError } = await supabase.from('fee_payments').insert({
        receipt_number: receiptNumber,
        student_id: selectedStudent.id,
        invoice_id: paymentData.invoice_id || null,
        payment_date: paymentData.payment_date,
        amount,
        payment_mode_id: paymentData.payment_mode_id,
        reference_number: paymentData.reference_number || null,
        notes: paymentData.notes || null,
        status: 'Completed',
        received_by: user?.id,
      });
      if (paymentError) throw paymentError;

      const voteHeads: { name: string; amount: number }[] = [];

      if (paymentData.invoice_id) {
        const invoice = invoices.find(i => i.id === paymentData.invoice_id);
        if (invoice) {
          const allocated = Math.min(amount, invoice.balance_due);
          const newBalance = Math.max(0, invoice.balance_due - amount);
          await supabase.from('fee_invoices').update({
            amount_paid: Math.min(invoice.total_amount, (invoice.total_amount - invoice.balance_due) + allocated),
            balance_due: newBalance,
            status: newBalance <= 0 ? 'Paid' : 'Partial',
          }).eq('id', paymentData.invoice_id);

          const { data: items } = await supabase
            .from('fee_invoice_items')
            .select('description, total, fee_accounts(name)')
            .eq('invoice_id', paymentData.invoice_id);
          (items || []).forEach((item: any) => {
            voteHeads.push({ name: item.fee_accounts?.name || item.description, amount: Number(item.total) });
          });
        }
      } else {
        let remaining = amount;
        for (const inv of invoices) {
          if (remaining <= 0) break;
          const toApply = Math.min(remaining, inv.balance_due);
          const newBalance = inv.balance_due - toApply;
          await supabase.from('fee_invoices').update({
            amount_paid: Math.min(inv.total_amount, (inv.total_amount - inv.balance_due) + toApply),
            balance_due: Math.max(0, newBalance),
            status: newBalance <= 0 ? 'Paid' : 'Partial',
          }).eq('id', inv.id);

          const { data: items } = await supabase
            .from('fee_invoice_items')
            .select('description, total, fee_accounts(name)')
            .eq('invoice_id', inv.id);
          (items || []).forEach((item: any) => {
            const name = item.fee_accounts?.name || item.description;
            const existing = voteHeads.find(v => v.name === name);
            if (existing) existing.amount += Number(item.total);
            else voteHeads.push({ name, amount: Number(item.total) });
          });
          remaining -= toApply;
        }
      }

      // Post to general ledger via payment mode asset account
      const selectedMode = paymentModes.find(pm => pm.id === paymentData.payment_mode_id);
      if (selectedMode?.asset_account_id) {
        const { data: jeNum } = await supabase.rpc('generate_journal_number');
        const { data: jeData } = await supabase.from('journal_entries').insert({
          entry_number: jeNum || `JE-RCP-${Date.now()}`,
          transaction_date: paymentData.payment_date,
          reference: receiptNumber,
          narration: `Fee receipt from ${selectedStudent.other_name} ${selectedStudent.surname}`,
          entry_type: 'fee_receipt',
          status: 'Posted',
          total_debit: amount,
          total_credit: amount,
          prepared_by: user?.id,
        }).select('id').single();

        if (jeData) {
          await supabase.from('general_ledger').insert({
            journal_entry_id: jeData.id,
            account_id: selectedMode.asset_account_id,
            transaction_date: paymentData.payment_date,
            debit: amount,
            credit: 0,
            balance: amount,
            description: `Fee receipt from ${selectedStudent.other_name} ${selectedStudent.surname} via ${selectedMode.name}`,
          });
        }
      }

      const paymentMode = paymentModes.find(pm => pm.id === paymentData.payment_mode_id);
      setReceiptData({
        receipt_number: receiptNumber || 'N/A',
        payment_date: paymentData.payment_date,
        student_name: `${selectedStudent.other_name} ${selectedStudent.surname}`,
        student_no: selectedStudent.student_no,
        amount,
        payment_mode: paymentMode?.name || '',
        reference_number: paymentData.reference_number || '',
        vote_heads: voteHeads.length > 0 ? voteHeads : [{ name: 'School Fees', amount }],
        notes: paymentData.notes || '',
      });

      toast.success(`Payment of KES ${amount.toLocaleString()} received. Receipt: ${receiptNumber}`);
      setPaymentDialogOpen(false);
      setPrintDialogOpen(true);
      setSelectedStudent(null);
      setInvoices([]);
      setPaymentData({ amount: '', payment_mode_id: '', reference_number: '', notes: '', payment_date: format(new Date(), 'yyyy-MM-dd'), invoice_id: '' });
      fetchStudentsWithBalance();
      fetchReceipts();
    } catch (error: any) {
      toast.error(error.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintReceipt = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Receipt - ${receiptData?.receipt_number}</title>
      <style>body{font-family:Arial,sans-serif;padding:20px;max-width:400px;margin:0 auto}
      .header{text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:16px}
      .info-row{display:flex;justify-content:space-between;margin:6px 0;font-size:12px}
      .vote-heads{margin:12px 0;border-top:1px dashed #000;border-bottom:1px dashed #000;padding:8px 0}
      .total-row{display:flex;justify-content:space-between;font-weight:bold;font-size:14px;border-top:2px solid #000;padding-top:8px;margin-top:8px}
      .footer{text-align:center;margin-top:16px;font-size:10px;color:#666}</style></head>
      <body>${printContent.innerHTML}</body></html>`);
    win.document.close();
    win.print();
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);

  const handleViewHistoricalReceipt = async (payment: PaymentHistoryItem) => {
    const { data: paymentRow } = await supabase
      .from('fee_payments')
      .select('invoice_id')
      .eq('id', payment.id)
      .single();

    const voteHeads: { name: string; amount: number }[] = [];
    if (paymentRow?.invoice_id) {
      const { data: items } = await supabase
        .from('fee_invoice_items')
        .select('description, total, fee_accounts(name)')
        .eq('invoice_id', paymentRow.invoice_id);
      (items || []).forEach((item: any) => {
        voteHeads.push({ name: item.fee_accounts?.name || item.description, amount: Number(item.total) });
      });
    }

    setViewingReceipt({
      receipt_number: payment.receipt_number,
      payment_date: payment.payment_date,
      student_name: payment.student_name,
      student_no: payment.student_no,
      amount: payment.amount,
      payment_mode: payment.payment_mode_name,
      reference_number: payment.reference_number || '',
      vote_heads: voteHeads.length > 0 ? voteHeads : [{ name: 'School Fees', amount: payment.amount }],
      notes: payment.notes || '',
    });
    setViewDialogOpen(true);
  };

  const handlePrintHistoricalReceipt = () => {
    const printContent = printViewRef.current;
    if (!printContent) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Receipt - ${viewingReceipt?.receipt_number}</title>
      <style>body{font-family:Arial,sans-serif;padding:20px;max-width:400px;margin:0 auto}
      .header{text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:16px}
      .info-row{display:flex;justify-content:space-between;margin:6px 0;font-size:12px}
      .vote-heads{margin:12px 0;border-top:1px dashed #000;border-bottom:1px dashed #000;padding:8px 0}
      .total-row{display:flex;justify-content:space-between;font-weight:bold;font-size:14px;border-top:2px solid #000;padding-top:8px;margin-top:8px}
      .footer{text-align:center;margin-top:16px;font-size:10px;color:#666}</style></head>
      <body>${printContent.innerHTML}</body></html>`);
    win.document.close();
    win.print();
  };

  const filteredReceipts = receipts.filter(r =>
    r.student_name.toLowerCase().includes(receiptSearch.toLowerCase()) ||
    r.student_no.toLowerCase().includes(receiptSearch.toLowerCase()) ||
    r.receipt_number.toLowerCase().includes(receiptSearch.toLowerCase())
  );

  const filtered = students.filter(s =>
    s.student_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${s.other_name} ${s.surname}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalReceivables = students.reduce((sum, s) => sum + Math.max(0, s.total_balance), 0);

  return (
    <ProtectedPage moduleCode={MODULE_CODE} title="Receivables">
      <div className="p-6 space-y-6">
        {/* Header with global action buttons */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Receivables</h1>
            <p className="text-muted-foreground">Record and manage fee payments from students</p>
          </div>
          <div className="flex gap-2">
            {mpesaEnabled && (
              <Button variant="secondary" onClick={openMpesaDialog}>
                <Smartphone className="mr-2 h-4 w-4" />
                Prompt Payment
              </Button>
            )}
            <ActionButton moduleCode={MODULE_CODE} action="add">
              <Button onClick={() => openPaymentDialog()}>
                <DollarSign className="mr-2 h-4 w-4" />
                Receive Payment
              </Button>
            </ActionButton>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <DollarSign className="h-4 w-4" />
                Total Receivables
              </div>
              <div className="text-2xl font-bold mt-1">{formatCurrency(totalReceivables)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Students with Balance</div>
              <div className="text-2xl font-bold mt-1">{students.filter(s => s.total_balance > 0).length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Payment Modes Available</div>
              <div className="text-2xl font-bold mt-1">{paymentModes.length}</div>
              {paymentModes.length === 0 && (
                <p className="text-xs text-destructive mt-1">Set up payment modes under Finance → Utilities → Payment Modes</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Student list */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Student Fee Balances</CardTitle>
                <CardDescription>Students with outstanding fee balances</CardDescription>
              </div>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or ID..."
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
              <div className="text-center py-12 text-muted-foreground">No students with outstanding balances</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student No</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Outstanding Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-mono">{student.student_no}</TableCell>
                      <TableCell className="font-medium">{student.other_name} {student.surname}</TableCell>
                      <TableCell className={`text-right font-bold ${student.total_balance < 0 ? 'text-blue-600' : 'text-destructive'}`}>
                        {student.total_balance < 0
                          ? `(${formatCurrency(Math.abs(student.total_balance))}) Prepaid`
                          : formatCurrency(student.total_balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* ── Payment History / Receipts Listing ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Payment Receipts History
                </CardTitle>
                <CardDescription>All student payments — view or print individual receipts</CardDescription>
              </div>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by student, ID or receipt..."
                  value={receiptSearch}
                  onChange={(e) => setReceiptSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {receiptsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : filteredReceipts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No payment records found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Student No</TableHead>
                    <TableHead>Payment Mode</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceipts.map((receipt) => (
                    <TableRow key={receipt.id}>
                      <TableCell className="font-mono text-sm font-medium">{receipt.receipt_number}</TableCell>
                      <TableCell className="text-sm">{receipt.payment_date ? format(new Date(receipt.payment_date), 'dd/MM/yyyy') : '—'}</TableCell>
                      <TableCell className="font-medium">{receipt.student_name}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{receipt.student_no}</TableCell>
                      <TableCell>{receipt.payment_mode_name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{receipt.reference_number || '—'}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(receipt.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={receipt.status === 'Completed' ? 'default' : 'secondary'}>
                          {receipt.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleViewHistoricalReceipt(receipt)}>
                            <Eye className="h-4 w-4 mr-1" />View
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

        {/* ── Receive Payment Dialog ── */}
        <Dialog open={paymentDialogOpen} onOpenChange={(open) => { if (!open) { setPaymentDialogOpen(false); setSelectedStudent(null); setInvoices([]); } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Receive Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Student selector */}
              <div className="space-y-2">
                <Label>Student <span className="text-destructive">*</span></Label>
                <Select
                  value={selectedStudent?.id || ''}
                  onValueChange={handleStudentSelectInDialog}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a student..." />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.student_no} — {s.other_name} {s.surname} ({formatCurrency(Math.max(0, s.total_balance))})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedStudent && (
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <span className="font-medium">{selectedStudent.other_name} {selectedStudent.surname}</span>
                  <span className={`ml-3 font-bold ${selectedStudent.total_balance < 0 ? 'text-blue-600' : 'text-destructive'}`}>
                    {selectedStudent.total_balance < 0
                      ? `Prepaid: (${formatCurrency(Math.abs(selectedStudent.total_balance))})`
                      : `Outstanding: ${formatCurrency(selectedStudent.total_balance)}`}
                  </span>
                </div>
              )}

              {/* Payment Mode — REQUIRED */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Payment Mode <span className="text-destructive">*</span>
                </Label>
                {paymentModes.length === 0 ? (
                  <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    No payment modes configured. Go to Finance → Utilities → Payment Modes.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {paymentModes.map((pm) => (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setPaymentData(prev => ({ ...prev, payment_mode_id: pm.id }))}
                        className={`px-3 py-2.5 rounded-md border text-sm font-medium transition-colors text-left ${
                          paymentData.payment_mode_id === pm.id
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background border-input hover:bg-accent hover:text-accent-foreground'
                        }`}
                      >
                        {pm.name}
                        {!pm.asset_account_id && <span className="ml-1 text-destructive">⚠</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment Date *</Label>
                  <Input
                    type="date"
                    value={paymentData.payment_date}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, payment_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount (KES) *</Label>
                  <Input
                    type="number"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Reference / Transaction No.</Label>
                <Input
                  value={paymentData.reference_number}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, reference_number: e.target.value }))}
                  placeholder="M-Pesa code, cheque no., etc."
                />
              </div>

              {invoices.length > 0 && (
                <div className="space-y-2">
                  <Label>Allocate to Invoice (optional)</Label>
                  <Select
                    value={paymentData.invoice_id || 'auto'}
                    onValueChange={(v) => setPaymentData(prev => ({ ...prev, invoice_id: v === 'auto' ? '' : v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Auto-allocate (FIFO)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto-allocate (oldest first)</SelectItem>
                      {invoices.map((inv) => (
                        <SelectItem key={inv.id} value={inv.id}>
                          {inv.invoice_number} — Balance: {formatCurrency(inv.balance_due)}
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
                  onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>

              <Button
                onClick={handleReceivePayment}
                className="w-full"
                disabled={submitting || !paymentData.payment_mode_id || !selectedStudent}
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Receipt className="mr-2 h-4 w-4" />}
                {!selectedStudent ? 'Select a Student to Continue' : !paymentData.payment_mode_id ? 'Select a Payment Mode to Continue' : 'Receive Payment'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Print Receipt Dialog ── */}
        <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Payment Receipt</DialogTitle></DialogHeader>
            {receiptData && (
              <>
                <div ref={printRef} className="p-4 border rounded-lg bg-background">
                  <div className="text-center border-b-2 border-foreground pb-3 mb-4">
                    <h1 className="text-xl font-bold">OFFICIAL RECEIPT</h1>
                  </div>
                  <div className="text-center font-bold text-lg mb-4">Receipt No: {receiptData.receipt_number}</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Date:</span><span>{format(new Date(receiptData.payment_date), 'dd MMMM yyyy')}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Student:</span><span>{receiptData.student_name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Student No:</span><span>{receiptData.student_no}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Payment Mode:</span><span className="font-medium">{receiptData.payment_mode}</span></div>
                    {receiptData.reference_number && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Reference:</span><span>{receiptData.reference_number}</span></div>
                    )}
                  </div>
                  <div className="my-4 py-3 border-y border-dashed">
                    <p className="font-semibold mb-2">Vote Heads:</p>
                    {receiptData.vote_heads.map((vh, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{vh.name}</span><span>{formatCurrency(vh.amount)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t-2 border-foreground pt-3">
                    <span>TOTAL PAID:</span>
                    <span>{formatCurrency(receiptData.amount)}</span>
                  </div>
                  {receiptData.notes && <div className="mt-3 text-sm text-muted-foreground">Notes: {receiptData.notes}</div>}
                  <div className="mt-6 text-center text-xs text-muted-foreground">
                    <p>Thank you for your payment!</p>
                    <p>This is a computer-generated receipt.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handlePrintReceipt} className="flex-1">
                    <Printer className="mr-2 h-4 w-4" />Print Receipt
                  </Button>
                  <Button variant="outline" onClick={() => setPrintDialogOpen(false)}>Close</Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* ── M-Pesa Prompt Dialog ── */}
        <Dialog open={mpesaDialogOpen} onOpenChange={setMpesaDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />Prompt Payment (M-Pesa)
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Student <span className="text-destructive">*</span></Label>
                <Select
                  value={mpesaStudent?.id || ''}
                  onValueChange={handleMpesaStudentSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a student..." />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.student_no} — {s.other_name} {s.surname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {mpesaStudent && (
                <div className="p-3 bg-muted rounded-lg text-sm">
                  Outstanding: <span className="font-bold text-destructive">{formatCurrency(Math.max(0, mpesaStudent.total_balance))}</span>
                </div>
              )}
              <div className="space-y-2">
                <Label>Phone Number <span className="text-destructive">*</span></Label>
                <Input type="tel" value={mpesaPhone} onChange={(e) => setMpesaPhone(e.target.value)} placeholder="e.g., 0712345678" />
              </div>
              <div className="space-y-2">
                <Label>Amount (KES) <span className="text-destructive">*</span></Label>
                <Input type="number" value={mpesaAmount} onChange={(e) => setMpesaAmount(e.target.value)} placeholder="0.00" />
              </div>
              <Button onClick={handleMpesaPayment} className="w-full" disabled={mpesaSubmitting || !mpesaStudent}>
                {mpesaSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Smartphone className="mr-2 h-4 w-4" />}
                Send STK Push
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── View Historical Receipt Dialog ── */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Payment Receipt</DialogTitle></DialogHeader>
            {viewingReceipt && (
              <>
                <div ref={printViewRef} className="p-4 border rounded-lg bg-background">
                  <div className="text-center border-b-2 border-foreground pb-3 mb-4">
                    <h1 className="text-xl font-bold">OFFICIAL RECEIPT</h1>
                  </div>
                  <div className="text-center font-bold text-lg mb-4">Receipt No: {viewingReceipt.receipt_number}</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Date:</span><span>{format(new Date(viewingReceipt.payment_date), 'dd MMMM yyyy')}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Student:</span><span>{viewingReceipt.student_name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Student No:</span><span>{viewingReceipt.student_no}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Payment Mode:</span><span className="font-medium">{viewingReceipt.payment_mode}</span></div>
                    {viewingReceipt.reference_number && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Reference:</span><span>{viewingReceipt.reference_number}</span></div>
                    )}
                  </div>
                  <div className="my-4 py-3 border-y border-dashed">
                    <p className="font-semibold mb-2">Vote Heads:</p>
                    {viewingReceipt.vote_heads.map((vh, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{vh.name}</span><span>{formatCurrency(vh.amount)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t-2 border-foreground pt-3">
                    <span>TOTAL PAID:</span>
                    <span>{formatCurrency(viewingReceipt.amount)}</span>
                  </div>
                  {viewingReceipt.notes && <div className="mt-3 text-sm text-muted-foreground">Notes: {viewingReceipt.notes}</div>}
                  <div className="mt-6 text-center text-xs text-muted-foreground">
                    <p>Thank you for your payment!</p>
                    <p>This is a computer-generated receipt.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handlePrintHistoricalReceipt} className="flex-1">
                    <Printer className="mr-2 h-4 w-4" />Print Receipt
                  </Button>
                  <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedPage>
  );
}
