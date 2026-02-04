import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Printer, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface Payment {
  id: string;
  receipt_number: string;
  payment_date: string;
  amount: number;
  reference_number: string | null;
  notes: string | null;
  payment_mode: {
    name: string;
  } | null;
}

interface StudentInfo {
  id: string;
  student_no: string;
  other_name: string;
  surname: string;
}

export default function FeeReceipts() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  useEffect(() => {
    if (user?.email) {
      fetchPayments();
    }
  }, [user?.email]);

  const fetchPayments = async () => {
    try {
      const { data: studentData } = await supabase
        .from('students')
        .select('id, student_no, other_name, surname')
        .eq('email', user?.email)
        .single();

      if (!studentData) {
        setLoading(false);
        return;
      }

      setStudent(studentData);

      const { data: paymentData } = await supabase
        .from('fee_payments')
        .select(`
          id,
          receipt_number,
          payment_date,
          amount,
          reference_number,
          notes,
          payment_mode:payment_mode_id (name)
        `)
        .eq('student_id', studentData.id)
        .order('payment_date', { ascending: false });

      setPayments(paymentData || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = (payment: Payment) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${payment.receipt_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
            .receipt-title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .receipt-number { font-size: 18px; color: #666; }
            .details { margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .label { color: #666; }
            .value { font-weight: bold; }
            .amount { font-size: 24px; color: #16a34a; text-align: center; margin: 30px 0; }
            .footer { text-align: center; margin-top: 40px; color: #666; font-size: 12px; }
            @media print { body { print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="receipt-title">PAYMENT RECEIPT</div>
            <div class="receipt-number">${payment.receipt_number}</div>
          </div>
          
          <div class="details">
            <div class="detail-row">
              <span class="label">Student Name:</span>
              <span class="value">${student?.other_name} ${student?.surname}</span>
            </div>
            <div class="detail-row">
              <span class="label">Student No:</span>
              <span class="value">${student?.student_no}</span>
            </div>
            <div class="detail-row">
              <span class="label">Payment Date:</span>
              <span class="value">${format(new Date(payment.payment_date), 'dd MMMM yyyy')}</span>
            </div>
            <div class="detail-row">
              <span class="label">Payment Mode:</span>
              <span class="value">${payment.payment_mode?.name || 'N/A'}</span>
            </div>
            ${payment.reference_number ? `
              <div class="detail-row">
                <span class="label">Reference No:</span>
                <span class="value">${payment.reference_number}</span>
              </div>
            ` : ''}
          </div>
          
          <div class="amount">
            Amount Paid: KES ${payment.amount.toLocaleString()}
          </div>
          
          ${payment.notes ? `<p><strong>Notes:</strong> ${payment.notes}</p>` : ''}
          
          <div class="footer">
            <p>This is a computer-generated receipt.</p>
            <p>Printed on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fee Receipts</h1>
        <p className="text-muted-foreground">View and print your payment receipts</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                Total Paid: <span className="font-bold text-green-600">KES {totalPaid.toLocaleString()}</span>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No payments found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Payment Mode</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount (KES)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.receipt_number}</TableCell>
                    <TableCell>{format(new Date(payment.payment_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{payment.payment_mode?.name || '-'}</TableCell>
                    <TableCell>{payment.reference_number || '-'}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {payment.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedPayment(payment)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handlePrintReceipt(payment)}
                        >
                          <Printer className="h-4 w-4" />
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

      {/* View Receipt Dialog */}
      <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receipt Details</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Receipt Number</p>
                <p className="text-xl font-bold">{selectedPayment.receipt_number}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Student</p>
                  <p className="font-medium">{student?.other_name} {student?.surname}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Student No</p>
                  <p className="font-medium">{student?.student_no}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Date</p>
                  <p className="font-medium">{format(new Date(selectedPayment.payment_date), 'dd MMMM yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Mode</p>
                  <p className="font-medium">{selectedPayment.payment_mode?.name || 'N/A'}</p>
                </div>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Amount Paid</p>
                <p className="text-3xl font-bold text-green-600">KES {selectedPayment.amount.toLocaleString()}</p>
              </div>

              {selectedPayment.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p>{selectedPayment.notes}</p>
                </div>
              )}

              <Button className="w-full" onClick={() => handlePrintReceipt(selectedPayment)}>
                <Printer className="mr-2 h-4 w-4" />
                Print Receipt
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
