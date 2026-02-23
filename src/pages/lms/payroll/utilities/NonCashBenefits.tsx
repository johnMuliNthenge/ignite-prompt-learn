import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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

const NonCashBenefits = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', description: '', default_amount: 0, taxable: true, is_active: true });

  useEffect(() => { fetchData(); }, []);
  const fetchData = async () => { setLoading(true); const { data } = await supabase.from('non_cash_benefits').select('*').order('name'); setItems(data || []); setLoading(false); };

  const handleSave = async () => {
    try {
      const payload = { ...form, default_amount: Number(form.default_amount) };
      if (editing) { const { error } = await supabase.from('non_cash_benefits').update(payload).eq('id', editing.id); if (error) throw error; }
      else { const { error } = await supabase.from('non_cash_benefits').insert(payload); if (error) throw error; }
      toast.success('Saved'); setShowDialog(false); setEditing(null); fetchData();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string) => { if (!confirm('Delete?')) return; await supabase.from('non_cash_benefits').delete().eq('id', id); toast.success('Deleted'); fetchData(); };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Non-Cash Benefits</h1>
        <Button onClick={() => { setEditing(null); setForm({ name: '', description: '', default_amount: 0, taxable: true, is_active: true }); setShowDialog(true); }}><Plus className="h-4 w-4 mr-2" />Add Benefit</Button>
      </div>
      <Card><CardContent className="pt-6">
        {loading ? <p>Loading...</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Default Amount</TableHead><TableHead>Taxable</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {items.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No benefits</TableCell></TableRow> :
                items.map(i => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.name}</TableCell>
                    <TableCell>{i.default_amount?.toLocaleString()}</TableCell>
                    <TableCell>{i.taxable ? 'Yes' : 'No'}</TableCell>
                    <TableCell><Badge variant={i.is_active ? 'default' : 'secondary'}>{i.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(i); setForm({ name: i.name, description: i.description || '', default_amount: i.default_amount, taxable: i.taxable, is_active: i.is_active }); setShowDialog(true); }}><Edit className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(i.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>
      <Dialog open={showDialog} onOpenChange={v => { setShowDialog(v); if (!v) setEditing(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add'} Non-Cash Benefit</DialogTitle><DialogDescription>Benefit details</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
            <div><Label>Default Amount</Label><Input type="number" value={form.default_amount} onChange={e => setForm({...form, default_amount: Number(e.target.value)})} /></div>
            <div className="flex items-center gap-2"><Label>Taxable</Label><Switch checked={form.taxable} onCheckedChange={v => setForm({...form, taxable: v})} /></div>
            <div className="flex items-center gap-2"><Label>Active</Label><Switch checked={form.is_active} onCheckedChange={v => setForm({...form, is_active: v})} /></div>
          </div>
          <DialogFooter><Button onClick={handleSave}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NonCashBenefits;
