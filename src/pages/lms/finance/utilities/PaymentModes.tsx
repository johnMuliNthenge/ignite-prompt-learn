import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentMode {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export default function PaymentModes() {
  const { isAdmin } = useAuth();
  const [modes, setModes] = useState<PaymentMode[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PaymentMode | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', is_active: true });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from('payment_modes').select('*').order('name');
    if (data) setModes(data);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    const payload = { ...formData, description: formData.description || null };

    if (editingItem) {
      const { error } = await supabase.from('payment_modes').update(payload).eq('id', editingItem.id);
      if (error) { toast.error('Failed to update'); return; }
      toast.success('Payment mode updated');
    } else {
      const { error } = await supabase.from('payment_modes').insert(payload);
      if (error) { toast.error('Failed to create'); return; }
      toast.success('Payment mode created');
    }
    
    setDialogOpen(false);
    setEditingItem(null);
    setFormData({ name: '', description: '', is_active: true });
    fetchData();
  };

  const handleEdit = (item: PaymentMode) => {
    setEditingItem(item);
    setFormData({ name: item.name, description: item.description || '', is_active: item.is_active !== false });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this payment mode?')) return;
    const { error } = await supabase.from('payment_modes').delete().eq('id', id);
    if (error) { toast.error('Failed to delete - may be in use'); return; }
    toast.success('Payment mode deleted');
    fetchData();
  };

  if (!isAdmin) {
    return <div className="p-6"><p className="text-muted-foreground">Access denied.</p></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Payment Modes</h1>
          <p className="text-muted-foreground">Manage available payment methods</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingItem(null); setFormData({ name: '', description: '', is_active: true }); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Payment Mode</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit' : 'Add'} Payment Mode</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., M-Pesa, Bank Transfer" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Description" />
              </div>
              <div className="flex items-center space-x-2">
                <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
                <Label>Active</Label>
              </div>
              <Button onClick={handleSubmit} className="w-full">{editingItem ? 'Update' : 'Create'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Payment Modes</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modes.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No payment modes found</TableCell></TableRow>
                ) : (
                  modes.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.description || '-'}</TableCell>
                      <TableCell>
                        {item.is_active ? <Badge className="bg-green-500">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                      </TableCell>
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
