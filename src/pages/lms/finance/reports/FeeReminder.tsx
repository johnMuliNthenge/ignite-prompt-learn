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
import { Search, Send, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface StudentBalance {
  id: string;
  student_no: string;
  name: string;
  class_name: string;
  total_invoiced: number;
  total_paid: number;
  balance: number;
  last_payment_date: string | null;
}

export default function FeeReminder() {
  const { isAdmin } = useAuth();
  const [students, setStudents] = useState<StudentBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, student_no, other_name, surname, class_id, classes(name)')
        .eq('status', 'Active')
        .order('surname');

      const { data: invoices } = await supabase.from('fee_invoices').select('student_id, total_amount');
      const { data: payments } = await supabase.from('fee_payments').select('student_id, amount, payment_date').eq('status', 'Completed').order('payment_date', { ascending: false });

      const results: StudentBalance[] = (studentsData || [])
        .map((s: any) => {
          const inv = (invoices || []).filter((i: any) => i.student_id === s.id);
          const pay = (payments || []).filter((p: any) => p.student_id === s.id);
          const totalInvoiced = inv.reduce((sum: number, i: any) => sum + (Number(i.total_amount) || 0), 0);
          const totalPaid = pay.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
          const balance = totalInvoiced - totalPaid;
          const lastPay = pay.length > 0 ? pay[0].payment_date : null;

          return {
            id: s.id,
            student_no: s.student_no || '',
            name: `${s.other_name || ''} ${s.surname || ''}`.trim(),
            class_name: (s as any).classes?.name || '-',
            total_invoiced: totalInvoiced,
            total_paid: totalPaid,
            balance,
            last_payment_date: lastPay,
          };
        })
        .filter(s => s.balance > 0)
        .sort((a, b) => b.balance - a.balance);

      setStudents(results);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(n);

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.student_no.toLowerCase().includes(search.toLowerCase())
  );

  const totalOutstanding = students.reduce((s, st) => s + st.balance, 0);

  const getAgingBadge = (lastPayDate: string | null) => {
    if (!lastPayDate) return <Badge variant="destructive">Never Paid</Badge>;
    const daysSince = Math.floor((Date.now() - new Date(lastPayDate).getTime()) / 86400000);
    if (daysSince > 90) return <Badge variant="destructive">90+ days</Badge>;
    if (daysSince > 60) return <Badge className="bg-orange-500">60-90 days</Badge>;
    if (daysSince > 30) return <Badge className="bg-yellow-500 text-black">30-60 days</Badge>;
    return <Badge variant="secondary">Current</Badge>;
  };

  if (!isAdmin) return <div className="p-6"><p className="text-muted-foreground">Access denied.</p></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Fee Reminder</h1>
          <p className="text-muted-foreground">Students with outstanding fee balances</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Download className="mr-2 h-4 w-4" />Export</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total Outstanding</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-destructive">{fmt(totalOutstanding)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Students with Balance</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{students.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Average Balance</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{students.length > 0 ? fmt(totalOutstanding / students.length) : fmt(0)}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Outstanding Balances</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">Invoiced</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Aging</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No students with outstanding balances</TableCell></TableRow>
                ) : filtered.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono">{s.student_no}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.class_name}</TableCell>
                    <TableCell className="text-right">{fmt(s.total_invoiced)}</TableCell>
                    <TableCell className="text-right text-green-600">{fmt(s.total_paid)}</TableCell>
                    <TableCell className="text-right font-bold text-destructive">{fmt(s.balance)}</TableCell>
                    <TableCell>{getAgingBadge(s.last_payment_date)}</TableCell>
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
