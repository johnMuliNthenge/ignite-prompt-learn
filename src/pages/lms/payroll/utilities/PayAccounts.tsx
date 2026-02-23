import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Edit, Trash2 } from 'lucide-react';

const PayAccounts = () => {
  const [items, setItems] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', account_id: '', account_type: 'expense', description: '', is_active: true });

  useEffect(() => { fetchData(); }, []);
  const fetchData = async () => {
    setLoading(true);
    const [res, accRes] = await Promise.all([
      supabase.from('payroll_pay_accounts').select('*, chart_of_accounts(account_code, account_name)').order('name'),
      supabase.from('chart_of_accounts').select('id, account_code, account_name, account_type').eq('is_active', true).order('account_code'),
    ]);
    setItems(res.data || []);
    setAccounts(accRes.data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      const payload = { ...form, account_id: form.account_id || null };
      if (editing) { const { error } = await supabase.from('payroll_pay_accounts').update(payload).eq('id', editing.id); if (error) throw error; }
      else { const { error } = await supabase.from('payroll_pay_accounts').insert(payload); if (error) throw error; }
      toast.success('Saved'); setShowDialog(false); setEditing(null); fetchData();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string) => { if (!confirm('Delete?')) return; await supabase.from('payroll_pay_accounts').delete().eq('id', id); toast.success('Deleted'); fetchData(); };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pay Accounts</h1>
        <Button onClick={() => { setEditing(null); setForm({ name: '', account_id: '', account_type: 'expense', description: '', is_active: true }); setShowDialog(true); }}><Plus className="h-4 w-4 mr-2" />Add Pay Account</Button>
      </div>
      <Card><CardContent className="pt-6">
        {loading ? <p>Loading...</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>GL Account</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {items.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No pay accounts</TableCell></TableRow> :
                items.map(i => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.name}</TableCell>
                    <TableCell>{i.chart_of_accounts ? `${i.chart_of_accounts.account_code} - ${i.chart_of_accounts.account_name}` : '-'}</TableCell>
                    <TableCell className="capitalize">{i.account_type}</TableCell>
                    <TableCell><Badge variant={i.is_active ? 'default' : 'secondary'}>{i.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(i); setForm({ name: i.name, account_id: i.account_id || '', account_type: i.account_type, description: i.description || '', is_active: i.is_active }); setShowDialog(true); }}><Edit className="h-4 w-4" /></Button>
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
          <DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add'} Pay Account</DialogTitle><DialogDescription>Map payroll items to GL accounts</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. PAYE, NHIF, Basic Salary" /></div>
            <div><Label>GL Account</Label>
              <Select value={form.account_id} onValueChange={v => setForm({...form, account_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select GL account" /></SelectTrigger>
                <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.account_code} - {a.account_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Type</Label>
              <Select value={form.account_type} onValueChange={v => setForm({...form, account_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="liability">Liability</SelectItem>
                  <SelectItem value="asset">Asset</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
            <div className="flex items-center gap-2"><Label>Active</Label><Switch checked={form.is_active} onCheckedChange={v => setForm({...form, is_active: v})} /></div>
          </div>
          <DialogFooter><Button onClick={handleSave}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayAccounts;
