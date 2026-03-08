import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function BookReservations() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchReservations(); }, []);

  const fetchReservations = async () => {
    const { data } = await supabase.from('library_reservations')
      .select('*, library_books(title, book_code, available_copies), library_members(member_type, students(other_name, surname), hr_employees(first_name, last_name))')
      .order('created_at', { ascending: false });
    setReservations((data as any[]) || []);
    setLoading(false);
  };

  const getMemberName = (m: any) => {
    if (!m) return 'Unknown';
    if (m.member_type === 'student' && m.students) return `${m.students.other_name || ''} ${m.students.surname || ''}`.trim();
    if (m.member_type === 'staff' && m.hr_employees) return `${m.hr_employees.first_name || ''} ${m.hr_employees.last_name || ''}`.trim();
    return 'Unknown';
  };

  const cancelReservation = async (id: string) => {
    const { error } = await supabase.from('library_reservations').update({ status: 'cancelled' }).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Reservation cancelled'); fetchReservations(); }
  };

  const fulfillReservation = async (id: string) => {
    const { error } = await supabase.from('library_reservations').update({ status: 'fulfilled' }).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Reservation fulfilled'); fetchReservations(); }
  };

  const statusColors: Record<string, string> = { active: 'default', fulfilled: 'secondary', cancelled: 'destructive', expired: 'secondary' };

  return (
    <ProtectedPage moduleCode="library.reservations" title="Book Reservations">
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Book Reservations</h1>
        <p className="text-muted-foreground">Manage book reservation requests</p>

        <Card><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Book</TableHead><TableHead>Member</TableHead><TableHead>Reserved</TableHead><TableHead>Available</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow> :
              reservations.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8">No reservations</TableCell></TableRow> :
              reservations.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{r.library_books?.book_code} - {r.library_books?.title}</TableCell>
                  <TableCell>{getMemberName(r.library_members)}</TableCell>
                  <TableCell>{new Date(r.reserved_at).toLocaleDateString()}</TableCell>
                  <TableCell><Badge variant={r.library_books?.available_copies > 0 ? 'default' : 'destructive'}>{r.library_books?.available_copies > 0 ? 'Yes' : 'No'}</Badge></TableCell>
                  <TableCell><Badge variant={statusColors[r.status] as any}>{r.status}</Badge></TableCell>
                  <TableCell>
                    {r.status === 'active' && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => fulfillReservation(r.id)}>Fulfill</Button>
                        <Button size="sm" variant="destructive" onClick={() => cancelReservation(r.id)}>Cancel</Button>
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
