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
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const defaultForm = {
  transaction_type: 'grn', item_id: '', store_id: '', destination_store_id: '',
  quantity: 1, reference_number: '', notes: '', requisition_id: '',
};

export default function StockTransactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [reqItems, setReqItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ ...defaultForm });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [txRes, itemRes, storeRes, reqRes] = await Promise.all([
      supabase.from('stock_transactions').select('*, inventory_items(name, item_code), inventory_stores(name)').order('created_at', { ascending: false }).limit(200),
      supabase.from('inventory_items').select('id, name, item_code').eq('is_active', true),
      supabase.from('inventory_stores').select('id, name').eq('is_active', true),
      supabase.from('store_requisitions').select('id, requisition_number, department, status').in('status', ['approved']).order('created_at', { ascending: false }),
    ]);
    setTransactions((txRes.data as any[]) || []);
    setItems((itemRes.data as any[]) || []);
    setStores((storeRes.data as any[]) || []);
    setRequisitions((reqRes.data as any[]) || []);
    setLoading(false);
  };

  const onRequisitionChange = async (reqId: string) => {
    setForm(f => ({ ...f, requisition_id: reqId, item_id: '', store_id: '' }));
    if (!reqId) { setReqItems([]); return; }
    const { data } = await supabase.from('store_requisition_items')
      .select('*, inventory_items(id, name, item_code)')
      .eq('requisition_id', reqId);
    setReqItems((data as any[]) || []);
  };

  const handleSubmit = async () => {
    if (!form.item_id || !form.store_id) {
      toast.error('Please select an item and store');
      return;
    }
    if (form.transaction_type === 'issue' && !form.requisition_id) {
      toast.error('Please select a store requisition for issues');
      return;
    }
    if (form.transaction_type === 'transfer' && !form.destination_store_id) {
      toast.error('Please select a destination store');
      return;
    }

    setSubmitting(true);
    try {
      const refNum = form.transaction_type === 'issue' && form.requisition_id
        ? (requisitions.find(r => r.id === form.requisition_id))?.requisition_number || form.reference_number
        : form.reference_number || null;

      const { error: txError } = await supabase.from('stock_transactions').insert({
        transaction_type: form.transaction_type, item_id: form.item_id, store_id: form.store_id,
        destination_store_id: form.transaction_type === 'transfer' ? form.destination_store_id : null,
        quantity: form.quantity, reference_number: refNum,
        notes: form.notes || null, performed_by: user?.id,
      });
      if (txError) throw txError;

      const qty = form.quantity;
      if (['grn', 'return'].includes(form.transaction_type)) {
        await upsertStock(form.store_id, form.item_id, qty);
      } else if (form.transaction_type === 'issue') {
        await upsertStock(form.store_id, form.item_id, -qty);
        if (form.requisition_id) {
          const matchingItem = reqItems.find(ri => ri.item_id === form.item_id);
          if (matchingItem) {
            const newIssued = (matchingItem.quantity_issued || 0) + qty;
            await supabase.from('store_requisition_items').update({ quantity_issued: newIssued }).eq('id', matchingItem.id);
          }
          const { data: allItems } = await supabase.from('store_requisition_items').select('quantity_requested, quantity_issued').eq('requisition_id', form.requisition_id);
          const allIssued = (allItems as any[])?.every(i => (i.quantity_issued || 0) >= i.quantity_requested);
          if (allIssued) {
            await supabase.from('store_requisitions').update({ status: 'issued' }).eq('id', form.requisition_id);
          }
        }
      } else if (form.transaction_type === 'transfer') {
        await upsertStock(form.store_id, form.item_id, -qty);
        await upsertStock(form.destination_store_id, form.item_id, qty);
      } else if (form.transaction_type === 'adjustment') {
        const { data: existing } = await supabase.from('store_stock').select('quantity').eq('store_id', form.store_id).eq('item_id', form.item_id).single();
        const diff = qty - (existing?.quantity || 0);
        await upsertStock(form.store_id, form.item_id, diff);
      }

      toast.success('Transaction recorded & stock updated');
      setDialogOpen(false);
      setForm({ ...defaultForm });
      setReqItems([]);
      fetchAll();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const upsertStock = async (storeId: string, itemId: string, qtyChange: number) => {
    const { data: existing } = await supabase.from('store_stock').select('id, quantity').eq('store_id', storeId).eq('item_id', itemId).single();
    if (existing) {
      const { error } = await supabase.from('store_stock').update({ quantity: existing.quantity + qtyChange }).eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('store_stock').insert({ store_id: storeId, item_id: itemId, quantity: Math.max(0, qtyChange) });
      if (error) throw error;
    }
  };

  const typeColors: Record<string, string> = { grn: 'default', issue: 'destructive', return: 'secondary', transfer: 'outline', adjustment: 'secondary' };
  const typeLabels: Record<string, string> = { grn: 'GRN', issue: 'Issue', return: 'Return', transfer: 'Transfer', adjustment: 'Adjustment' };

  const canSubmit = form.item_id && form.store_id && 
    (form.transaction_type !== 'issue' || form.requisition_id) &&
    (form.transaction_type !== 'transfer' || form.destination_store_id) &&
    form.quantity > 0;

  return (
    <ProtectedPage moduleCode="inventory.transactions" title="Stock Transactions">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Stock Transactions</h1>
            <p className="text-muted-foreground">Record GRN, issues, returns, transfers & adjustments</p>
          </div>
          <ActionButton moduleCode="inventory.transactions" action="add">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Transaction</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Record Stock Transaction</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Transaction Type *</Label>
                    <Select value={form.transaction_type} onValueChange={v => { setForm({ ...defaultForm, transaction_type: v }); setReqItems([]); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="grn">Goods Receipt (GRN)</SelectItem>
                        <SelectItem value="issue">Stock Issue</SelectItem>
                        <SelectItem value="return">Stock Return</SelectItem>
                        <SelectItem value="transfer">Stock Transfer</SelectItem>
                        <SelectItem value="adjustment">Stock Adjustment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {form.transaction_type === 'issue' && (
                    <div className="space-y-2">
                      <Label>Store Requisition *</Label>
                      <Select value={form.requisition_id} onValueChange={onRequisitionChange}>
                        <SelectTrigger><SelectValue placeholder="Select approved requisition" /></SelectTrigger>
                        <SelectContent>
                          {requisitions.length === 0 && <SelectItem value="__none" disabled>No approved requisitions</SelectItem>}
                          {requisitions.map(r => (
                            <SelectItem key={r.id} value={r.id}>{r.requisition_number} — {r.department || 'No dept'}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {form.transaction_type === 'issue' && form.requisition_id ? (
                    <div className="space-y-2">
                      <Label>Item from Requisition *</Label>
                      <Select value={form.item_id} onValueChange={v => {
                        const ri = reqItems.find(i => i.item_id === v);
                        setForm(f => ({ ...f, item_id: v, quantity: ri?.quantity_requested || 1 }));
                      }}>
                        <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                        <SelectContent>
                          {reqItems.map(ri => (
                            <SelectItem key={ri.id} value={ri.item_id}>
                              {ri.inventory_items?.item_code} - {ri.inventory_items?.name} (Req: {ri.quantity_requested}, Issued: {ri.quantity_issued || 0})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    form.transaction_type !== 'issue' && (
                      <div className="space-y-2">
                        <Label>Item *</Label>
                        <Select value={form.item_id} onValueChange={v => setForm({...form, item_id: v})}>
                          <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                          <SelectContent>{items.map(i => <SelectItem key={i.id} value={i.id}>{i.item_code} - {i.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    )
                  )}

                  {/* Store selector - always visible when needed */}
                  <div className="space-y-2">
                    <Label>{form.transaction_type === 'transfer' ? 'Source Store *' : form.transaction_type === 'issue' ? 'Issue from Store *' : 'Store *'}</Label>
                    <Select value={form.store_id} onValueChange={v => setForm({...form, store_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Select store" /></SelectTrigger>
                      <SelectContent>{stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>

                  {form.transaction_type === 'transfer' && (
                    <div className="space-y-2">
                      <Label>Destination Store *</Label>
                      <Select value={form.destination_store_id} onValueChange={v => setForm({...form, destination_store_id: v})}>
                        <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
                        <SelectContent>{stores.filter(s => s.id !== form.store_id).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Quantity *</Label>
                    <Input type="number" min={1} value={form.quantity} onChange={e => setForm({...form, quantity: +e.target.value})} />
                  </div>
                  {form.transaction_type !== 'issue' && (
                    <div className="space-y-2">
                      <Label>Reference Number</Label>
                      <Input value={form.reference_number} onChange={e => setForm({...form, reference_number: e.target.value})} />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
                    {submitting ? 'Recording...' : 'Record'}
                  </Button>
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
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow> :
                transactions.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8">No transactions</TableCell></TableRow> :
                transactions.map(tx => (
                  <TableRow key={tx.id}>
                    <TableCell>{format(new Date(tx.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                    <TableCell><Badge variant={typeColors[tx.transaction_type] as any}>{typeLabels[tx.transaction_type]}</Badge></TableCell>
                    <TableCell>{tx.inventory_items?.item_code} - {tx.inventory_items?.name}</TableCell>
                    <TableCell>{tx.inventory_stores?.name}</TableCell>
                    <TableCell className="font-medium">{tx.quantity}</TableCell>
                    <TableCell>{tx.reference_number || '-'}</TableCell>
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
