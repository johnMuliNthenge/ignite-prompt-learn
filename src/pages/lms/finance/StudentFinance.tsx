import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Search, Loader2, Eye, FileText, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface StudentFinanceRecord {
  id: string;
  student_no: string;
  student_name: string;
  total_invoiced: number;
  total_paid: number;
  balance: number;
  last_payment_date: string | null;
}

interface StudentDetail {
  invoices: any[];
  payments: any[];
}

// Helper function to avoid Supabase type depth issues
const getSupabaseClient = () => supabase as any;

async function fetchStudentsFromDb() {
  const { data, error } = await getSupabaseClient()
    .from('students')
    .select('id, student_no, surname, other_name')
    .eq('status', 'Active')
    .order('surname');
  if (error) throw error;
  return data || [];
}

async function fetchInvoicesFromDb() {
  const { data } = await getSupabaseClient()
    .from('fee_invoices')
    .select('student_id, total_amount, amount_paid, balance_due');
  return data || [];
}

async function fetchPaymentsFromDb() {
  const { data } = await getSupabaseClient()
    .from('fee_payments')
    .select('student_id, payment_date')
    .order('payment_date', { ascending: false });
  return data || [];
}

export default function StudentFinance() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentFinanceRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentFinanceRecord | null>(null);
  const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetchStudentFinance();
  }, []);

  const fetchStudentFinance = async () => {
    setLoading(true);
    try {
      const [studentsData, invoicesData, paymentsData] = await Promise.all([
        fetchStudentsFromDb(),
        fetchInvoicesFromDb(),
        fetchPaymentsFromDb(),
      ]);

      // Calculate totals for each student
      const studentFinance: StudentFinanceRecord[] = studentsData.map((student: any) => {
        const studentInvoices = invoicesData.filter((inv: any) => inv.student_id === student.id);
        const studentPayments = paymentsData.filter((pay: any) => pay.student_id === student.id);

        const totalInvoiced = studentInvoices.reduce((sum: number, inv: any) => sum + Number(inv.total_amount || 0), 0);
        const totalPaid = studentInvoices.reduce((sum: number, inv: any) => sum + Number(inv.amount_paid || 0), 0);
        const balance = studentInvoices.reduce((sum: number, inv: any) => sum + Number(inv.balance_due || 0), 0);
        const lastPayment = studentPayments[0]?.payment_date || null;

        return {
          id: student.id,
          student_no: student.student_no,
          student_name: `${student.other_name} ${student.surname}`,
          total_invoiced: totalInvoiced,
          total_paid: totalPaid,
          balance: balance,
          last_payment_date: lastPayment,
        };
      });

      setStudents(studentFinance);
    } catch (error) {
      console.error('Error fetching student finance:', error);
      toast.error('Failed to load student finance data');
    } finally {
      setLoading(false);
    }
  };

  const viewStudentDetail = async (student: StudentFinanceRecord) => {
    setSelectedStudent(student);
    setDetailDialogOpen(true);
    setDetailLoading(true);

    try {
      const [invoicesRes, paymentsRes] = await Promise.all([
        supabase
          .from('fee_invoices')
          .select('*')
          .eq('student_id', student.id)
          .order('invoice_date', { ascending: false }),
        supabase
          .from('fee_payments')
          .select('*')
          .eq('student_id', student.id)
          .order('payment_date', { ascending: false }),
      ]);

      setStudentDetail({
        invoices: invoicesRes.data || [],
        payments: paymentsRes.data || [],
      });
    } catch (error) {
      console.error('Error fetching student detail:', error);
      toast.error('Failed to load student details');
    } finally {
      setDetailLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  };

  const filtered = students.filter((s) =>
    s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.student_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getBalanceStatus = (balance: number) => {
    if (balance === 0) return <Badge variant="default">Paid</Badge>;
    if (balance > 0) return <Badge variant="destructive">Outstanding</Badge>;
    return <Badge variant="secondary">Credit</Badge>;
  };

  if (!isAdmin) {
    return <div className="p-6"><p className="text-muted-foreground">Access denied.</p></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Student Finance</h1>
          <p className="text-muted-foreground">Individual student financial records and statements</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Student Financial Records</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or student no..."
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
                  <TableHead>Student No.</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead className="text-right">Total Invoiced</TableHead>
                  <TableHead className="text-right">Total Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Payment</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No student records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-mono">{student.student_no}</TableCell>
                      <TableCell className="font-medium">{student.student_name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(student.total_invoiced)}</TableCell>
                      <TableCell className="text-right text-primary">{formatCurrency(student.total_paid)}</TableCell>
                      <TableCell className="text-right font-bold">
                        <span className={student.balance > 0 ? 'text-destructive' : 'text-primary'}>
                          {formatCurrency(student.balance)}
                        </span>
                      </TableCell>
                      <TableCell>{getBalanceStatus(student.balance)}</TableCell>
                      <TableCell>
                        {student.last_payment_date
                          ? format(new Date(student.last_payment_date), 'dd MMM yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => viewStudentDetail(student)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Student Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Student Financial Statement: {selectedStudent?.student_name}
            </DialogTitle>
          </DialogHeader>
          
          {detailLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : studentDetail && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">Total Invoiced</div>
                    <div className="text-xl font-bold">{formatCurrency(selectedStudent?.total_invoiced || 0)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">Total Paid</div>
                    <div className="text-xl font-bold text-primary">{formatCurrency(selectedStudent?.total_paid || 0)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">Balance Due</div>
                    <div className="text-xl font-bold text-destructive">{formatCurrency(selectedStudent?.balance || 0)}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Invoices */}
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4" />
                  Invoices
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice No.</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentDetail.invoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No invoices
                        </TableCell>
                      </TableRow>
                    ) : (
                      studentDetail.invoices.map((inv: any) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-mono">{inv.invoice_number}</TableCell>
                          <TableCell>{format(new Date(inv.invoice_date), 'dd MMM yyyy')}</TableCell>
                          <TableCell className="text-right">{formatCurrency(inv.total_amount)}</TableCell>
                          <TableCell className="text-right text-primary">{formatCurrency(inv.amount_paid || 0)}</TableCell>
                          <TableCell className="text-right text-destructive">{formatCurrency(inv.balance_due)}</TableCell>
                          <TableCell>
                            <Badge variant={inv.status === 'Paid' ? 'default' : 'secondary'}>
                              {inv.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Payments */}
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-3">
                  <Receipt className="h-4 w-4" />
                  Payments
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt No.</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentDetail.payments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No payments
                        </TableCell>
                      </TableRow>
                    ) : (
                      studentDetail.payments.map((pay: any) => (
                        <TableRow key={pay.id}>
                          <TableCell className="font-mono">{pay.receipt_number}</TableCell>
                          <TableCell>{format(new Date(pay.payment_date), 'dd MMM yyyy')}</TableCell>
                          <TableCell className="text-right text-primary">{formatCurrency(pay.amount)}</TableCell>
                          <TableCell>{pay.reference_number || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="default">{pay.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
