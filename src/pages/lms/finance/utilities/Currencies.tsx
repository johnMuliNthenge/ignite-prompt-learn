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

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  is_base: boolean;
  is_active: boolean;
}

export default function Currencies() {
  const { isAdmin } = useAuth();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Currency | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '', symbol: '', is_base: false, is_active: true });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from('currencies').select('*').order('code');
    if (data) setCurrencies(data);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.code.trim() || !formData.name.trim() || !formData.symbol.trim()) {
      toast.error('All fields are required');
      return;
    }

    // If setting as base, remove base from others first
    if (formData.is_base) {
      await supabase.from('currencies').update({ is_base: false }).neq('id', editingItem?.id || '');
    }

    const payload = { ...formData };

    if (editingItem) {
      const { error } = await supabase.from('currencies').update(payload).eq('id', editingItem.id);
      if (error) { toast.error('Failed to update'); return; }
      toast.success('Currency updated');
    } else {
      const { error } = await supabase.from('currencies').insert(payload);
      if (error) { toast.error('Failed to create - code may already exist'); return; }
      toast.success('Currency created');
    }
    
    setDialogOpen(false);
    setEditingItem(null);
    setFormData({ code: '', name: '', symbol: '', is_base: false, is_active: true });
    fetchData();
  };

  const handleEdit = (item: Currency) => {
    setEditingItem(item);
    setFormData({ code: item.code, name: item.name, symbol: item.symbol, is_base: item.is_base || false, is_active: item.is_active !== false });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this currency?')) return;
    const { error } = await supabase.from('currencies').delete().eq('id', id);
    if (error) { toast.error('Failed to delete - may be in use'); return; }
    toast.success('Currency deleted');
    fetchData();
  };

  if (!isAdmin) {
    return <div className="p-6"><p className="text-muted-foreground">Access denied.</p></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Currencies</h1>
          <p className="text-muted-foreground">Manage transaction currencies</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingItem(null); setFormData({ code: '', name: '', symbol: '', is_base: false, is_active: true }); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Currency</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit' : 'Add'} Currency</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Code *</Label>
                  <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="KES" maxLength={3} />
                </div>
                <div className="space-y-2">
                  <Label>Symbol *</Label>
                  <Input value={formData.symbol} onChange={(e) => setFormData({ ...formData, symbol: e.target.value })} placeholder="KSh" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Kenyan Shilling" />
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch checked={formData.is_base} onCheckedChange={(v) => setFormData({ ...formData, is_base: v })} />
                  <Label>Base Currency</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
                  <Label>Active</Label>
                </div>
              </div>
              <Button onClick={handleSubmit} className="w-full">{editingItem ? 'Update' : 'Create'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Currencies</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currencies.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No currencies found</TableCell></TableRow>
                ) : (
                  currencies.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono font-medium">{item.code}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.symbol}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {item.is_base && <Badge className="bg-blue-500">Base</Badge>}
                          {item.is_active ? <Badge className="bg-green-500">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} disabled={item.is_base}><Trash2 className="h-4 w-4" /></Button>
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
