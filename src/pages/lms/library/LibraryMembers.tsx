import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProtectedPage, ActionButton } from '@/components/auth/ProtectedPage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function LibraryMembers() {
  const [members, setMembers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ member_type: 'student', student_id: '', employee_id: '', borrow_limit: 3, max_borrow_days: 14 });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [memRes, stuRes, empRes] = await Promise.all([
      supabase.from('library_members').select('*, students(other_name, surname, student_no), hr_employees(first_name, last_name, employee_no)'),
      supabase.from('students').select('id, other_name, surname, student_no').eq('status', 'Active'),
      supabase.from('hr_employees').select('id, first_name, last_name, employee_no').eq('status', 'active'),
    ]);
    setMembers((memRes.data as any[]) || []);
    setStudents((stuRes.data as any[]) || []);
    setEmployees((empRes.data as any[]) || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    try {
      const { error } = await supabase.from('library_members').insert({
        member_type: form.member_type,
        student_id: form.member_type === 'student' ? form.student_id : null,
        employee_id: form.member_type === 'staff' ? form.employee_id : null,
        borrow_limit: form.borrow_limit, max_borrow_days: form.max_borrow_days,
      });
      if (error) throw error;
      toast.success('Library member added');
      setDialogOpen(false);
      setForm({ member_type: 'student', student_id: '', employee_id: '', borrow_limit: 3, max_borrow_days: 14 });
      fetchAll();
    } catch (err: any) { toast.error(err.message); }
  };

  const getMemberName = (m: any) => {
    if (m.member_type === 'student' && m.students) return `${m.students.other_name || ''} ${m.students.surname || ''}`.trim();
    if (m.member_type === 'staff' && m.hr_employees) return `${m.hr_employees.first_name || ''} ${m.hr_employees.last_name || ''}`.trim();
    return 'Unknown';
  };

  const getMemberNo = (m: any) => {
    if (m.member_type === 'student' && m.students) return m.students.student_no;
    if (m.member_type === 'staff' && m.hr_employees) return m.hr_employees.employee_no;
    return '-';
  };

  return (
    <ProtectedPage moduleCode="library.members" title="Library Members">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">Library Members</h1><p className="text-muted-foreground">Manage library member registrations</p></div>
          <ActionButton moduleCode="library.members" action="add">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Member</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Register Library Member</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Member Type</Label>
                    <Select value={form.member_type} onValueChange={v => setForm({...form, member_type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.member_type === 'student' ? (
                    <div className="space-y-2">
                      <Label>Student *</Label>
                      <Select value={form.student_id} onValueChange={v => setForm({...form, student_id: v})}>
                        <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                        <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.student_no} - {s.other_name} {s.surname}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Employee *</Label>
                      <Select value={form.employee_id} onValueChange={v => setForm({...form, employee_id: v})}>
                        <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                        <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.employee_no} - {e.first_name} {e.last_name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2"><Label>Borrow Limit</Label><Input type="number" min={1} value={form.borrow_limit} onChange={e => setForm({...form, borrow_limit: +e.target.value})} /></div>
                  <div className="space-y-2"><Label>Max Borrow Days</Label><Input type="number" min={1} value={form.max_borrow_days} onChange={e => setForm({...form, max_borrow_days: +e.target.value})} /></div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSubmit}>Register</Button>
                </div>
              </DialogContent>
            </Dialog>
          </ActionButton>
        </div>

        <Card><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Borrow Limit</TableHead><TableHead>Max Days</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow> :
              members.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8">No members</TableCell></TableRow> :
              members.map(m => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono">{getMemberNo(m)}</TableCell>
                  <TableCell className="font-medium">{getMemberName(m)}</TableCell>
                  <TableCell><Badge variant="outline">{m.member_type}</Badge></TableCell>
                  <TableCell>{m.borrow_limit}</TableCell>
                  <TableCell>{m.max_borrow_days} days</TableCell>
                  <TableCell><Badge variant={m.is_active ? 'default' : 'secondary'}>{m.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      </div>
    </ProtectedPage>
  );
}
