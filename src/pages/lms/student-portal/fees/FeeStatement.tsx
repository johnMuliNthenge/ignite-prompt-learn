import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, Printer } from 'lucide-react';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  type: 'invoice' | 'payment';
}

interface StudentInfo {
  id: string;
  student_no: string;
  other_name: string;
  surname: string;
}

export default function FeeStatement() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.email) {
      fetchStatement();
    }
  }, [user?.email]);

  const fetchStatement = async () => {
    try {
      // Get student
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

      // Get invoices
      const { data: invoices } = await supabase
        .from('fee_invoices')
        .select('id, invoice_number, invoice_date, total_amount')
        .eq('student_id', studentData.id)
        .order('invoice_date', { ascending: true });

      // Get payments
      const { data: payments } = await supabase
        .from('fee_payments')
        .select('id, receipt_number, payment_date, amount')
        .eq('student_id', studentData.id)
        .order('payment_date', { ascending: true });

      // Combine and sort
      const allTransactions: Transaction[] = [];

      invoices?.forEach((inv) => {
        allTransactions.push({
          id: inv.id,
          date: inv.invoice_date,
          description: `Invoice: ${inv.invoice_number}`,
          debit: inv.total_amount,
          credit: 0,
          balance: 0,
          type: 'invoice',
        });
      });

      payments?.forEach((pay) => {
        allTransactions.push({
          id: pay.id,
          date: pay.payment_date,
          description: `Payment: ${pay.receipt_number}`,
          debit: 0,
          credit: pay.amount,
          balance: 0,
          type: 'payment',
        });
      });

      // Sort by date
      allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate running balance
      let runningBalance = 0;
      allTransactions.forEach((trans) => {
        runningBalance += trans.debit - trans.credit;
        trans.balance = runningBalance;
      });

      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error fetching statement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Fee Statement - ${student?.student_no}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; }
            .header { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f4f4f4; }
            .text-right { text-align: right; }
            .debit { color: #dc2626; }
            .credit { color: #16a34a; }
            .balance { font-weight: bold; }
            @media print { body { print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <h1>Fee Statement</h1>
          <div class="header">
            <p><strong>Student:</strong> ${student?.other_name} ${student?.surname}</p>
            <p><strong>Student No:</strong> ${student?.student_no}</p>
            <p><strong>Date:</strong> ${format(new Date(), 'dd/MM/yyyy')}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th class="text-right">Debit (KES)</th>
                <th class="text-right">Credit (KES)</th>
                <th class="text-right">Balance (KES)</th>
              </tr>
            </thead>
            <tbody>
              ${transactions.map((t) => `
                <tr>
                  <td>${format(new Date(t.date), 'dd/MM/yyyy')}</td>
                  <td>${t.description}</td>
                  <td class="text-right debit">${t.debit > 0 ? t.debit.toLocaleString() : '-'}</td>
                  <td class="text-right credit">${t.credit > 0 ? t.credit.toLocaleString() : '-'}</td>
                  <td class="text-right balance">${t.balance.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
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

  const finalBalance = transactions.length > 0 ? transactions[transactions.length - 1].balance : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fee Statement</h1>
          <p className="text-muted-foreground">Your complete transaction history</p>
        </div>
        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print Statement
        </Button>
      </div>

      <Card ref={printRef}>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                {student ? `${student.other_name} ${student.surname} - ${student.student_no}` : 'Student Statement'}
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className={`text-2xl font-bold ${finalBalance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                KES {finalBalance.toLocaleString()}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No transactions found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit (KES)</TableHead>
                  <TableHead className="text-right">Credit (KES)</TableHead>
                  <TableHead className="text-right">Balance (KES)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((trans) => (
                  <TableRow key={`${trans.type}-${trans.id}`}>
                    <TableCell>{format(new Date(trans.date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{trans.description}</TableCell>
                    <TableCell className="text-right text-destructive">
                      {trans.debit > 0 ? trans.debit.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {trans.credit > 0 ? trans.credit.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {trans.balance.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
