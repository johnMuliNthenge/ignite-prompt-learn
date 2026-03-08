import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function LibraryFines() {
  const [fines, setFines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchFines(); }, []);

  const fetchFines = async () => {
    const { data } = await supabase.from('library_fines')
      .select('*, library_members(member_type, students(other_name, surname, student_no), hr_employees(first_name, last_name)), library_issues(library_books(title, book_code))')
      .order('created_at', { ascending: false });
    setFines((data as any[]) || []);
    setLoading(false);
  };

  const getMemberName = (m: any) => {
    if (!m) return 'Unknown';
    if (m.member_type === 'student' && m.students) return `${m.students.other_name || ''} ${m.students.surname || ''}`.trim();
    if (m.member_type === 'staff' && m.hr_employees) return `${m.hr_employees.first_name || ''} ${m.hr_employees.last_name || ''}`.trim();
    return 'Unknown';
  };

  const waiveFine = async (id: string) => {
    const { error } = await supabase.from('library_fines').update({ status: 'waived' }).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Fine waived'); fetchFines(); }
  };

  const markPaid = async (fine: any) => {
    const { error } = await supabase.from('library_fines').update({ status: 'paid', paid_amount: fine.amount }).eq('id', fine.id);
    if (error) toast.error(error.message);
    else { toast.success('Fine marked as paid'); fetchFines(); }
  };

  const totalFines = fines.reduce((s, f) => s + Number(f.amount), 0);
  const totalPaid = fines.filter(f => f.status === 'paid').reduce((s, f) => s + Number(f.paid_amount || 0), 0);
  const totalOutstanding = fines.filter(f => f.status === 'unpaid').reduce((s, f) => s + Number(f.amount), 0);

  return (
    <ProtectedPage moduleCode="library.fines" title="Library Fines">
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Library Fines</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Fines</p><p className="text-2xl font-bold">{totalFines.toLocaleString()}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Collected</p><p className="text-2xl font-bold text-green-600">{totalPaid.toLocaleString()}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Outstanding</p><p className="text-2xl font-bold text-destructive">{totalOutstanding.toLocaleString()}</p></CardContent></Card>
        </div>

        <Card><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Member</TableHead><TableHead>Book</TableHead><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Posted to Finance</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow> :
              fines.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8">No fines</TableCell></TableRow> :
              fines.map(f => (
                <TableRow key={f.id}>
                  <TableCell>{getMemberName(f.library_members)}</TableCell>
                  <TableCell>{f.library_issues?.library_books?.title || '-'}</TableCell>
                  <TableCell><Badge variant="outline">{f.fine_type}</Badge></TableCell>
                  <TableCell className="font-medium">{Number(f.amount).toLocaleString()}</TableCell>
                  <TableCell><Badge variant={f.posted_to_finance ? 'default' : 'secondary'}>{f.posted_to_finance ? 'Yes' : 'No'}</Badge></TableCell>
                  <TableCell><Badge variant={f.status === 'paid' ? 'default' : f.status === 'waived' ? 'secondary' : 'destructive'}>{f.status}</Badge></TableCell>
                  <TableCell>
                    {f.status === 'unpaid' && (
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => markPaid(f)}>Mark Paid</Button>
                        <Button size="sm" variant="outline" onClick={() => waiveFine(f.id)}>Waive</Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      </div>
    </ProtectedPage>
  );
}
