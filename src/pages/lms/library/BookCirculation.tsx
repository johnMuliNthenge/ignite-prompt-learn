import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedPage, ActionButton } from '@/components/auth/ProtectedPage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, RotateCcw, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, differenceInDays } from 'date-fns';

export default function BookCirculation() {
  const { user } = useAuth();
  const [issues, setIssues] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ book_id: '', member_id: '', due_days: 14 });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [issRes, bookRes, memRes, setRes] = await Promise.all([
      supabase.from('library_issues').select('*, library_books(title, book_code), library_members(id, member_type, students(other_name, surname), hr_employees(first_name, last_name))').order('created_at', { ascending: false }),
      supabase.from('library_books').select('id, title, book_code, available_copies').gt('available_copies', 0),
      supabase.from('library_members').select('id, member_type, borrow_limit, max_borrow_days, students(other_name, surname, student_no), hr_employees(first_name, last_name, employee_no)').eq('is_active', true),
      supabase.from('library_settings').select('setting_key, setting_value'),
    ]);
    setIssues((issRes.data as any[]) || []);
    setBooks((bookRes.data as any[]) || []);
    setMembers((memRes.data as any[]) || []);
    const s: any = {};
    ((setRes.data as any[]) || []).forEach(r => { s[r.setting_key] = r.setting_value; });
    setSettings(s);
    setLoading(false);
  };

  const getMemberName = (m: any) => {
    if (!m) return 'Unknown';
    if (m.member_type === 'student' && m.students) return `${m.students.other_name || ''} ${m.students.surname || ''}`.trim();
    if (m.member_type === 'staff' && m.hr_employees) return `${m.hr_employees.first_name || ''} ${m.hr_employees.last_name || ''}`.trim();
    return 'Unknown';
  };

  const handleIssue = async () => {
    try {
      // Check member borrow limit
      const member = members.find(m => m.id === form.member_id);
      const activeBorrows = issues.filter(i => i.member_id === form.member_id && i.status === 'issued');
      if (member && activeBorrows.length >= member.borrow_limit) {
        toast.error(`Member has reached borrow limit (${member.borrow_limit})`);
        return;
      }

      const dueDate = addDays(new Date(), form.due_days);
      const { error } = await supabase.from('library_issues').insert({
        book_id: form.book_id, member_id: form.member_id,
        due_date: dueDate.toISOString(), issued_by: user?.id,
      });
      if (error) throw error;

      // Decrease available copies
      const book = books.find(b => b.id === form.book_id);
      if (book) {
        await supabase.from('library_books').update({ available_copies: book.available_copies - 1 }).eq('id', form.book_id);
      }

      toast.success('Book issued successfully');
      setDialogOpen(false);
      setForm({ book_id: '', member_id: '', due_days: 14 });
      fetchAll();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleReturn = async (issue: any) => {
    try {
      const now = new Date();
      const dueDate = new Date(issue.due_date);
      const overdueDays = Math.max(0, differenceInDays(now, dueDate));

      await supabase.from('library_issues').update({
        return_date: now.toISOString(), status: 'returned', returned_to: user?.id,
      }).eq('id', issue.id);

      // Increase available copies
      const { data: bookData } = await supabase.from('library_books').select('available_copies').eq('id', issue.book_id).single();
      if (bookData) {
        await supabase.from('library_books').update({ available_copies: (bookData as any).available_copies + 1 }).eq('id', issue.book_id);
      }

      // Calculate fine if overdue
      if (overdueDays > 0) {
        const finePerDay = Number(settings.overdue_fine_per_day || 50);
        const fineAmount = overdueDays * finePerDay;
        
        // Get member's student_id for finance posting
        const { data: memberData } = await supabase.from('library_members').select('student_id').eq('id', issue.member_id).single();
        
        await supabase.from('library_fines').insert({
          issue_id: issue.id, member_id: issue.member_id,
          fine_type: 'overdue', amount: fineAmount,
          student_id: (memberData as any)?.student_id || null,
          notes: `${overdueDays} days overdue @ ${finePerDay}/day`,
        });

        // Post fine to student finance if student
        if ((memberData as any)?.student_id) {
          await supabase.from('fee_invoices').insert([{
            student_id: (memberData as any).student_id,
            invoice_number: `LIB-FINE-${Date.now()}`,
            invoice_date: new Date().toISOString().split('T')[0],
            total_amount: fineAmount,
            balance_due: fineAmount,
            status: 'sent',
          }]);
          
          await supabase.from('library_fines').update({ posted_to_finance: true }).eq('issue_id', issue.id);
        }

        toast.warning(`Book returned. Overdue fine of ${fineAmount.toLocaleString()} applied.`);
      } else {
        toast.success('Book returned successfully');
      }
      fetchAll();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleRenew = async (issue: any) => {
    const maxRenewals = Number(settings.max_renewals || 2);
    if (issue.renewed_count >= maxRenewals) {
      toast.error(`Maximum renewals (${maxRenewals}) reached`);
      return;
    }

    // Check if book is reserved
    const { data: reservations } = await supabase.from('library_reservations')
      .select('id').eq('book_id', issue.book_id).eq('status', 'active');
    if (reservations && reservations.length > 0) {
      toast.error('Cannot renew - book has active reservations');
      return;
    }

    const newDueDate = addDays(new Date(issue.due_date), 14);
    const { error } = await supabase.from('library_issues').update({
      due_date: newDueDate.toISOString(), renewed_count: issue.renewed_count + 1,
    }).eq('id', issue.id);
    if (error) toast.error(error.message);
    else { toast.success('Book renewed'); fetchAll(); }
  };

  const handleLost = async (issue: any) => {
    try {
      await supabase.from('library_issues').update({ status: 'lost' }).eq('id', issue.id);

      const { data: bookData } = await supabase.from('library_books').select('cost_price, total_copies').eq('id', issue.book_id).single();
      const multiplier = Number(settings.lost_book_multiplier || 2);
      // Estimate replacement cost
      const fineAmount = 5000 * multiplier; // Default if no cost_price

      const { data: memberData } = await supabase.from('library_members').select('student_id').eq('id', issue.member_id).single();

      await supabase.from('library_fines').insert({
        issue_id: issue.id, member_id: issue.member_id,
        fine_type: 'lost', amount: fineAmount,
        student_id: (memberData as any)?.student_id || null,
        notes: `Lost book replacement fee`,
      });

      // Decrease total copies
      if (bookData) {
        await supabase.from('library_books').update({ total_copies: Math.max(0, (bookData as any).total_copies - 1) }).eq('id', issue.book_id);
      }

      // Post to finance
      if ((memberData as any)?.student_id) {
        await supabase.from('fee_invoices').insert([{
          student_id: (memberData as any).student_id,
          invoice_number: `LIB-LOST-${Date.now()}`,
          invoice_date: new Date().toISOString().split('T')[0],
          total_amount: fineAmount,
          balance_due: fineAmount,
          status: 'sent',
        }]);
        await supabase.from('library_fines').update({ posted_to_finance: true }).eq('issue_id', issue.id).eq('fine_type', 'lost');
      }

      toast.warning(`Book marked as lost. Replacement fee of ${fineAmount.toLocaleString()} applied.`);
      fetchAll();
    } catch (err: any) { toast.error(err.message); }
  };

  const statusColors: Record<string, string> = { issued: 'default', returned: 'secondary', overdue: 'destructive', lost: 'destructive' };

  return (
    <ProtectedPage moduleCode="library.circulation" title="Book Circulation">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">Book Circulation</h1><p className="text-muted-foreground">Issue, return, and renew books</p></div>
          <ActionButton moduleCode="library.circulation" action="add">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Issue Book</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Issue Book</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Book *</Label>
                    <Select value={form.book_id} onValueChange={v => setForm({...form, book_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Select book" /></SelectTrigger>
                      <SelectContent>{books.map(b => <SelectItem key={b.id} value={b.id}>{b.book_code} - {b.title} ({b.available_copies} avail)</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Member *</Label>
                    <Select value={form.member_id} onValueChange={v => {
                      const mem = members.find(m => m.id === v);
                      setForm({...form, member_id: v, due_days: mem?.max_borrow_days || 14 });
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                      <SelectContent>{members.map(m => <SelectItem key={m.id} value={m.id}>{getMemberName(m)} ({m.member_type})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Borrow Duration (days)</Label><Input type="number" value={form.due_days} onChange={e => setForm({...form, due_days: +e.target.value})} /></div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleIssue} disabled={!form.book_id || !form.member_id}>Issue</Button>
                </div>
              </DialogContent>
            </Dialog>
          </ActionButton>
        </div>

        <Card><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Book</TableHead><TableHead>Member</TableHead><TableHead>Issue Date</TableHead><TableHead>Due Date</TableHead><TableHead>Renewals</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow> :
              issues.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8">No issues</TableCell></TableRow> :
              issues.map(issue => {
                const isOverdue = issue.status === 'issued' && new Date(issue.due_date) < new Date();
                return (
                  <TableRow key={issue.id}>
                    <TableCell>{issue.library_books?.book_code} - {issue.library_books?.title}</TableCell>
                    <TableCell>{getMemberName(issue.library_members)}</TableCell>
                    <TableCell>{format(new Date(issue.issue_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className={isOverdue ? 'text-destructive font-medium' : ''}>{format(new Date(issue.due_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{issue.renewed_count}</TableCell>
                    <TableCell><Badge variant={isOverdue ? 'destructive' : statusColors[issue.status] as any}>{isOverdue ? 'OVERDUE' : issue.status}</Badge></TableCell>
                    <TableCell>
                      {issue.status === 'issued' && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => handleReturn(issue)}>Return</Button>
                          <Button size="sm" variant="ghost" onClick={() => handleRenew(issue)}><RotateCcw className="h-3 w-3 mr-1" />Renew</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleLost(issue)}>Lost</Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent></Card>
      </div>
    </ProtectedPage>
  );
}
