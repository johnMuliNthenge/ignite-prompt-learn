import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Edit, Trash2 } from 'lucide-react';

const PayGrades = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', description: '', min_salary: 0, max_salary: 0, is_active: true });

  useEffect(() => { fetch(); }, []);

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase.from('pay_grades').select('*').order('name');
    setItems(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      const payload = { ...form, min_salary: Number(form.min_salary), max_salary: Number(form.max_salary) };
      if (editing) {
        const { error } = await supabase.from('pay_grades').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pay_grades').insert(payload);
        if (error) throw error;
      }
      toast.success('Saved'); setShowDialog(false); setEditing(null); fetch();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete?')) return;
    await supabase.from('pay_grades').delete().eq('id', id);
    toast.success('Deleted'); fetch();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pay Grades</h1>
        <Button onClick={() => { setEditing(null); setForm({ name: '', description: '', min_salary: 0, max_salary: 0, is_active: true }); setShowDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" />Add Pay Grade
        </Button>
      </div>
      <Card>
        <CardContent className="pt-6">
          {loading ? <p>Loading...</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Min Salary</TableHead><TableHead>Max Salary</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {items.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No pay grades</TableCell></TableRow> :
                  items.map(i => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.name}</TableCell>
                      <TableCell>{i.min_salary?.toLocaleString()}</TableCell>
                      <TableCell>{i.max_salary?.toLocaleString()}</TableCell>
                      <TableCell><Badge variant={i.is_active ? 'default' : 'secondary'}>{i.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => { setEditing(i); setForm({ name: i.name, description: i.description || '', min_salary: i.min_salary, max_salary: i.max_salary, is_active: i.is_active }); setShowDialog(true); }}><Edit className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(i.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog open={showDialog} onOpenChange={v => { setShowDialog(v); if (!v) setEditing(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add'} Pay Grade</DialogTitle><DialogDescription>Configure pay grade details</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Min Salary</Label><Input type="number" value={form.min_salary} onChange={e => setForm({...form, min_salary: Number(e.target.value)})} /></div>
              <div><Label>Max Salary</Label><Input type="number" value={form.max_salary} onChange={e => setForm({...form, max_salary: Number(e.target.value)})} /></div>
            </div>
            <div className="flex items-center gap-2"><Label>Active</Label><Switch checked={form.is_active} onCheckedChange={v => setForm({...form, is_active: v})} /></div>
          </div>
          <DialogFooter><Button onClick={handleSave}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayGrades;
