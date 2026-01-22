import React, { useEffect, useState } from 'react';
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
import { Search, Eye, Receipt } from 'lucide-react';
import { toast } from 'sonner';

interface StudentFeeStatus {
  id: string;
  student_no: string;
  full_name: string;
  email: string;
  class_name: string | null;
  total_invoiced: number;
  total_paid: number;
  balance: number;
  status: 'Paid' | 'Partial' | 'Unpaid' | 'Overdue';
}

export default function StudentFeesStatus() {
  const { isAdmin } = useAuth();
  const [students, setStudents] = useState<StudentFeeStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchStudentFeeStatuses();
  }, []);

  const fetchStudentFeeStatuses = async () => {
    try {
      // Fetch students with their classes
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          student_no,
          full_name,
          email,
          classes(name)
        `)
        .order('full_name');

      if (studentsError) throw studentsError;

      // Fetch all invoices
      const { data: invoices } = await supabase
        .from('fee_invoices')
        .select('student_id, total_amount, amount_paid, balance_due, status');

      // Fetch all payments
      const { data: payments } = await supabase
        .from('fee_payments')
        .select('student_id, amount')
        .eq('status', 'Completed');

      // Calculate fee status for each student
      const studentStatuses: StudentFeeStatus[] = (studentsData || []).map((student: any) => {
        const studentInvoices = invoices?.filter(inv => inv.student_id === student.id) || [];
        const studentPayments = payments?.filter(pay => pay.student_id === student.id) || [];

        const totalInvoiced = studentInvoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
        const totalPaid = studentPayments.reduce((sum, pay) => sum + (Number(pay.amount) || 0), 0);
        const balance = totalInvoiced - totalPaid;

        let status: 'Paid' | 'Partial' | 'Unpaid' | 'Overdue' = 'Unpaid';
        if (balance <= 0 && totalInvoiced > 0) status = 'Paid';
        else if (totalPaid > 0 && balance > 0) status = 'Partial';
        else if (studentInvoices.some(inv => inv.status === 'Overdue')) status = 'Overdue';

        return {
          id: student.id,
          student_no: student.student_no,
          full_name: student.full_name,
          email: student.email,
          class_name: student.classes?.name || null,
          total_invoiced: totalInvoiced,
          total_paid: totalPaid,
          balance: Math.max(0, balance),
          status,
        };
      });

      setStudents(studentStatuses);
    } catch (error) {
      console.error('Error fetching student fee statuses:', error);
      toast.error('Failed to load student fee statuses');
    } finally {
      setLoading(false);
    }
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
        return <Badge className="bg-green-500">Paid</Badge>;
      case 'Partial':
        return <Badge className="bg-yellow-500">Partial</Badge>;
      case 'Overdue':
        return <Badge variant="destructive">Overdue</Badge>;
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
            <p className="text-center py-4">Loading...</p>
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
                      <TableCell className="text-right font-medium">
                        {formatCurrency(student.balance)}
                      </TableCell>
                      <TableCell>{getStatusBadge(student.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" title="View Details">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Create Invoice">
                            <Receipt className="h-4 w-4" />
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
    </div>
  );
}
