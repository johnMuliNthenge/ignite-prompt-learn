import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function InventoryCategoryManagement() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', description: '', is_active: true });

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    const { data } = await supabase.from('inventory_categories').select('*').order('name');
    setCategories((data as any[]) || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    try {
      if (editing) {
        const { error } = await supabase.from('inventory_categories').update({
          name: form.name, description: form.description || null, is_active: form.is_active,
        }).eq('id', editing.id);
        if (error) throw error;
        toast.success('Category updated');
      } else {
        const { error } = await supabase.from('inventory_categories').insert({
          name: form.name, description: form.description || null, is_active: form.is_active,
        });
        if (error) throw error;
        toast.success('Category created');
      }
      setDialogOpen(false); resetForm(); fetchCategories();
    } catch (err: any) { toast.error(err.message); }
  };

  const resetForm = () => { setEditing(null); setForm({ name: '', description: '', is_active: true }); };

  const editCategory = (c: any) => {
    setEditing(c);
    setForm({ name: c.name, description: c.description || '', is_active: c.is_active });
    setDialogOpen(true);
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    const { error } = await supabase.from('inventory_categories').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Category deleted'); fetchCategories(); }
  };

  return (
    <ProtectedPage moduleCode="inventory.categories" title="Inventory Categories">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">Inventory Categories</h1><p className="text-muted-foreground">Organize inventory items into categories</p></div>
          <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Category</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? 'Edit Category' : 'Add Category'}</DialogTitle>
                <DialogDescription>{editing ? 'Update category details' : 'Create a new inventory category'}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
                <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={form.is_active} onCheckedChange={v => setForm({...form, is_active: v})} /></div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={!form.name}>{editing ? 'Update' : 'Create'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow> :
              categories.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8">No categories</TableCell></TableRow> :
              categories.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.description || '-'}</TableCell>
                  <TableCell><Badge variant={c.is_active ? 'default' : 'secondary'}>{c.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => editCategory(c)}><Edit className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteCategory(c.id)}><Trash2 className="h-4 w-4" /></Button>
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
