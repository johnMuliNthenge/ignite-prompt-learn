import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Wallet, Search } from 'lucide-react';

const DeductionsBenefits = () => {
  const [deductions, setDeductions] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    employee_id: '', name: '', deduction_type: 'loan', total_amount: 0,
    monthly_amount: 0, start_date: new Date().toISOString().split('T')[0], end_date: '', is_active: true,
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [dedRes, empRes] = await Promise.all([
      supabase.from('employee_deductions').select('*, hr_employees(employee_no, first_name, last_name)').order('created_at', { ascending: false }),
      supabase.from('hr_employees').select('id, employee_no, first_name, last_name').eq('status', 'active').order('first_name'),
    ]);
    setDeductions(dedRes.data || []);
    setEmployees(empRes.data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      const totalAmt = Number(form.total_amount);
      const monthlyAmt = Number(form.monthly_amount);
      const payload = {
        employee_id: form.employee_id,
        name: form.name,
        deduction_type: form.deduction_type,
        total_amount: totalAmt,
        monthly_amount: monthlyAmt,
        balance: editing ? undefined : totalAmt,
        amount_recovered: editing ? undefined : 0,
        start_date: form.start_date,
        end_date: form.end_date || null,
        is_active: form.is_active,
      };
      if (editing) {
        const { error } = await supabase.from('employee_deductions').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('employee_deductions').insert({ ...payload, balance: totalAmt, amount_recovered: 0 });
        if (error) throw error;
      }
      toast.success('Saved');
      setShowDialog(false);
      setEditing(null);
      fetchData();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete?')) return;
    await supabase.from('employee_deductions').delete().eq('id', id);
    toast.success('Deleted');
    fetchData();
  };

  const filtered = deductions.filter(d => {
    const empName = `${d.hr_employees?.first_name || ''} ${d.hr_employees?.last_name || ''}`.toLowerCase();
    return empName.includes(search.toLowerCase()) || d.name.toLowerCase().includes(search.toLowerCase());
  });

  const typeColors: Record<string, string> = { loan: 'default', salary_advance: 'secondary', recurring: 'outline', one_time: 'destructive', benefit: 'default' };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Wallet className="h-6 w-6" /><h1 className="text-2xl font-bold">Deductions & Benefits</h1></div>
        <Button onClick={() => { setEditing(null); setForm({ employee_id: '', name: '', deduction_type: 'loan', total_amount: 0, monthly_amount: 0, start_date: new Date().toISOString().split('T')[0], end_date: '', is_active: true }); setShowDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" />Add Deduction/Benefit
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-10" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        </CardHeader>
        <CardContent>
          {loading ? <p>Loading...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Monthly</TableHead>
                  <TableHead>Recovered</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">No records</TableCell></TableRow> :
                  filtered.map(d => (
                    <TableRow key={d.id}>
                      <TableCell>{d.hr_employees?.first_name} {d.hr_employees?.last_name}</TableCell>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell><Badge variant={typeColors[d.deduction_type] as any}>{d.deduction_type.replace('_', ' ')}</Badge></TableCell>
                      <TableCell>{d.total_amount?.toLocaleString()}</TableCell>
                      <TableCell>{d.monthly_amount?.toLocaleString()}</TableCell>
                      <TableCell>{d.amount_recovered?.toLocaleString()}</TableCell>
                      <TableCell className="font-medium">{d.balance?.toLocaleString()}</TableCell>
                      <TableCell><Badge variant={d.is_active ? 'default' : 'secondary'}>{d.is_active ? 'Active' : 'Cleared'}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => { setEditing(d); setForm({ employee_id: d.employee_id, name: d.name, deduction_type: d.deduction_type, total_amount: d.total_amount, monthly_amount: d.monthly_amount, start_date: d.start_date, end_date: d.end_date || '', is_active: d.is_active }); setShowDialog(true); }}><Edit className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                }
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={v => { setShowDialog(v); if (!v) setEditing(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add'} Deduction/Benefit</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Employee</Label>
              <Select value={form.employee_id} onValueChange={v => setForm({...form, employee_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.employee_no} - {e.first_name} {e.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Name/Description</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Car Loan, Salary Advance" /></div>
            <div><Label>Type</Label>
              <Select value={form.deduction_type} onValueChange={v => setForm({...form, deduction_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="loan">Loan</SelectItem>
                  <SelectItem value="salary_advance">Salary Advance</SelectItem>
                  <SelectItem value="recurring">Recurring Deduction</SelectItem>
                  <SelectItem value="one_time">One-time Deduction</SelectItem>
                  <SelectItem value="benefit">Benefit/Allowance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Total Amount</Label><Input type="number" value={form.total_amount} onChange={e => setForm({...form, total_amount: Number(e.target.value)})} /></div>
              <div><Label>Monthly Amount</Label><Input type="number" value={form.monthly_amount} onChange={e => setForm({...form, monthly_amount: Number(e.target.value)})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} /></div>
              <div><Label>End Date (optional)</Label><Input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSave}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeductionsBenefits;
