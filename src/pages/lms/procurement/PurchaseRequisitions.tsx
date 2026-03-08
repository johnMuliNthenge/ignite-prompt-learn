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
import { Plus, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function PurchaseRequisitions() {
  const { user } = useAuth();
  const [prs, setPrs] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ department: '', priority: 'normal', justification: '' });
  const [lineItems, setLineItems] = useState<{item_id: string; description: string; quantity: number; estimated_unit_price: number}[]>([
    { item_id: '', description: '', quantity: 1, estimated_unit_price: 0 }
  ]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [prRes, itemRes] = await Promise.all([
      supabase.from('purchase_requisitions').select('*').order('created_at', { ascending: false }),
      supabase.from('inventory_items').select('id, name, item_code, cost_price').eq('is_active', true),
    ]);
    setPrs((prRes.data as any[]) || []);
    setItems((itemRes.data as any[]) || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    try {
      const { data: numData } = await supabase.rpc('generate_pr_number');
      const { data: pr, error } = await supabase.from('purchase_requisitions').insert({
        pr_number: numData as string, requested_by: user?.id, department: form.department || null,
        priority: form.priority, justification: form.justification || null, status: 'submitted',
      }).select().single();
      if (error) throw error;

      const validItems = lineItems.filter(i => i.item_id || i.description).map(i => ({
        pr_id: (pr as any).id, item_id: i.item_id || null, description: i.description || null,
        quantity: i.quantity, estimated_unit_price: i.estimated_unit_price,
      }));
      if (validItems.length > 0) {
        await supabase.from('purchase_requisition_items').insert(validItems);
      }

      toast.success('Purchase Requisition created');
      setDialogOpen(false);
      setForm({ department: '', priority: 'normal', justification: '' });
      setLineItems([{ item_id: '', description: '', quantity: 1, estimated_unit_price: 0 }]);
      fetchAll();
    } catch (err: any) { toast.error(err.message); }
  };

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === 'approved') { updates.approved_by = user?.id; updates.approved_at = new Date().toISOString(); }
    const { error } = await supabase.from('purchase_requisitions').update(updates).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success(`PR ${status}`); fetchAll(); }
  };

  const statusColors: Record<string, string> = { draft: 'secondary', submitted: 'outline', approved: 'default', rejected: 'destructive', converted: 'default' };

  return (
    <ProtectedPage moduleCode="procurement.pr" title="Purchase Requisitions">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">Purchase Requisitions</h1><p className="text-muted-foreground">Manage purchase requests</p></div>
          <ActionButton moduleCode="procurement.pr" action="add">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New PR</Button></DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Create Purchase Requisition</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Department</Label><Input value={form.department} onChange={e => setForm({...form, department: e.target.value})} /></div>
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem><SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2"><Label>Justification</Label><Textarea value={form.justification} onChange={e => setForm({...form, justification: e.target.value})} /></div>
                  <div className="space-y-2">
                    <Label>Items</Label>
                    {lineItems.map((li, idx) => (
                      <div key={idx} className="grid grid-cols-4 gap-2">
                        <Select value={li.item_id} onValueChange={v => {
                          const n = [...lineItems]; n[idx].item_id = v;
                          const item = items.find(i => i.id === v);
                          if (item) n[idx].estimated_unit_price = item.cost_price;
                          setLineItems(n);
                        }}>
                          <SelectTrigger><SelectValue placeholder="Item" /></SelectTrigger>
                          <SelectContent>{items.map(i => <SelectItem key={i.id} value={i.id}>{i.item_code} - {i.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input type="number" min={1} placeholder="Qty" value={li.quantity} onChange={e => { const n = [...lineItems]; n[idx].quantity = +e.target.value; setLineItems(n); }} />
                        <Input type="number" placeholder="Unit Price" value={li.estimated_unit_price} onChange={e => { const n = [...lineItems]; n[idx].estimated_unit_price = +e.target.value; setLineItems(n); }} />
                        <Input placeholder="Description" value={li.description} onChange={e => { const n = [...lineItems]; n[idx].description = e.target.value; setLineItems(n); }} />
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => setLineItems([...lineItems, { item_id: '', description: '', quantity: 1, estimated_unit_price: 0 }])}>+ Add Line</Button>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSubmit}>Submit PR</Button>
                </div>
              </DialogContent>
            </Dialog>
          </ActionButton>
        </div>

        <Card><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>PR #</TableHead><TableHead>Date</TableHead><TableHead>Department</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow> :
              prs.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8">No requisitions</TableCell></TableRow> :
              prs.map(pr => (
                <TableRow key={pr.id}>
                  <TableCell className="font-mono">{pr.pr_number}</TableCell>
                  <TableCell>{format(new Date(pr.created_at), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{pr.department || '-'}</TableCell>
                  <TableCell><Badge variant={pr.priority === 'urgent' ? 'destructive' : 'outline'}>{pr.priority}</Badge></TableCell>
                  <TableCell><Badge variant={statusColors[pr.status] as any}>{pr.status}</Badge></TableCell>
                  <TableCell>
                    {pr.status === 'submitted' && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => updateStatus(pr.id, 'approved')}><Check className="h-3 w-3 mr-1" />Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => updateStatus(pr.id, 'rejected')}><X className="h-3 w-3 mr-1" />Reject</Button>
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
