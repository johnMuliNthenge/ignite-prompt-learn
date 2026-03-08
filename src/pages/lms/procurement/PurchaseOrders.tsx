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
import { Plus, Check, Send } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function PurchaseOrders() {
  const { user } = useAuth();
  const [pos, setPos] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ po_type: 'LPO', supplier_id: '', delivery_date: '', notes: '' });
  const [lineItems, setLineItems] = useState<{item_id: string; description: string; quantity: number; unit_price: number}[]>([
    { item_id: '', description: '', quantity: 1, unit_price: 0 }
  ]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [poRes, supRes, itemRes] = await Promise.all([
      supabase.from('purchase_orders').select('*, procurement_suppliers(name, supplier_code)').order('created_at', { ascending: false }),
      supabase.from('procurement_suppliers').select('id, name, supplier_code').eq('status', 'active'),
      supabase.from('inventory_items').select('id, name, item_code, cost_price').eq('is_active', true),
    ]);
    setPos((poRes.data as any[]) || []);
    setSuppliers((supRes.data as any[]) || []);
    setItems((itemRes.data as any[]) || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    try {
      const { data: numData } = await supabase.rpc('generate_po_number');
      const totalAmount = lineItems.reduce((sum, li) => sum + li.quantity * li.unit_price, 0);
      
      const { data: po, error } = await supabase.from('purchase_orders').insert({
        po_number: numData as string, po_type: form.po_type, supplier_id: form.supplier_id,
        delivery_date: form.delivery_date || null, total_amount: totalAmount,
        notes: form.notes || null, created_by: user?.id,
      }).select().single();
      if (error) throw error;

      const validItems = lineItems.filter(i => i.item_id || i.description).map(i => ({
        po_id: (po as any).id, item_id: i.item_id || null, description: i.description || null,
        quantity: i.quantity, unit_price: i.unit_price, total_price: i.quantity * i.unit_price,
      }));
      if (validItems.length > 0) {
        await supabase.from('purchase_order_items').insert(validItems);
      }

      toast.success('Purchase Order created');
      setDialogOpen(false);
      setForm({ po_type: 'LPO', supplier_id: '', delivery_date: '', notes: '' });
      setLineItems([{ item_id: '', description: '', quantity: 1, unit_price: 0 }]);
      fetchAll();
    } catch (err: any) { toast.error(err.message); }
  };

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === 'approved') { updates.approved_by = user?.id; updates.approved_at = new Date().toISOString(); }
    const { error } = await supabase.from('purchase_orders').update(updates).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success(`PO ${status}`); fetchAll(); }
  };

  const statusColors: Record<string, string> = { pending: 'secondary', approved: 'default', sent: 'outline', partial: 'secondary', delivered: 'default', closed: 'default', cancelled: 'destructive' };

  return (
    <ProtectedPage moduleCode="procurement.po" title="Purchase Orders">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">Purchase Orders</h1><p className="text-muted-foreground">LPO and LSO management</p></div>
          <ActionButton moduleCode="procurement.po" action="add">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Create PO</Button></DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Create Purchase Order</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>PO Type</Label>
                      <Select value={form.po_type} onValueChange={v => setForm({...form, po_type: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LPO">Local Purchase Order (LPO)</SelectItem>
                          <SelectItem value="LSO">Local Service Order (LSO)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Supplier *</Label>
                      <Select value={form.supplier_id} onValueChange={v => setForm({...form, supplier_id: v})}>
                        <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                        <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.supplier_code} - {s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2"><Label>Delivery Date</Label><Input type="date" value={form.delivery_date} onChange={e => setForm({...form, delivery_date: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
                  <div className="space-y-2">
                    <Label>Items</Label>
                    {lineItems.map((li, idx) => (
                      <div key={idx} className="grid grid-cols-4 gap-2">
                        <Select value={li.item_id} onValueChange={v => {
                          const n = [...lineItems]; n[idx].item_id = v;
                          const item = items.find(i => i.id === v);
                          if (item) n[idx].unit_price = item.cost_price;
                          setLineItems(n);
                        }}>
                          <SelectTrigger><SelectValue placeholder="Item" /></SelectTrigger>
                          <SelectContent>{items.map(i => <SelectItem key={i.id} value={i.id}>{i.item_code} - {i.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input type="number" min={1} placeholder="Qty" value={li.quantity} onChange={e => { const n = [...lineItems]; n[idx].quantity = +e.target.value; setLineItems(n); }} />
                        <Input type="number" placeholder="Unit Price" value={li.unit_price} onChange={e => { const n = [...lineItems]; n[idx].unit_price = +e.target.value; setLineItems(n); }} />
                        <div className="flex items-center text-sm font-medium">Total: {(li.quantity * li.unit_price).toLocaleString()}</div>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => setLineItems([...lineItems, { item_id: '', description: '', quantity: 1, unit_price: 0 }])}>+ Add Line</Button>
                    <p className="text-right font-bold">Grand Total: {lineItems.reduce((s, li) => s + li.quantity * li.unit_price, 0).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSubmit} disabled={!form.supplier_id}>Create PO</Button>
                </div>
              </DialogContent>
            </Dialog>
          </ActionButton>
        </div>

        <Card><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>PO #</TableHead><TableHead>Type</TableHead><TableHead>Supplier</TableHead><TableHead>Amount</TableHead><TableHead>Delivery</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow> :
              pos.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8">No purchase orders</TableCell></TableRow> :
              pos.map(po => (
                <TableRow key={po.id}>
                  <TableCell className="font-mono">{po.po_number}</TableCell>
                  <TableCell><Badge variant="outline">{po.po_type}</Badge></TableCell>
                  <TableCell>{po.procurement_suppliers?.name}</TableCell>
                  <TableCell className="font-medium">{Number(po.total_amount).toLocaleString()}</TableCell>
                  <TableCell>{po.delivery_date ? format(new Date(po.delivery_date), 'dd/MM/yyyy') : '-'}</TableCell>
                  <TableCell><Badge variant={statusColors[po.status] as any}>{po.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {po.status === 'pending' && <Button size="sm" variant="outline" onClick={() => updateStatus(po.id, 'approved')}><Check className="h-3 w-3 mr-1" />Approve</Button>}
                      {po.status === 'approved' && <Button size="sm" variant="outline" onClick={() => updateStatus(po.id, 'sent')}><Send className="h-3 w-3 mr-1" />Send</Button>}
                    </div>
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
