import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface SubGroup {
  id: string;
  name: string;
  description: string | null;
  group_id: string | null;
  group_name?: string;
}

interface AccountGroup {
  id: string;
  name: string;
}

export default function SubGroups() {
  const { isAdmin } = useAuth();
  const [subGroups, setSubGroups] = useState<SubGroup[]>([]);
  const [groups, setGroups] = useState<AccountGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SubGroup | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', group_id: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [subRes, groupRes] = await Promise.all([
      supabase.from('account_sub_groups').select('*').order('name'),
      supabase.from('account_groups').select('id, name').order('name'),
    ]);
    
    if (subRes.data && groupRes.data) {
      const enriched = subRes.data.map(sg => ({
        ...sg,
        group_name: groupRes.data.find(g => g.id === sg.group_id)?.name,
      }));
      setSubGroups(enriched);
    }
    if (groupRes.data) setGroups(groupRes.data);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    const payload = {
      name: formData.name,
      description: formData.description || null,
      group_id: formData.group_id || null,
    };

    if (editingItem) {
      const { error } = await supabase.from('account_sub_groups').update(payload).eq('id', editingItem.id);
      if (error) { toast.error('Failed to update'); return; }
      toast.success('Sub-group updated');
    } else {
      const { error } = await supabase.from('account_sub_groups').insert(payload);
      if (error) { toast.error('Failed to create'); return; }
      toast.success('Sub-group created');
    }
    
    setDialogOpen(false);
    setEditingItem(null);
    setFormData({ name: '', description: '', group_id: '' });
    fetchData();
  };

  const handleEdit = (item: SubGroup) => {
    setEditingItem(item);
    setFormData({ name: item.name, description: item.description || '', group_id: item.group_id || '' });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this sub-group?')) return;
    const { error } = await supabase.from('account_sub_groups').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Sub-group deleted');
    fetchData();
  };

  if (!isAdmin) {
    return <div className="p-6"><p className="text-muted-foreground">Access denied.</p></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Account Sub-Groups</h1>
          <p className="text-muted-foreground">Manage account sub-group classifications</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingItem(null); setFormData({ name: '', description: '', group_id: '' }); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Sub-Group</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit' : 'Add'} Sub-Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Cash & Cash Equivalents" />
              </div>
              <div className="space-y-2">
                <Label>Parent Group</Label>
                <Select value={formData.group_id} onValueChange={(v) => setFormData({ ...formData, group_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Description" />
              </div>
              <Button onClick={handleSubmit} className="w-full">{editingItem ? 'Update' : 'Create'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Sub-Groups</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Parent Group</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subGroups.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No sub-groups found</TableCell></TableRow>
                ) : (
                  subGroups.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.group_name || '-'}</TableCell>
                      <TableCell>{item.description || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
