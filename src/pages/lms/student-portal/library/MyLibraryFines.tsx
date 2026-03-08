import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function MyLibraryFines() {
  const { user } = useAuth();
  const [fines, setFines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user?.id) fetchFines(); }, [user?.id]);

  const fetchFines = async () => {
    const { data: student } = await supabase.from('students').select('id').eq('user_id', user!.id).single();
    if (!student) { setLoading(false); return; }

    const { data } = await supabase.from('library_fines')
      .select('*, library_issues(library_books(title, book_code))')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false });
    setFines((data as any[]) || []);
    setLoading(false);
  };

  const totalOutstanding = fines.filter(f => f.status === 'unpaid').reduce((s, f) => s + Number(f.amount), 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          My Library Fines
        </h1>
        <p className="text-muted-foreground">View your library fines and payment status</p>
      </div>

      {totalOutstanding > 0 && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Outstanding Fines</p>
            <p className="text-3xl font-bold text-destructive">{totalOutstanding.toLocaleString()}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Book</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : fines.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-green-600">No fines — great job!</TableCell></TableRow>
              ) : fines.map(fine => (
                <TableRow key={fine.id}>
                  <TableCell>{format(new Date(fine.created_at), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{fine.library_issues?.library_books?.title || '-'}</TableCell>
                  <TableCell className="capitalize">{fine.fine_type}</TableCell>
                  <TableCell className="font-medium">{Number(fine.amount).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={fine.status === 'paid' ? 'secondary' : fine.status === 'waived' ? 'outline' : 'destructive'}>
                      {fine.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
