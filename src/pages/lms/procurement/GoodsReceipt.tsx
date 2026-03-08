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

export default function GoodsReceipt() {
  const { user } = useAuth();
  const [grns, setGrns] = useState<any[]>([]);
  const [pos, setPos] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [poItems, setPoItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ po_id: '', store_id: '', delivery_note_number: '', notes: '' });
  const [grnItems, setGrnItems] = useState<{po_item_id: string; item_id: string; quantity_received: number; item_name: string}[]>([]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [grnRes, poRes, storeRes] = await Promise.all([
      supabase.from('goods_receipt_notes').select('*, purchase_orders(po_number), procurement_suppliers(name), inventory_stores(name)').order('created_at', { ascending: false }),
      supabase.from('purchase_orders').select('*, procurement_suppliers(name, supplier_code)').in('status', ['approved', 'sent', 'partial']),
      supabase.from('inventory_stores').select('id, name').eq('is_active', true),
    ]);
    setGrns((grnRes.data as any[]) || []);
    setPos((poRes.data as any[]) || []);
    setStores((storeRes.data as any[]) || []);
    setLoading(false);
  };

  const loadPOItems = async (poId: string) => {
    const { data } = await supabase.from('purchase_order_items').select('*, inventory_items(name, item_code)').eq('po_id', poId);
    const items = (data as any[]) || [];
    setPoItems(items);
    setGrnItems(items.map(i => ({
      po_item_id: i.id, item_id: i.item_id, quantity_received: i.quantity - (i.quantity_received || 0),
      item_name: i.inventory_items?.name || i.description || 'Unknown',
    })));
  };

  const handleSubmit = async () => {
    try {
      const po = pos.find(p => p.id === form.po_id);
      const { data: numData } = await supabase.rpc('generate_grn_number');
      
      const { data: grn, error } = await supabase.from('goods_receipt_notes').insert({
        grn_number: numData as string, po_id: form.po_id, supplier_id: po?.supplier_id,
        store_id: form.store_id, received_by: user?.id,
        delivery_note_number: form.delivery_note_number || null, notes: form.notes || null,
        status: 'accepted',
      }).select().single();
      if (error) throw error;

      // Insert GRN items
      const grnLineItems = grnItems.filter(gi => gi.quantity_received > 0).map(gi => ({
        grn_id: (grn as any).id, po_item_id: gi.po_item_id, item_id: gi.item_id,
        quantity_received: gi.quantity_received, quantity_accepted: gi.quantity_received,
      }));
      if (grnLineItems.length > 0) {
        await supabase.from('grn_items').insert(grnLineItems);
      }

      // Update inventory - add stock for received items
      for (const gi of grnItems.filter(g => g.quantity_received > 0)) {
        const { data: existing } = await supabase.from('store_stock')
          .select('id, quantity').eq('store_id', form.store_id).eq('item_id', gi.item_id).single();
        if (existing) {
          await supabase.from('store_stock').update({ quantity: (existing as any).quantity + gi.quantity_received }).eq('id', (existing as any).id);
        } else {
          await supabase.from('store_stock').insert({ store_id: form.store_id, item_id: gi.item_id, quantity: gi.quantity_received });
        }
        // Record stock transaction
        await supabase.from('stock_transactions').insert({
          transaction_type: 'grn', item_id: gi.item_id, store_id: form.store_id,
          quantity: gi.quantity_received, reference_number: (grn as any).grn_number,
          performed_by: user?.id,
        });
        // Update PO item received quantity
        const poItem = poItems.find(p => p.id === gi.po_item_id);
        if (poItem) {
          await supabase.from('purchase_order_items').update({
            quantity_received: (poItem.quantity_received || 0) + gi.quantity_received
          }).eq('id', gi.po_item_id);
        }
      }

      // Check if PO is fully delivered
      const { data: updatedPoItems } = await supabase.from('purchase_order_items').select('quantity, quantity_received').eq('po_id', form.po_id);
      const allDelivered = (updatedPoItems as any[])?.every(i => (i.quantity_received || 0) >= i.quantity);
      await supabase.from('purchase_orders').update({ status: allDelivered ? 'delivered' : 'partial' }).eq('id', form.po_id);

      // Auto-create procurement invoice
      const totalReceived = grnItems.reduce((sum, gi) => {
        const poItem = poItems.find(p => p.id === gi.po_item_id);
        return sum + gi.quantity_received * (poItem?.unit_price || 0);
      }, 0);
      
      if (totalReceived > 0) {
        await supabase.from('procurement_invoices').insert({
          invoice_number: `SI-${(grn as any).grn_number}`, supplier_id: po?.supplier_id,
          po_id: form.po_id, grn_id: (grn as any).id,
          amount: totalReceived, total_amount: totalReceived, status: 'pending',
          created_by: user?.id,
        });
      }

      toast.success('GRN created, inventory updated, and supplier invoice generated');
      setDialogOpen(false);
      setForm({ po_id: '', store_id: '', delivery_note_number: '', notes: '' });
      setGrnItems([]);
      fetchAll();
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <ProtectedPage moduleCode="procurement.grn" title="Goods Receipt">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">Goods Receipt Notes</h1><p className="text-muted-foreground">Receive goods against purchase orders</p></div>
          <ActionButton moduleCode="procurement.grn" action="add">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Create GRN</Button></DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Create Goods Receipt Note</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Purchase Order *</Label>
                      <Select value={form.po_id} onValueChange={v => { setForm({...form, po_id: v}); loadPOItems(v); }}>
                        <SelectTrigger><SelectValue placeholder="Select PO" /></SelectTrigger>
                        <SelectContent>{pos.map(p => <SelectItem key={p.id} value={p.id}>{p.po_number} - {p.procurement_suppliers?.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Receiving Store *</Label>
                      <Select value={form.store_id} onValueChange={v => setForm({...form, store_id: v})}>
                        <SelectTrigger><SelectValue placeholder="Select store" /></SelectTrigger>
                        <SelectContent>{stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2"><Label>Delivery Note #</Label><Input value={form.delivery_note_number} onChange={e => setForm({...form, delivery_note_number: e.target.value})} /></div>
                  {grnItems.length > 0 && (
                    <div className="space-y-2">
                      <Label>Items to Receive</Label>
                      {grnItems.map((gi, idx) => (
                        <div key={idx} className="flex items-center gap-4 p-2 border rounded">
                          <span className="flex-1 text-sm">{gi.item_name}</span>
                          <div className="w-24">
                            <Input type="number" min={0} value={gi.quantity_received} onChange={e => {
                              const n = [...grnItems]; n[idx].quantity_received = +e.target.value; setGrnItems(n);
                            }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSubmit} disabled={!form.po_id || !form.store_id}>Receive Goods</Button>
                </div>
              </DialogContent>
            </Dialog>
          </ActionButton>
        </div>

        <Card><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>GRN #</TableHead><TableHead>PO #</TableHead><TableHead>Supplier</TableHead><TableHead>Store</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow> :
              grns.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8">No GRNs</TableCell></TableRow> :
              grns.map(grn => (
                <TableRow key={grn.id}>
                  <TableCell className="font-mono">{grn.grn_number}</TableCell>
                  <TableCell>{grn.purchase_orders?.po_number}</TableCell>
                  <TableCell>{grn.procurement_suppliers?.name}</TableCell>
                  <TableCell>{grn.inventory_stores?.name}</TableCell>
                  <TableCell>{format(new Date(grn.created_at), 'dd/MM/yyyy')}</TableCell>
                  <TableCell><Badge variant="default">{grn.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      </div>
    </ProtectedPage>
  );
}
