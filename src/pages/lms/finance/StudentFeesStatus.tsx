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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Eye, Printer, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface StudentFeeStatus {
  id: string;
  student_no: string;
  full_name: string;
  email: string;
  class_name: string | null;
  total_invoiced: number;
  total_paid: number;
  balance: number;
  status: 'Paid' | 'Partial' | 'Unpaid' | 'Overdue' | 'Overpaid';
}

interface Transaction {
  id: string;
  date: string;
  type: 'Debit' | 'Credit';
  reference: string;
  description: string;
  amount: number;
  balance: number;
}

export default function StudentFeesStatus() {
  const { isAdmin } = useAuth();
  const [students, setStudents] = useState<StudentFeeStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentFeeStatus | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchStudentFeeStatuses();
  }, []);

  const fetchStudentFeeStatuses = async () => {
    try {
      // Fetch all students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, student_no, other_name, surname, email, class_id')
        .order('surname');

      if (studentsError) throw studentsError;

      // Fetch classes separately for reliable mapping
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, name');

      // Fetch ALL invoices - this is the DEBIT (what student owes)
      const { data: invoicesData } = await supabase
        .from('fee_invoices')
        .select('id, student_id, total_amount, status, due_date');

      // Fetch ALL completed payments - this is the CREDIT (what student paid)
      const { data: paymentsData } = await supabase
        .from('fee_payments')
        .select('id, student_id, amount')
        .eq('status', 'Completed');

      const classMap = new Map((classesData || []).map(c => [c.id, c.name]));

      const studentStatuses: StudentFeeStatus[] = (studentsData || []).map((student: any) => {
        // Get all invoices for this student (DEBITS)
        const studentInvoices = (invoicesData || []).filter(inv => inv.student_id === student.id);
        
        // Get all payments for this student (CREDITS)
        const studentPayments = (paymentsData || []).filter(pay => pay.student_id === student.id);

        // Calculate totals using proper accounting logic
        // Total Invoiced = Sum of all invoice amounts (DEBIT side)
        const totalInvoiced = studentInvoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
        
        // Total Paid = Sum of all payment amounts (CREDIT side)
        const totalPaid = studentPayments.reduce((sum, pay) => sum + (Number(pay.amount) || 0), 0);
        
        // Balance = Debit - Credit (Outstanding amount student still owes)
        const balance = totalInvoiced - totalPaid;

        // Determine status based on financial state
        let status: 'Paid' | 'Partial' | 'Unpaid' | 'Overdue' | 'Overpaid' = 'Unpaid';
        
        if (totalInvoiced === 0) {
          // No invoices - no fee status
          status = 'Unpaid';
        } else if (balance < 0) {
          // Overpaid - student has credit
          status = 'Overpaid';
        } else if (balance === 0) {
          // Fully paid
          status = 'Paid';
        } else if (totalPaid > 0) {
          // Partial payment made
          status = 'Partial';
        } else {
          // Check if any invoice is overdue
          const hasOverdue = studentInvoices.some(inv => {
            if (inv.due_date) {
              return new Date(inv.due_date) < new Date() && inv.status !== 'Paid';
            }
            return false;
          });
          status = hasOverdue ? 'Overdue' : 'Unpaid';
        }

        return {
          id: student.id,
          student_no: student.student_no || '',
          full_name: `${student.other_name || ''} ${student.surname || ''}`.trim(),
          email: student.email || '',
          class_name: classMap.get(student.class_id) || null,
          total_invoiced: totalInvoiced,
          total_paid: totalPaid,
          balance: balance, // Allow negative balance for overpayments
          status,
        };
      });

      // Sort by balance (highest debt first) to prioritize collections
      studentStatuses.sort((a, b) => b.balance - a.balance);

      setStudents(studentStatuses);
    } catch (error) {
      console.error('Error fetching student fee statuses:', error);
      toast.error('Failed to load student fee statuses');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentTransactions = async (studentId: string) => {
    setLoadingTransactions(true);
    try {
      // Fetch invoices (debits)
      const { data: invoicesData } = await supabase
        .from('fee_invoices')
        .select('id, invoice_number, invoice_date, total_amount')
        .eq('student_id', studentId)
        .order('invoice_date', { ascending: true });

      // Fetch payments (credits)
      const { data: paymentsData } = await supabase
        .from('fee_payments')
        .select('id, receipt_number, payment_date, amount')
        .eq('student_id', studentId)
        .eq('status', 'Completed')
        .order('payment_date', { ascending: true });

      // Combine and sort transactions
      const allTransactions: Transaction[] = [];
      let runningBalance = 0;

      // Add invoices as debits
      (invoicesData || []).forEach((inv: any) => {
        runningBalance += Number(inv.total_amount);
        allTransactions.push({
          id: inv.id,
          date: inv.invoice_date,
          type: 'Debit',
          reference: inv.invoice_number,
          description: 'Fee Invoice',
          amount: Number(inv.total_amount),
          balance: runningBalance,
        });
      });

      // Add payments as credits
      (paymentsData || []).forEach((pay: any) => {
        runningBalance -= Number(pay.amount);
        allTransactions.push({
          id: pay.id,
          date: pay.payment_date,
          type: 'Credit',
          reference: pay.receipt_number,
          description: 'Payment Received',
          amount: Number(pay.amount),
          balance: runningBalance,
        });
      });

      // Sort by date
      allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Recalculate running balance after sorting
      let balance = 0;
      allTransactions.forEach(txn => {
        if (txn.type === 'Debit') {
          balance += txn.amount;
        } else {
          balance -= txn.amount;
        }
        txn.balance = balance;
      });

      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleViewStudent = async (student: StudentFeeStatus) => {
    setSelectedStudent(student);
    setViewDialogOpen(true);
    await fetchStudentTransactions(student.id);
  };

  const handlePrintStatement = () => {
    const printContent = printRef.current;
    if (!printContent || !selectedStudent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Fee Statement - ${selectedStudent.student_no}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .header h1 { margin: 0; font-size: 20px; }
          .header p { margin: 5px 0; font-size: 12px; }
          .student-info { margin-bottom: 20px; padding: 10px; background: #f5f5f5; }
          .student-info p { margin: 5px 0; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f0f0f0; }
          .text-right { text-align: right; }
          .debit { color: #dc2626; }
          .credit { color: #16a34a; }
          .summary { margin-top: 20px; padding: 10px; background: #f0f0f0; }
          .footer { text-align: center; margin-top: 30px; font-size: 10px; color: #666; }
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid':
        return <Badge variant="default" className="bg-primary">Paid</Badge>;
      case 'Partial':
        return <Badge variant="secondary">Partial</Badge>;
      case 'Overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      case 'Overpaid':
        return <Badge className="bg-blue-600 text-white">Overpaid</Badge>;
      default:
        return <Badge variant="secondary">Unpaid</Badge>;
    }
  };

  const filteredStudents = students.filter(
    (student) =>
      student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">You don't have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Student Fees Status</h1>
        <p className="text-muted-foreground">Overview of all student fee balances</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Fee Status List</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search students..."
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
                  <TableHead>Student No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">Total Invoiced</TableHead>
                  <TableHead className="text-right">Total Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No students found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-mono">{student.student_no}</TableCell>
                      <TableCell className="font-medium">{student.full_name}</TableCell>
                      <TableCell>{student.class_name || '-'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(student.total_invoiced)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(student.total_paid)}</TableCell>
                      <TableCell className={`text-right font-medium ${student.balance < 0 ? 'text-blue-600' : ''}`}>
                        {student.balance < 0 ? `(${formatCurrency(Math.abs(student.balance))})` : formatCurrency(student.balance)}
                      </TableCell>
                      <TableCell>{getStatusBadge(student.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="View Statement"
                            onClick={() => handleViewStudent(student)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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

      {/* View Statement Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student Fee Statement</DialogTitle>
          </DialogHeader>

          {selectedStudent && (
            <>
              <div ref={printRef}>
                <div className="header text-center border-b-2 border-foreground pb-3 mb-4">
                  <h1 className="text-xl font-bold">STUDENT FEE STATEMENT</h1>
                  <p className="text-sm text-muted-foreground">School Management System</p>
                </div>

                <div className="student-info p-4 bg-muted rounded-lg mb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><span className="text-muted-foreground">Student Name:</span> <strong>{selectedStudent.full_name}</strong></p>
                      <p><span className="text-muted-foreground">Student No:</span> <strong>{selectedStudent.student_no}</strong></p>
                    </div>
                    <div>
                      <p><span className="text-muted-foreground">Class:</span> <strong>{selectedStudent.class_name || 'N/A'}</strong></p>
                      <p><span className="text-muted-foreground">Email:</span> <strong>{selectedStudent.email || 'N/A'}</strong></p>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Transaction History</h3>
                  {loadingTransactions ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : transactions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No transactions found</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Debit</TableHead>
                          <TableHead className="text-right">Credit</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((txn) => (
                          <TableRow key={txn.id}>
                            <TableCell>{format(new Date(txn.date), 'dd/MM/yyyy')}</TableCell>
                            <TableCell className="font-mono text-sm">{txn.reference}</TableCell>
                            <TableCell>{txn.description}</TableCell>
                            <TableCell className="text-right text-destructive">
                              {txn.type === 'Debit' ? formatCurrency(txn.amount) : '-'}
                            </TableCell>
                            <TableCell className="text-right text-primary">
                              {txn.type === 'Credit' ? formatCurrency(txn.amount) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(txn.balance)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>

                <div className="summary p-4 bg-muted rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Invoiced</p>
                      <p className="text-lg font-bold">{formatCurrency(selectedStudent.total_invoiced)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Paid</p>
                      <p className="text-lg font-bold text-primary">{formatCurrency(selectedStudent.total_paid)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {selectedStudent.balance < 0 ? 'Credit Balance (Overpayment)' : 'Outstanding Balance'}
                      </p>
                      <p className={`text-lg font-bold ${selectedStudent.balance < 0 ? 'text-blue-600' : 'text-destructive'}`}>
                        {selectedStudent.balance < 0 
                          ? `(${formatCurrency(Math.abs(selectedStudent.balance))})` 
                          : formatCurrency(selectedStudent.balance)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="footer text-center mt-6 text-xs text-muted-foreground">
                  <p>Generated on {format(new Date(), 'dd MMMM yyyy, HH:mm')}</p>
                  <p>This is a computer-generated statement.</p>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button onClick={handlePrintStatement} className="flex-1">
                  <Printer className="mr-2 h-4 w-4" />
                  Print Statement
                </Button>
                <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
