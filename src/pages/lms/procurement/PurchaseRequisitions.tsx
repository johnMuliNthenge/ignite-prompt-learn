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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Check, X, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function PurchaseRequisitions() {
  const { user } = useAuth();
  const [prs, setPrs] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [approvedRequisitions, setApprovedRequisitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ department: '', priority: 'normal', justification: '', source_requisition_id: '' });
  const [lineItems, setLineItems] = useState<{item_id: string; description: string; quantity: number; estimated_unit_price: number}[]>([
    { item_id: '', description: '', quantity: 1, estimated_unit_price: 0 }
  ]);
  const [createMode, setCreateMode] = useState<'requisition' | 'manual'>('requisition');
  const [selectedReqItems, setSelectedReqItems] = useState<any[]>([]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [prRes, itemRes, deptRes, reqRes] = await Promise.all([
      supabase.from('purchase_requisitions').select('*').order('created_at', { ascending: false }),
      supabase.from('inventory_items').select('id, name, item_code, cost_price').eq('is_active', true),
      supabase.from('hr_departments').select('id, name, code').eq('is_active', true).order('name'),
      supabase.from('store_requisitions').select('id, requisition_number, department, status').in('status', ['approved']).order('created_at', { ascending: false }),
    ]);
    setPrs((prRes.data as any[]) || []);
    setItems((itemRes.data as any[]) || []);
    setDepartments((deptRes.data as any[]) || []);
    setApprovedRequisitions((reqRes.data as any[]) || []);
    setLoading(false);
  };

  const onRequisitionSelect = async (reqId: string) => {
    setForm(f => ({ ...f, source_requisition_id: reqId }));
    if (!reqId) { setSelectedReqItems([]); return; }
    const req = approvedRequisitions.find(r => r.id === reqId);
    if (req?.department) setForm(f => ({ ...f, department: req.department }));
    
    const { data } = await supabase.from('store_requisition_items')
      .select('*, inventory_items(id, name, item_code, cost_price)')
      .eq('requisition_id', reqId);
    const reqItems = (data as any[]) || [];
    setSelectedReqItems(reqItems);
    // Auto-populate line items from requisition
    setLineItems(reqItems.map(ri => ({
      item_id: ri.item_id,
      description: ri.inventory_items?.name || '',
      quantity: ri.quantity_requested - (ri.quantity_issued || 0),
      estimated_unit_price: ri.inventory_items?.cost_price || 0,
    })).filter(li => li.quantity > 0));
  };

  const handleSubmit = async () => {
    try {
      const { data: numData } = await supabase.rpc('generate_pr_number');
      const { data: pr, error } = await supabase.from('purchase_requisitions').insert({
        pr_number: numData as string, requested_by: user?.id, department: form.department || null,
        priority: form.priority, justification: form.justification || null, status: 'submitted',
        source_requisition_id: form.source_requisition_id || null,
      }).select().single();
      if (error) throw error;

      const validItems = lineItems.filter(i => i.item_id || i.description).map(i => ({
        pr_id: (pr as any).id, item_id: i.item_id || null, description: i.description || null,
        quantity: i.quantity, estimated_unit_price: i.estimated_unit_price,
      }));
      if (validItems.length > 0) {
        await supabase.from('purchase_requisition_items').insert(validItems);
      }

      // If sourced from a store requisition, mark it as converted
      if (form.source_requisition_id) {
        await supabase.from('store_requisitions').update({ status: 'converted_to_pr' }).eq('id', form.source_requisition_id);
      }

      toast.success('Purchase Requisition created');
      setDialogOpen(false);
      resetForm();
      fetchAll();
    } catch (err: any) { toast.error(err.message); }
  };

  const resetForm = () => {
    setForm({ department: '', priority: 'normal', justification: '', source_requisition_id: '' });
    setLineItems([{ item_id: '', description: '', quantity: 1, estimated_unit_price: 0 }]);
    setSelectedReqItems([]);
    setCreateMode('requisition');
  };

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === 'approved') { updates.approved_by = user?.id; updates.approved_at = new Date().toISOString(); }
    const { error } = await supabase.from('purchase_requisitions').update(updates).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success(`PR ${status}`); fetchAll(); }
  };

  const statusColors: Record<string, string> = { draft: 'secondary', submitted: 'outline', approved: 'default', rejected: 'destructive', converted: 'default' };

  const totalAmount = lineItems.reduce((s, li) => s + (li.quantity * li.estimated_unit_price), 0);

  return (
    <ProtectedPage moduleCode="procurement.pr" title="Purchase Requisitions">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">Purchase Requisitions</h1><p className="text-muted-foreground">Manage purchase requests from store requisitions or manual entries</p></div>
          <ActionButton moduleCode="procurement.pr" action="add">
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New PR</Button></DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Create Purchase Requisition</DialogTitle></DialogHeader>
                
                <Tabs value={createMode} onValueChange={(v) => { setCreateMode(v as any); resetForm(); }} className="mt-2">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="requisition"><ClipboardList className="h-4 w-4 mr-1" />From Store Requisition</TabsTrigger>
                    <TabsTrigger value="manual"><Plus className="h-4 w-4 mr-1" />Manual Entry</TabsTrigger>
                  </TabsList>

                  <TabsContent value="requisition" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Select Approved Store Requisition *</Label>
                      <Select value={form.source_requisition_id} onValueChange={onRequisitionSelect}>
                        <SelectTrigger><SelectValue placeholder="Select a store requisition" /></SelectTrigger>
                        <SelectContent>
                          {approvedRequisitions.length === 0 && <SelectItem value="__none" disabled>No approved requisitions available</SelectItem>}
                          {approvedRequisitions.map(r => (
                            <SelectItem key={r.id} value={r.id}>{r.requisition_number} — {r.department || 'No dept'}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedReqItems.length > 0 && (
                      <div className="border rounded-md p-3 space-y-2 bg-muted/30">
                        <Label className="text-sm font-medium">Requisition Items (auto-populated)</Label>
                        {lineItems.map((li, idx) => (
                          <div key={idx} className="grid grid-cols-4 gap-2 text-sm">
                            <div className="col-span-2">
                              <Input value={items.find(i => i.id === li.item_id)?.name || li.description} readOnly className="bg-muted" />
                            </div>
                            <Input type="number" min={1} value={li.quantity} onChange={e => { const n = [...lineItems]; n[idx].quantity = +e.target.value; setLineItems(n); }} />
                            <Input type="number" value={li.estimated_unit_price} onChange={e => { const n = [...lineItems]; n[idx].estimated_unit_price = +e.target.value; setLineItems(n); }} />
                          </div>
                        ))}
                        <div className="text-right text-sm font-medium mt-2">
                          Total Estimate: {totalAmount.toLocaleString()}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="manual" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Items</Label>
                      {lineItems.map((li, idx) => (
                        <div key={idx} className="grid grid-cols-4 gap-2">
                          <Select value={li.item_id} onValueChange={v => {
                            const n = [...lineItems]; n[idx].item_id = v;
                            const item = items.find(i => i.id === v);
                            if (item) { n[idx].estimated_unit_price = item.cost_price; n[idx].description = item.name; }
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
                      <div className="text-right text-sm font-medium">Total Estimate: {totalAmount.toLocaleString()}</div>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Common fields */}
                <div className="space-y-4 mt-4 border-t pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Department</Label>
                      <Select value={form.department} onValueChange={v => setForm({...form, department: v})}>
                        <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                        <SelectContent>
                          {departments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
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
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSubmit} disabled={
                    (createMode === 'requisition' && !form.source_requisition_id) ||
                    !lineItems.some(i => i.item_id || i.description)
                  }>Submit PR</Button>
                </div>
              </DialogContent>
            </Dialog>
          </ActionButton>
        </div>

        <Card><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>PR #</TableHead><TableHead>Date</TableHead><TableHead>Department</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead>Source</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow> :
              prs.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8">No requisitions</TableCell></TableRow> :
              prs.map(pr => (
                <TableRow key={pr.id}>
                  <TableCell className="font-mono">{pr.pr_number}</TableCell>
                  <TableCell>{format(new Date(pr.created_at), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{pr.department || '-'}</TableCell>
                  <TableCell><Badge variant={pr.priority === 'urgent' ? 'destructive' : 'outline'}>{pr.priority}</Badge></TableCell>
                  <TableCell><Badge variant={statusColors[pr.status] as any}>{pr.status}</Badge></TableCell>
                  <TableCell>{pr.source_requisition_id ? <Badge variant="outline">Store Req</Badge> : <Badge variant="secondary">Manual</Badge>}</TableCell>
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
