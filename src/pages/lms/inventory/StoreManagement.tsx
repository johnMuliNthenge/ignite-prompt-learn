import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProtectedPage, ActionButton } from '@/components/auth/ProtectedPage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Warehouse } from 'lucide-react';
import { toast } from 'sonner';

export default function StoreManagement() {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', location: '', store_category: 'main' });

  useEffect(() => { fetchStores(); }, []);

  const fetchStores = async () => {
    const { data } = await supabase.from('inventory_stores').select('*').order('name');
    setStores((data as any[]) || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    try {
      if (editing) {
        const { error } = await supabase.from('inventory_stores').update(form).eq('id', editing.id);
        if (error) throw error;
        toast.success('Store updated');
      } else {
        const { error } = await supabase.from('inventory_stores').insert(form);
        if (error) throw error;
        toast.success('Store created');
      }
      setDialogOpen(false); setEditing(null); setForm({ name: '', location: '', store_category: 'main' });
      fetchStores();
    } catch (err: any) { toast.error(err.message); }
  };

  const editStore = (s: any) => {
    setEditing(s);
    setForm({ name: s.name, location: s.location || '', store_category: s.store_category });
    setDialogOpen(true);
  };

  return (
    <ProtectedPage moduleCode="inventory.stores" title="Store Management">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Store Management</h1>
            <p className="text-muted-foreground">Manage stores and warehouses</p>
          </div>
          <ActionButton moduleCode="inventory.stores" action="add">
            <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) { setEditing(null); setForm({ name: '', location: '', store_category: 'main' }); } }}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Store</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editing ? 'Edit Store' : 'Add Store'}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>Store Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Location</Label><Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={form.store_category} onValueChange={v => setForm({...form, store_category: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="main">Main Store</SelectItem>
                        <SelectItem value="department">Department Store</SelectItem>
                        <SelectItem value="library">Library Store</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSubmit} disabled={!form.name}>{editing ? 'Update' : 'Create'}</Button>
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
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow> :
                stores.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8">No stores found</TableCell></TableRow> :
                stores.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.location || '-'}</TableCell>
                    <TableCell><Badge variant="outline">{s.store_category}</Badge></TableCell>
                    <TableCell><Badge variant={s.is_active ? 'default' : 'secondary'}>{s.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => editStore(s)}><Edit className="h-4 w-4" /></Button>
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
