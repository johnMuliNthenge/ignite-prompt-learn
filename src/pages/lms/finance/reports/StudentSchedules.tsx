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
import { Search, Download, Loader2, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface StudentSchedule {
  id: string;
  student_no: string;
  student_name: string;
  total_invoiced: number;
  total_paid: number;
  balance: number;
  status: string;
}

export default function StudentSchedules() {
  const { isAdmin } = useAuth();
  const [schedules, setSchedules] = useState<StudentSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      // Fetch students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, student_no, other_name, surname')
        .eq('status', 'Active')
        .order('surname');

      if (studentsError) throw studentsError;

      // Fetch all invoices (DEBIT side)
      const { data: invoicesData } = await supabase
        .from('fee_invoices')
        .select('student_id, total_amount');

      // Fetch ALL completed payments (CREDIT side) - this captures overpayments correctly
      const { data: paymentsData } = await supabase
        .from('fee_payments')
        .select('student_id, amount')
        .eq('status', 'Completed');

      const formattedSchedules: StudentSchedule[] = (studentsData || []).map((student: any) => {
        const studentInvoices = (invoicesData || []).filter((inv: any) => inv.student_id === student.id);
        const studentPayments = (paymentsData || []).filter((pay: any) => pay.student_id === student.id);
        const totalInvoiced = studentInvoices.reduce((sum: number, inv: any) => sum + (Number(inv.total_amount) || 0), 0);
        const totalPaid = studentPayments.reduce((sum: number, pay: any) => sum + (Number(pay.amount) || 0), 0);
        const balance = totalInvoiced - totalPaid; // Negative = overpayment/prepayment

        return {
          id: student.id,
          student_no: student.student_no || '',
          student_name: `${student.other_name || ''} ${student.surname || ''}`.trim(),
          total_invoiced: totalInvoiced,
          total_paid: totalPaid,
          balance: balance,
          status: balance < 0 ? 'Overpaid' : (balance > 0 ? 'Outstanding' : (totalInvoiced > 0 ? 'Cleared' : 'No Invoices')),
        };
      });

      setSchedules(formattedSchedules);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error('Failed to load student schedules');
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
      case 'Cleared':
        return <Badge className="bg-green-600 hover:bg-green-700">Cleared</Badge>;
      case 'Outstanding':
        return <Badge variant="destructive">Outstanding</Badge>;
      case 'Overpaid':
        return <Badge className="bg-blue-600 hover:bg-blue-700">Overpaid</Badge>;
      default:
        return <Badge variant="secondary">No Invoices</Badge>;
    }
  };

  const filteredSchedules = schedules.filter(
    (s) =>
      s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.student_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalOutstanding = schedules.reduce((sum, s) => sum + s.balance, 0);
  const totalCollected = schedules.reduce((sum, s) => sum + s.total_paid, 0);
  const studentsWithBalance = schedules.filter(s => s.balance > 0).length;

  if (!isAdmin) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">You don't have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Student Fee Schedules</h1>
          <p className="text-muted-foreground">Overview of student fee balances</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground">{studentsWithBalance} students with balance</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalCollected)}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalCollected + totalOutstanding > 0 
                ? Math.round((totalCollected / (totalCollected + totalOutstanding)) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Of total invoiced</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Student Schedules</CardTitle>
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
                  <TableHead>Student Name</TableHead>
                  <TableHead className="text-right">Total Invoiced</TableHead>
                  <TableHead className="text-right">Total Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSchedules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No students found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSchedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-mono">{schedule.student_no}</TableCell>
                      <TableCell className="font-medium">{schedule.student_name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(schedule.total_invoiced)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(schedule.total_paid)}</TableCell>
                      <TableCell className={`text-right font-medium ${schedule.balance < 0 ? 'text-blue-600' : schedule.balance > 0 ? 'text-red-600' : ''}`}>
                        {schedule.balance < 0 ? `(${formatCurrency(Math.abs(schedule.balance))})` : schedule.balance > 0 ? formatCurrency(schedule.balance) : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(schedule.status)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" title="View Statement">
                          <Eye className="h-4 w-4" />
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
    </div>
  );
}
