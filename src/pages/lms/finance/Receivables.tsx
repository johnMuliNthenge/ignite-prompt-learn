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
import { Search, DollarSign, Loader2, Receipt, Printer, Smartphone } from 'lucide-react';
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
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [mpesaAmount, setMpesaAmount] = useState('');
  const [mpesaSubmitting, setMpesaSubmitting] = useState(false);

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

  const openPaymentDialog = async (student: Student) => {
    setSelectedStudent(student);
    setPaymentData(prev => ({ ...prev, amount: student.total_balance > 0 ? student.total_balance.toString() : '', payment_mode_id: '' }));
    await fetchStudentInvoices(student.id);
    setPaymentDialogOpen(true);
  };

  const openMpesaDialog = async (student: Student) => {
    setSelectedStudent(student);
    setMpesaAmount(student.total_balance > 0 ? student.total_balance.toString() : '');
    setMpesaPhone('');
    setMpesaDialogOpen(true);
  };

  const handleMpesaPayment = async () => {
    if (!selectedStudent || !mpesaPhone || !mpesaAmount) {
      toast.error('Please enter phone number and amount');
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
    if (!selectedStudent || !paymentData.amount) {
      toast.error('Please fill in all required fields');
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
      setPaymentData({ amount: '', payment_mode_id: '', reference_number: '', notes: '', payment_date: format(new Date(), 'yyyy-MM-dd'), invoice_id: '' });
      setSelectedStudent(null);
      fetchStudentsWithBalance();
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

  const filtered = students.filter(s =>
    s.student_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${s.other_name} ${s.surname}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalReceivables = students.reduce((sum, s) => sum + Math.max(0, s.total_balance), 0);

  return (
    <ProtectedPage moduleCode={MODULE_CODE} title="Receivables">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Receivables — Receive Payments</h1>
          <p className="text-muted-foreground">Record fee payments from students</p>
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

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Student Fee Balances</CardTitle>
                <CardDescription>Click "Receive" to collect payment from a student</CardDescription>
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
                    <TableHead>Action</TableHead>
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
                      <TableCell>
                        <div className="flex gap-2">
                          {mpesaEnabled && (
                            <Button size="sm" variant="secondary" onClick={() => openMpesaDialog(student)}>
                              <Smartphone className="mr-1 h-4 w-4" />
                              M-Pesa
                            </Button>
                          )}
                          <ActionButton moduleCode={MODULE_CODE} action="add">
                            <Button size="sm" onClick={() => openPaymentDialog(student)}>
                              <DollarSign className="mr-1 h-4 w-4" />
                              Receive
                            </Button>
                          </ActionButton>
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
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Receive Payment</DialogTitle>
            </DialogHeader>
            {selectedStudent && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-semibold">{selectedStudent.other_name} {selectedStudent.surname}</p>
                  <p className="text-sm text-muted-foreground">ID: {selectedStudent.student_no}</p>
                  <p className={`text-lg font-bold mt-1 ${selectedStudent.total_balance < 0 ? 'text-blue-600' : 'text-destructive'}`}>
                    {selectedStudent.total_balance < 0
                      ? `Prepayment: (${formatCurrency(Math.abs(selectedStudent.total_balance))})`
                      : `Outstanding: ${formatCurrency(selectedStudent.total_balance)}`}
                  </p>
                </div>

                {/* Payment Mode — REQUIRED, shown prominently */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">
                    Payment Mode <span className="text-destructive">*</span>
                  </Label>
                  {paymentModes.length === 0 ? (
                    <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                      No payment modes configured. Please set up payment modes under Finance → Utilities → Payment Modes.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {paymentModes.map((pm) => (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => setPaymentData({ ...paymentData, payment_mode_id: pm.id })}
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
                  <Label>Reference / Transaction No.</Label>
                  <Input
                    value={paymentData.reference_number}
                    onChange={(e) => setPaymentData({ ...paymentData, reference_number: e.target.value })}
                    placeholder="M-Pesa code, cheque no., etc."
                  />
                </div>

                {invoices.length > 0 && (
                  <div className="space-y-2">
                    <Label>Allocate to Invoice (optional)</Label>
                    <Select
                      value={paymentData.invoice_id || 'auto'}
                      onValueChange={(v) => setPaymentData({ ...paymentData, invoice_id: v === 'auto' ? '' : v })}
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
                    onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                    placeholder="Additional notes..."
                    rows={2}
                  />
                </div>

                <Button onClick={handleReceivePayment} className="w-full" disabled={submitting || !paymentData.payment_mode_id}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Receipt className="mr-2 h-4 w-4" />}
                  {paymentData.payment_mode_id ? 'Receive Payment' : 'Select a Payment Mode to Continue'}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ── Print Receipt Dialog ── */}
        <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Payment Receipt</DialogTitle></DialogHeader>
            {receiptData && (
              <>
                <div ref={printRef} className="p-4 border rounded-lg bg-background">
                  <div className="header text-center border-b-2 border-foreground pb-3 mb-4">
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

        {/* ── M-Pesa Dialog ── */}
        <Dialog open={mpesaDialogOpen} onOpenChange={setMpesaDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />M-Pesa Payment
              </DialogTitle>
            </DialogHeader>
            {selectedStudent && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-medium">{selectedStudent.other_name} {selectedStudent.surname}</p>
                  <p className="text-sm text-muted-foreground">ID: {selectedStudent.student_no}</p>
                  <p className="text-lg font-bold text-destructive mt-1">Outstanding: {formatCurrency(Math.max(0, selectedStudent.total_balance))}</p>
                </div>
                <div className="space-y-2">
                  <Label>Phone Number *</Label>
                  <Input type="tel" value={mpesaPhone} onChange={(e) => setMpesaPhone(e.target.value)} placeholder="e.g., 0712345678" />
                </div>
                <div className="space-y-2">
                  <Label>Amount (KES) *</Label>
                  <Input type="number" value={mpesaAmount} onChange={(e) => setMpesaAmount(e.target.value)} placeholder="0.00" />
                </div>
                <Button onClick={handleMpesaPayment} className="w-full" disabled={mpesaSubmitting}>
                  {mpesaSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Smartphone className="mr-2 h-4 w-4" />}
                  Send STK Push
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedPage>
  );
}
