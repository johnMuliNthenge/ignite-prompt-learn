import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DollarSign, 
  CreditCard, 
  Receipt, 
  TrendingUp,
  Users,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

interface FinanceStats {
  totalReceivables: number;
  totalPayables: number;
  totalCollected: number;
  pendingInvoices: number;
  overdueInvoices: number;
  studentsWithBalance: number;
}

export default function FinanceDashboard() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState<FinanceStats>({
    totalReceivables: 0,
    totalPayables: 0,
    totalCollected: 0,
    pendingInvoices: 0,
    overdueInvoices: 0,
    studentsWithBalance: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch receivables (unpaid/partial invoices)
      const { data: invoices } = await supabase
        .from('fee_invoices')
        .select('balance_due, status');

      const totalReceivables = invoices?.reduce((sum, inv) => sum + (Number(inv.balance_due) || 0), 0) || 0;
      const pendingInvoices = invoices?.filter(inv => inv.status === 'Unpaid' || inv.status === 'Partial').length || 0;
      const overdueInvoices = invoices?.filter(inv => inv.status === 'Overdue').length || 0;

      // Fetch payments
      const { data: payments } = await supabase
        .from('fee_payments')
        .select('amount')
        .eq('status', 'Completed');

      const totalCollected = payments?.reduce((sum, pay) => sum + (Number(pay.amount) || 0), 0) || 0;

      // Fetch payables
      const { data: payables } = await supabase
        .from('payables')
        .select('balance_due');

      const totalPayables = payables?.reduce((sum, pay) => sum + (Number(pay.balance_due) || 0), 0) || 0;

      // Students with balance
      const { data: studentLedger } = await supabase
        .from('student_ledger')
        .select('balance')
        .gt('balance', 0);

      const studentsWithBalance = studentLedger?.length || 0;

      setStats({
        totalReceivables,
        totalPayables,
        totalCollected,
        pendingInvoices,
        overdueInvoices,
        studentsWithBalance,
      });
    } catch (error) {
      console.error('Error fetching finance stats:', error);
      toast.error('Failed to load finance statistics');
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
        <h1 className="text-3xl font-bold">Finance Dashboard</h1>
        <p className="text-muted-foreground">Overview of financial status and key metrics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Receivables</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalReceivables)}</div>
            <p className="text-xs text-muted-foreground">Outstanding student fees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalCollected)}</div>
            <p className="text-xs text-muted-foreground">Fees collected to date</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payables</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalPayables)}</div>
            <p className="text-xs text-muted-foreground">Outstanding bills to pay</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students with Balance</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.studentsWithBalance}</div>
            <p className="text-xs text-muted-foreground">Students owing fees</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingInvoices}</div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Invoices</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overdueInvoices}</div>
            <p className="text-xs text-muted-foreground">Past due date</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
