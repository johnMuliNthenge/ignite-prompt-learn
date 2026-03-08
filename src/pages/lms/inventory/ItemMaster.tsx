import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProtectedPage, ActionButton } from '@/components/auth/ProtectedPage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Edit, Trash2, Package } from 'lucide-react';
import { toast } from 'sonner';

interface Item {
  id: string;
  item_code: string;
  name: string;
  description: string | null;
  category_id: string | null;
  unit_of_measure: string;
  min_stock_level: number;
  max_stock_level: number;
  reorder_level: number;
  item_type: string;
  barcode: string | null;
  cost_price: number;
  is_active: boolean;
}

interface Category {
  id: string;
  name: string;
}

export default function ItemMaster() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [form, setForm] = useState({
    name: '', description: '', category_id: '', unit_of_measure: 'Piece',
    min_stock_level: 0, max_stock_level: 1000, reorder_level: 10,
    item_type: 'consumable', barcode: '', cost_price: 0,
  });

  useEffect(() => { fetchItems(); fetchCategories(); }, []);

  const fetchItems = async () => {
    const { data } = await supabase.from('inventory_items').select('*').order('created_at', { ascending: false });
    setItems((data as any[]) || []);
    setLoading(false);
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from('inventory_categories').select('id, name').eq('is_active', true);
    setCategories((data as any[]) || []);
  };

  const handleSubmit = async () => {
    try {
      if (editingItem) {
        const { error } = await supabase.from('inventory_items').update({
          name: form.name, description: form.description || null,
          category_id: form.category_id || null, unit_of_measure: form.unit_of_measure,
          min_stock_level: form.min_stock_level, max_stock_level: form.max_stock_level,
          reorder_level: form.reorder_level, item_type: form.item_type,
          barcode: form.barcode || null, cost_price: form.cost_price,
        }).eq('id', editingItem.id);
        if (error) throw error;
        toast.success('Item updated');
      } else {
        const { data: codeData } = await supabase.rpc('generate_item_code');
        const { error } = await supabase.from('inventory_items').insert({
          item_code: codeData as string, name: form.name, description: form.description || null,
          category_id: form.category_id || null, unit_of_measure: form.unit_of_measure,
          min_stock_level: form.min_stock_level, max_stock_level: form.max_stock_level,
          reorder_level: form.reorder_level, item_type: form.item_type,
          barcode: form.barcode || null, cost_price: form.cost_price,
        });
        if (error) throw error;
        toast.success('Item created');
      }
      setDialogOpen(false);
      resetForm();
      fetchItems();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setForm({ name: '', description: '', category_id: '', unit_of_measure: 'Piece', min_stock_level: 0, max_stock_level: 1000, reorder_level: 10, item_type: 'consumable', barcode: '', cost_price: 0 });
  };

  const editItem = (item: Item) => {
    setEditingItem(item);
    setForm({
      name: item.name, description: item.description || '', category_id: item.category_id || '',
      unit_of_measure: item.unit_of_measure, min_stock_level: item.min_stock_level,
      max_stock_level: item.max_stock_level, reorder_level: item.reorder_level,
      item_type: item.item_type, barcode: item.barcode || '', cost_price: item.cost_price,
    });
    setDialogOpen(true);
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from('inventory_items').update({ is_active: false }).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Item deactivated'); fetchItems(); }
  };

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.item_code.toLowerCase().includes(search.toLowerCase()));

  return (
    <ProtectedPage moduleCode="inventory.items" title="Item Master">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Item Master</h1>
            <p className="text-muted-foreground">Manage inventory items</p>
          </div>
          <ActionButton moduleCode="inventory.items" action="add">
            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />Add Item</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Item Name *</Label>
                    <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Item Type</Label>
                    <Select value={form.item_type} onValueChange={v => setForm({...form, item_type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="consumable">Consumable</SelectItem>
                        <SelectItem value="asset">Asset</SelectItem>
                        <SelectItem value="service">Service</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={form.category_id} onValueChange={v => setForm({...form, category_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Unit of Measure</Label>
                    <Select value={form.unit_of_measure} onValueChange={v => setForm({...form, unit_of_measure: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Piece', 'Box', 'Carton', 'Kg', 'Litre', 'Metre', 'Ream', 'Pack', 'Set', 'Roll'].map(u =>
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Cost Price</Label>
                    <Input type="number" value={form.cost_price} onChange={e => setForm({...form, cost_price: +e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Barcode</Label>
                    <Input value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Min Stock Level</Label>
                    <Input type="number" value={form.min_stock_level} onChange={e => setForm({...form, min_stock_level: +e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Stock Level</Label>
                    <Input type="number" value={form.max_stock_level} onChange={e => setForm({...form, max_stock_level: +e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Reorder Level</Label>
                    <Input type="number" value={form.reorder_level} onChange={e => setForm({...form, reorder_level: +e.target.value})} />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Description</Label>
                    <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
                  <Button onClick={handleSubmit} disabled={!form.name}>{editingItem ? 'Update' : 'Create'}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </ActionButton>
        </div>

        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>UoM</TableHead>
                  <TableHead>Cost Price</TableHead>
                  <TableHead>Reorder Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8">No items found</TableCell></TableRow>
                ) : filtered.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">{item.item_code}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell><Badge variant="outline">{item.item_type}</Badge></TableCell>
                    <TableCell>{item.unit_of_measure}</TableCell>
                    <TableCell>{item.cost_price.toLocaleString()}</TableCell>
                    <TableCell>{item.reorder_level}</TableCell>
                    <TableCell><Badge variant={item.is_active ? 'default' : 'secondary'}>{item.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <ActionButton moduleCode="inventory.items" action="edit">
                          <Button size="icon" variant="ghost" onClick={() => editItem(item)}><Edit className="h-4 w-4" /></Button>
                        </ActionButton>
                        <ActionButton moduleCode="inventory.items" action="delete">
                          <Button size="icon" variant="ghost" onClick={() => deleteItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                        </ActionButton>
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
