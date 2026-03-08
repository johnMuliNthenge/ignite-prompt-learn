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
import { Plus, Check } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function RFQManagement() {
  const { user } = useAuth();
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [prs, setPrs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', pr_id: '', deadline: '', supplier_ids: [] as string[] });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [rfqRes, supRes, prRes] = await Promise.all([
      supabase.from('rfqs').select('*').order('created_at', { ascending: false }),
      supabase.from('procurement_suppliers').select('id, name, supplier_code').eq('status', 'active'),
      supabase.from('purchase_requisitions').select('id, pr_number').eq('status', 'approved'),
    ]);
    setRfqs((rfqRes.data as any[]) || []);
    setSuppliers((supRes.data as any[]) || []);
    setPrs((prRes.data as any[]) || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    try {
      const { data: numData } = await supabase.rpc('generate_rfq_number');
      const { data: rfq, error } = await supabase.from('rfqs').insert({
        rfq_number: numData as string, title: form.title, description: form.description || null,
        pr_id: form.pr_id || null, deadline: form.deadline || null, created_by: user?.id,
      }).select().single();
      if (error) throw error;

      if (form.supplier_ids.length > 0) {
        const rfqSuppliers = form.supplier_ids.map(sid => ({ rfq_id: (rfq as any).id, supplier_id: sid }));
        await supabase.from('rfq_suppliers').insert(rfqSuppliers);
      }

      toast.success('RFQ created');
      setDialogOpen(false);
      setForm({ title: '', description: '', pr_id: '', deadline: '', supplier_ids: [] });
      fetchAll();
    } catch (err: any) { toast.error(err.message); }
  };

  const selectSupplier = async (rfqId: string, rfqSupplierId: string) => {
    // Deselect all for this RFQ, then select this one
    const { data: allRfqSups } = await supabase.from('rfq_suppliers').select('id').eq('rfq_id', rfqId);
    if (allRfqSups) {
      for (const rs of allRfqSups as any[]) {
        await supabase.from('rfq_suppliers').update({ is_selected: rs.id === rfqSupplierId }).eq('id', rs.id);
      }
    }
    await supabase.from('rfqs').update({ status: 'awarded' }).eq('id', rfqId);
    toast.success('Supplier selected');
    fetchAll();
  };

  const statusColors: Record<string, string> = { open: 'secondary', closed: 'outline', evaluated: 'default', awarded: 'default' };

  return (
    <ProtectedPage moduleCode="procurement.rfq" title="Request for Quotation">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">Request for Quotation</h1><p className="text-muted-foreground">Send RFQs to suppliers and evaluate quotes</p></div>
          <ActionButton moduleCode="procurement.rfq" action="add">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Create RFQ</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Create Request for Quotation</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
                  <div className="space-y-2">
                    <Label>Linked PR</Label>
                    <Select value={form.pr_id} onValueChange={v => setForm({...form, pr_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Select PR (optional)" /></SelectTrigger>
                      <SelectContent>{prs.map(p => <SelectItem key={p.id} value={p.id}>{p.pr_number}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Deadline</Label><Input type="date" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} /></div>
                  <div className="space-y-2">
                    <Label>Invite Suppliers</Label>
                    <div className="space-y-1 max-h-40 overflow-y-auto border rounded p-2">
                      {suppliers.map(s => (
                        <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={form.supplier_ids.includes(s.id)}
                            onChange={e => {
                              if (e.target.checked) setForm({...form, supplier_ids: [...form.supplier_ids, s.id]});
                              else setForm({...form, supplier_ids: form.supplier_ids.filter(id => id !== s.id)});
                            }} />
                          <span className="text-sm">{s.supplier_code} - {s.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSubmit} disabled={!form.title}>Create RFQ</Button>
                </div>
              </DialogContent>
            </Dialog>
          </ActionButton>
        </div>

        <Card><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>RFQ #</TableHead><TableHead>Title</TableHead><TableHead>Deadline</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow> :
              rfqs.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8">No RFQs</TableCell></TableRow> :
              rfqs.map(rfq => (
                <TableRow key={rfq.id}>
                  <TableCell className="font-mono">{rfq.rfq_number}</TableCell>
                  <TableCell className="font-medium">{rfq.title}</TableCell>
                  <TableCell>{rfq.deadline ? format(new Date(rfq.deadline), 'dd/MM/yyyy') : '-'}</TableCell>
                  <TableCell><Badge variant={statusColors[rfq.status] as any}>{rfq.status}</Badge></TableCell>
                  <TableCell>{format(new Date(rfq.created_at), 'dd/MM/yyyy')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      </div>
    </ProtectedPage>
  );
}
