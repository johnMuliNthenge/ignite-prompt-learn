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
import { Plus, Edit, Trash2, Calendar } from 'lucide-react';

const PayrollCalendar = () => {
  const [periods, setPeriods] = useState<any[]>([]);
  const [fiscalYears, setFiscalYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', period_start: '', period_end: '', processing_deadline: '', payment_date: '', status: 'open', fiscal_year_id: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [pRes, fyRes] = await Promise.all([
      supabase.from('payroll_periods').select('*, fiscal_years(name)').order('period_start', { ascending: false }),
      supabase.from('fiscal_years').select('id, name').order('name', { ascending: false }),
    ]);
    setPeriods(pRes.data || []);
    setFiscalYears(fyRes.data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      const payload = { ...form, fiscal_year_id: form.fiscal_year_id || null, processing_deadline: form.processing_deadline || null, payment_date: form.payment_date || null };
      if (editing) {
        const { error } = await supabase.from('payroll_periods').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('payroll_periods').insert(payload);
        if (error) throw error;
      }
      toast.success('Period saved');
      setShowDialog(false);
      setEditing(null);
      fetchData();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this period?')) return;
    await supabase.from('payroll_periods').delete().eq('id', id);
    toast.success('Period deleted');
    fetchData();
  };

  const statusColors: Record<string, string> = { open: 'default', processing: 'secondary', approved: 'outline', finalized: 'default', closed: 'destructive' };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Calendar className="h-6 w-6" /><h1 className="text-2xl font-bold">Payroll Calendar</h1></div>
        <Button onClick={() => { setEditing(null); setForm({ name: '', period_start: '', period_end: '', processing_deadline: '', payment_date: '', status: 'open', fiscal_year_id: '' }); setShowDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" />Add Period
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? <p>Loading...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period Name</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Processing Deadline</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Fiscal Year</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No periods defined</TableCell></TableRow> :
                  periods.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.period_start}</TableCell>
                      <TableCell>{p.period_end}</TableCell>
                      <TableCell>{p.processing_deadline || '-'}</TableCell>
                      <TableCell>{p.payment_date || '-'}</TableCell>
                      <TableCell>{p.fiscal_years?.name || '-'}</TableCell>
                      <TableCell><Badge variant={statusColors[p.status] as any || 'default'}>{p.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setForm({ name: p.name, period_start: p.period_start, period_end: p.period_end, processing_deadline: p.processing_deadline || '', payment_date: p.payment_date || '', status: p.status, fiscal_year_id: p.fiscal_year_id || '' }); setShowDialog(true); }}><Edit className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
          <DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add'} Payroll Period</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Period Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. January 2026" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Start Date</Label><Input type="date" value={form.period_start} onChange={e => setForm({...form, period_start: e.target.value})} /></div>
              <div><Label>End Date</Label><Input type="date" value={form.period_end} onChange={e => setForm({...form, period_end: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Processing Deadline</Label><Input type="date" value={form.processing_deadline} onChange={e => setForm({...form, processing_deadline: e.target.value})} /></div>
              <div><Label>Payment Date</Label><Input type="date" value={form.payment_date} onChange={e => setForm({...form, payment_date: e.target.value})} /></div>
            </div>
            <div>
              <Label>Fiscal Year</Label>
              <Select value={form.fiscal_year_id} onValueChange={v => setForm({...form, fiscal_year_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select fiscal year" /></SelectTrigger>
                <SelectContent>
                  {fiscalYears.map(fy => <SelectItem key={fy.id} value={fy.id}>{fy.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="finalized">Finalized</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSave}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayrollCalendar;
