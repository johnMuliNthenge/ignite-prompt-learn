import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, DollarSign, GraduationCap, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface StudentData {
  id: string;
  student_no: string;
  other_name: string;
  surname: string;
}

interface BalanceData {
  totalInvoiced: number;
  totalPaid: number;
  balance: number;
}

export default function StudentDashboard() {
  const { user, profile } = useAuth();
  const [student, setStudent] = useState<StudentData | null>(null);
  const [balance, setBalance] = useState<BalanceData>({ totalInvoiced: 0, totalPaid: 0, balance: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.email) {
      fetchStudentData();
    }
  }, [user?.email]);

  const fetchStudentData = async () => {
    try {
      // Find student by user email
      const { data: studentData } = await supabase
        .from('students')
        .select('id, student_no, other_name, surname')
        .eq('email', user?.email)
        .single();

      if (studentData) {
        setStudent(studentData);

        // Fetch fee balance
        const { data: invoices } = await supabase
          .from('fee_invoices')
          .select('total_amount, amount_paid')
          .eq('student_id', studentData.id);

        const totalInvoiced = invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
        const totalPaid = invoices?.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0) || 0;

        setBalance({
          totalInvoiced,
          totalPaid,
          balance: totalInvoiced - totalPaid,
        });
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
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
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold">
          Welcome, {student ? `${student.other_name} ${student.surname}` : profile?.full_name || 'Student'}!
        </h1>
        <p className="text-muted-foreground mt-1">
          {student ? `Student No: ${student.student_no}` : 'Access your academic and financial information'}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Fee Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${balance.balance > 0 ? 'text-destructive' : 'text-green-600'}`}>
              KES {balance.balance.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {balance.balance > 0 ? 'Outstanding balance' : 'All paid up!'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {balance.totalInvoiced.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">KES {balance.totalPaid.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All payments</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <Link to="/lms/student-portal/fees/balance">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-primary/10 p-3">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">View Fee Balance</h3>
                <p className="text-sm text-muted-foreground">Check your current fees</p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <Link to="/lms/student-portal/academics/results">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-green-500/10 p-3">
                <GraduationCap className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold">View Results</h3>
                <p className="text-sm text-muted-foreground">Check your academic results</p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <Link to="/lms/student-portal/poe/upload">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-blue-500/10 p-3">
                <FileText className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold">Upload POE</h3>
                <p className="text-sm text-muted-foreground">Submit your portfolio</p>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
}
