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
import { Plus, Check, X, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function StoreRequisitions() {
  const { user } = useAuth();
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reqItems, setReqItems] = useState<{item_id: string; quantity_requested: number; store_id: string}[]>([{ item_id: '', quantity_requested: 1, store_id: '' }]);
  const [form, setForm] = useState({ department: '', notes: '' });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [reqRes, itemRes, storeRes] = await Promise.all([
      supabase.from('store_requisitions').select('*').order('created_at', { ascending: false }),
      supabase.from('inventory_items').select('id, name, item_code').eq('is_active', true),
      supabase.from('inventory_stores').select('id, name').eq('is_active', true),
    ]);
    setRequisitions((reqRes.data as any[]) || []);
    setItems((itemRes.data as any[]) || []);
    setStores((storeRes.data as any[]) || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    try {
      const { data: numData } = await supabase.rpc('generate_requisition_number');
      const { data: req, error: reqError } = await supabase.from('store_requisitions').insert({
        requisition_number: numData as string,
        requested_by: user?.id,
        department: form.department || null,
        notes: form.notes || null,
      }).select().single();
      if (reqError) throw reqError;

      const lineItems = reqItems.filter(i => i.item_id).map(i => ({
        requisition_id: (req as any).id, item_id: i.item_id, quantity_requested: i.quantity_requested,
        store_id: i.store_id || null,
      }));
      if (lineItems.length > 0) {
        const { error: liError } = await supabase.from('store_requisition_items').insert(lineItems);
        if (liError) throw liError;
      }

      toast.success('Requisition created');
      setDialogOpen(false);
      setForm({ department: '', notes: '' });
      setReqItems([{ item_id: '', quantity_requested: 1, store_id: '' }]);
      fetchAll();
    } catch (err: any) { toast.error(err.message); }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const updates: any = { status };
      if (status === 'approved') { updates.approved_by = user?.id; updates.approved_at = new Date().toISOString(); }
      const { error } = await supabase.from('store_requisitions').update(updates).eq('id', id);
      if (error) throw error;

      // If approved, auto-issue items and reduce stock
      if (status === 'issued') {
        const { data: lineItems } = await supabase.from('store_requisition_items').select('*').eq('requisition_id', id);
        if (lineItems) {
          for (const li of lineItems as any[]) {
            if (li.store_id) {
              // Check stock
              const { data: stock } = await supabase.from('store_stock').select('id, quantity').eq('store_id', li.store_id).eq('item_id', li.item_id).single();
              if (stock && (stock as any).quantity >= li.quantity_requested) {
                await supabase.from('store_stock').update({ quantity: (stock as any).quantity - li.quantity_requested }).eq('id', (stock as any).id);
                await supabase.from('stock_transactions').insert({
                  transaction_type: 'issue', item_id: li.item_id, store_id: li.store_id,
                  quantity: li.quantity_requested, reference_number: (requisitions.find(r => r.id === id))?.requisition_number,
                  performed_by: user?.id,
                });
                await supabase.from('store_requisition_items').update({ quantity_issued: li.quantity_requested }).eq('id', li.id);
              } else {
                toast.error(`Insufficient stock for item. Consider creating a Purchase Requisition.`);
              }
            }
          }
        }
      }

      // Convert to PR if stock unavailable
      if (status === 'converted_to_pr') {
        const { data: numData } = await supabase.rpc('generate_pr_number');
        const { data: pr, error: prError } = await supabase.from('purchase_requisitions').insert({
          pr_number: numData as string, requested_by: user?.id,
          department: (requisitions.find(r => r.id === id))?.department,
          source_requisition_id: id, status: 'draft',
          justification: 'Auto-generated from store requisition - stock unavailable',
        }).select().single();
        if (prError) throw prError;

        const { data: lineItems } = await supabase.from('store_requisition_items').select('*, inventory_items(cost_price)').eq('requisition_id', id);
        if (lineItems && pr) {
          const prItems = (lineItems as any[]).map(li => ({
            pr_id: (pr as any).id, item_id: li.item_id, quantity: li.quantity_requested,
            estimated_unit_price: li.inventory_items?.cost_price || 0,
          }));
          await supabase.from('purchase_requisition_items').insert(prItems);
        }
        toast.success('Purchase Requisition created from store requisition');
      }

      toast.success(`Requisition ${status}`);
      fetchAll();
    } catch (err: any) { toast.error(err.message); }
  };

  const statusColors: Record<string, string> = { pending: 'secondary', approved: 'default', issued: 'default', rejected: 'destructive', converted_to_pr: 'outline' };

  return (
    <ProtectedPage moduleCode="inventory.requisitions" title="Store Requisitions">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Store Requisitions</h1>
            <p className="text-muted-foreground">Internal item requests from departments</p>
          </div>
          <ActionButton moduleCode="inventory.requisitions" action="add">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Requisition</Button></DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Create Store Requisition</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>Department</Label><Input value={form.department} onChange={e => setForm({...form, department: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
                  <div className="space-y-2">
                    <Label>Items</Label>
                    {reqItems.map((ri, idx) => (
                      <div key={idx} className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Select value={ri.item_id} onValueChange={v => { const n = [...reqItems]; n[idx].item_id = v; setReqItems(n); }}>
                            <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                            <SelectContent>{items.map(i => <SelectItem key={i.id} value={i.id}>{i.item_code} - {i.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <Input type="number" min={1} className="w-20" value={ri.quantity_requested} onChange={e => { const n = [...reqItems]; n[idx].quantity_requested = +e.target.value; setReqItems(n); }} />
                        <div className="w-40">
                          <Select value={ri.store_id} onValueChange={v => { const n = [...reqItems]; n[idx].store_id = v; setReqItems(n); }}>
                            <SelectTrigger><SelectValue placeholder="Store" /></SelectTrigger>
                            <SelectContent>{stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => setReqItems([...reqItems, { item_id: '', quantity_requested: 1, store_id: '' }])}>+ Add Item</Button>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSubmit} disabled={!reqItems.some(i => i.item_id)}>Submit</Button>
                </div>
              </DialogContent>
            </Dialog>
          </ActionButton>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Req #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow> :
                requisitions.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8">No requisitions</TableCell></TableRow> :
                requisitions.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono">{r.requisition_number}</TableCell>
                    <TableCell>{format(new Date(r.created_at), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{r.department || '-'}</TableCell>
                    <TableCell><Badge variant={statusColors[r.status] as any}>{r.status.replace('_', ' ')}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {r.status === 'pending' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, 'approved')}><Check className="h-3 w-3 mr-1" />Approve</Button>
                            <Button size="sm" variant="destructive" onClick={() => updateStatus(r.id, 'rejected')}><X className="h-3 w-3 mr-1" />Reject</Button>
                          </>
                        )}
                        {r.status === 'approved' && (
                          <>
                            <Button size="sm" onClick={() => updateStatus(r.id, 'issued')}><Check className="h-3 w-3 mr-1" />Issue Items</Button>
                            <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, 'converted_to_pr')}><ShoppingCart className="h-3 w-3 mr-1" />Convert to PR</Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </ProtectedPage>
  );
}
