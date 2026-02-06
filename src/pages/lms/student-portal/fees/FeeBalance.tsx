import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Smartphone } from 'lucide-react';
import { format } from 'date-fns';

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: string;
}

interface StudentInfo {
  id: string;
  student_no: string;
  phone: string | null;
}

export default function FeeBalance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [mpesaEnabled, setMpesaEnabled] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [mpesaAmount, setMpesaAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchStudentInvoices();
      checkMpesaSettings();
    }
  }, [user?.id]);

  const checkMpesaSettings = async () => {
    try {
      const { data } = await supabase
        .from('mpesa_settings')
        .select('id')
        .eq('is_active', true)
        .limit(1);
      
      setMpesaEnabled(data && data.length > 0);
    } catch {
      setMpesaEnabled(false);
    }
  };

  const fetchStudentInvoices = async () => {
    try {
      // Get student by user_id (matches RLS policy)
      const { data: studentData } = await supabase
        .from('students')
        .select('id, student_no, phone')
        .eq('user_id', user?.id)
        .single();

      if (studentData) {
        setStudent(studentData);

        // Fetch invoices - RLS will filter by student's user_id
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('fee_invoices')
          .select('*')
          .eq('student_id', studentData.id)
          .order('invoice_date', { ascending: false });

        if (invoiceError) {
          console.error('Error fetching invoices:', invoiceError);
        }

        setInvoices(invoiceData || []);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals - balance is invoiced minus paid (negative = prepayment/overpayment)
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.amount_paid, 0);
  const totalBalance = totalInvoiced - totalPaid; // Negative means overpayment

  const openPayDialog = () => {
    setMpesaPhone(student?.phone || '');
    setMpesaAmount(totalBalance > 0 ? totalBalance.toString() : '');
    setPayDialogOpen(true);
  };

  const handleMpesaPayment = async () => {
    if (!mpesaPhone || !mpesaAmount || !student) {
      toast({
        title: 'Missing information',
        description: 'Please enter phone number and amount',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);
    try {
      // Get oldest unpaid invoice
      const unpaidInvoice = invoices.find(inv => inv.balance_due > 0);

      const { data, error } = await supabase.functions.invoke('mpesa-stk-push', {
        body: {
          phone_number: mpesaPhone,
          amount: parseFloat(mpesaAmount),
          student_id: student.id,
          invoice_id: unpaidInvoice?.id || null,
          account_reference: student.student_no || 'SchoolFees',
          transaction_desc: 'Fee Payment',
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Payment Initiated',
          description: 'Please check your phone and enter your M-Pesa PIN to complete the payment.',
        });
        setPayDialogOpen(false);
        // Refresh balance after a delay
        setTimeout(() => {
          fetchStudentInvoices();
        }, 30000);
      } else {
        throw new Error(data?.error || 'Payment initiation failed');
      }
    } catch (error: any) {
      console.error('M-Pesa error:', error);
      toast({
        title: 'Payment Failed',
        description: error.message || 'Failed to initiate payment',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500">Paid</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-500">Partial</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      case 'overpaid':
        return <Badge className="bg-blue-500">Overpaid</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fee Balance</h1>
          <p className="text-muted-foreground">View your current fee balance and invoice details</p>
        </div>
        {mpesaEnabled && totalBalance > 0 && (
          <Button onClick={openPayDialog}>
            <Smartphone className="mr-2 h-4 w-4" />
            Pay Now
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {totalInvoiced.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">KES {totalPaid.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalBalance > 0 ? 'text-destructive' : 'text-green-600'}`}>
              {totalBalance < 0 ? (
                <span className="text-blue-600">(KES {Math.abs(totalBalance).toLocaleString()})</span>
              ) : (
                `KES ${totalBalance.toLocaleString()}`
              )}
            </div>
            {totalBalance < 0 && (
              <Badge className="mt-2 bg-blue-500">Overpaid</Badge>
            )}
            {mpesaEnabled && totalBalance > 0 && (
              <Button size="sm" className="mt-2" onClick={openPayDialog}>
                <Smartphone className="mr-2 h-3 w-3" />
                Pay Now
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>All your fee invoices</CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No invoices found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{format(new Date(invoice.invoice_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>
                      {invoice.due_date ? format(new Date(invoice.due_date), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-right">KES {invoice.total_amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-green-600">
                      KES {invoice.amount_paid.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      {invoice.balance_due < 0 ? (
                        <span className="text-blue-600">(KES {Math.abs(invoice.balance_due).toLocaleString()})</span>
                      ) : (
                        `KES ${invoice.balance_due.toLocaleString()}`
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(invoice.balance_due < 0 ? 'overpaid' : (invoice.status || 'pending'))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* M-Pesa Payment Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay via M-Pesa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={mpesaPhone}
                onChange={(e) => setMpesaPhone(e.target.value)}
                placeholder="e.g., 0712345678"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the M-Pesa registered phone number
              </p>
            </div>
            <div>
              <Label htmlFor="amount">Amount (KES)</Label>
              <Input
                id="amount"
                type="number"
                value={mpesaAmount}
                onChange={(e) => setMpesaAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>Outstanding Balance:</strong> KES {totalBalance.toLocaleString()}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMpesaPayment} disabled={processing}>
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Smartphone className="mr-2 h-4 w-4" />
                  Send Payment Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
