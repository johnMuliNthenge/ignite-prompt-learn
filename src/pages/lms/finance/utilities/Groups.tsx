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

interface AccountGroup {
  id: string;
  name: string;
  description: string | null;
  account_type: string;
}

const ACCOUNT_TYPES = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];

export default function Groups() {
  const { isAdmin } = useAuth();
  const [groups, setGroups] = useState<AccountGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AccountGroup | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', account_type: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('account_groups').select('*').order('name');
    if (data) setGroups(data);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.account_type) {
      toast.error('Name and Account Type are required');
      return;
    }

    const payload = {
      name: formData.name,
      description: formData.description || null,
      account_type: formData.account_type,
    };

    if (editingItem) {
      const { error } = await supabase.from('account_groups').update(payload).eq('id', editingItem.id);
      if (error) { toast.error('Failed to update'); return; }
      toast.success('Group updated');
    } else {
      const { error } = await supabase.from('account_groups').insert(payload);
      if (error) { toast.error('Failed to create'); return; }
      toast.success('Group created');
    }
    
    setDialogOpen(false);
    setEditingItem(null);
    setFormData({ name: '', description: '', account_type: '' });
    fetchData();
  };

  const handleEdit = (item: AccountGroup) => {
    setEditingItem(item);
    setFormData({ name: item.name, description: item.description || '', account_type: item.account_type });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this group?')) return;
    const { error } = await supabase.from('account_groups').delete().eq('id', id);
    if (error) { toast.error('Failed to delete - may have sub-groups attached'); return; }
    toast.success('Group deleted');
    fetchData();
  };

  if (!isAdmin) {
    return <div className="p-6"><p className="text-muted-foreground">Access denied.</p></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Account Groups</h1>
          <p className="text-muted-foreground">Manage account group classifications</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingItem(null); setFormData({ name: '', description: '', account_type: '' }); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Group</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit' : 'Add'} Account Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Current Assets" />
              </div>
              <div className="space-y-2">
                <Label>Account Type *</Label>
                <Select value={formData.account_type} onValueChange={(v) => setFormData({ ...formData, account_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
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
        <CardHeader><CardTitle>Account Groups</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Account Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No groups found</TableCell></TableRow>
                ) : (
                  groups.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.account_type}</TableCell>
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
