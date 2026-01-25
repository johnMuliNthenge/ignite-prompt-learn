import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Download, Loader2, Search, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface FeeSummary {
  fee_type: string;
  total_invoiced: number;
  total_paid: number;
  total_balance: number;
  student_count: number;
}

export default function SummarizedFeeStatement() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState<FeeSummary[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('all');

  useEffect(() => {
    fetchAcademicYears();
    fetchSummary();
  }, []);

  const fetchAcademicYears = async () => {
    const { data } = await supabase
      .from('academic_years')
      .select('*')
      .order('start_date', { ascending: false });
    setAcademicYears(data || []);
  };

  const fetchSummary = async () => {
    setLoading(true);
    try {
      // Aggregate invoices by fee accounts
      const { data: invoiceData, error } = await supabase
        .from('fee_invoices')
        .select(`
          id,
          total_amount,
          amount_paid,
          balance_due,
          student_id
        `);

      if (error) throw error;

      // Group by fee type (simplified - in production would join with fee_invoice_items)
      const summary: FeeSummary = {
        fee_type: 'All Fees',
        total_invoiced: 0,
        total_paid: 0,
        total_balance: 0,
        student_count: new Set<string>(),
      } as any;

      (invoiceData || []).forEach((inv: any) => {
        summary.total_invoiced += Number(inv.total_amount) || 0;
        summary.total_paid += Number(inv.amount_paid) || 0;
        summary.total_balance += Number(inv.balance_due) || 0;
        if (inv.student_id) {
          (summary.student_count as any).add(inv.student_id);
        }
      });

      const finalSummary: FeeSummary = {
        ...summary,
        student_count: (summary.student_count as any).size,
      };

      setSummaries([finalSummary]);
    } catch (error) {
      console.error('Error fetching summary:', error);
      toast.error('Failed to load fee summary');
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

  const totalInvoiced = summaries.reduce((sum, s) => sum + s.total_invoiced, 0);
  const totalPaid = summaries.reduce((sum, s) => sum + s.total_paid, 0);
  const totalBalance = summaries.reduce((sum, s) => sum + s.total_balance, 0);
  const collectionRate = totalInvoiced > 0 ? ((totalPaid / totalInvoiced) * 100).toFixed(1) : '0';

  if (!isAdmin) {
    return <div className="p-6"><p className="text-muted-foreground">Access denied.</p></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Summarized Fee Statement</h1>
          <p className="text-muted-foreground">Overview of fee collection by category</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="space-y-2 w-64">
              <Label>Academic Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {academicYears.map((year) => (
                    <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={fetchSummary}>
              <Search className="mr-2 h-4 w-4" />
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoiced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalInvoiced)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalBalance)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collection Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{collectionRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Fee Summary by Category
          </CardTitle>
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
                  <TableHead>Fee Category</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead className="text-right">Invoiced</TableHead>
                  <TableHead className="text-right">Collected</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No data available
                    </TableCell>
                  </TableRow>
                ) : (
                  summaries.map((summary, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{summary.fee_type}</TableCell>
                      <TableCell>{summary.student_count}</TableCell>
                      <TableCell className="text-right">{formatCurrency(summary.total_invoiced)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(summary.total_paid)}</TableCell>
                      <TableCell className="text-right text-red-600">{formatCurrency(summary.total_balance)}</TableCell>
                      <TableCell className="text-right">
                        {summary.total_invoiced > 0
                          ? ((summary.total_paid / summary.total_invoiced) * 100).toFixed(1)
                          : '0'}%
                      </TableCell>
                    </TableRow>
                  ))
                )}
                <TableRow className="font-bold bg-muted">
                  <TableCell>TOTAL</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell className="text-right">{formatCurrency(totalInvoiced)}</TableCell>
                  <TableCell className="text-right text-green-600">{formatCurrency(totalPaid)}</TableCell>
                  <TableCell className="text-right text-red-600">{formatCurrency(totalBalance)}</TableCell>
                  <TableCell className="text-right">{collectionRate}%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
