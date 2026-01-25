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

interface FeeAccount {
  id: string;
  name: string;
  description: string | null;
  account_id: string | null;
  is_active: boolean;
  account_name?: string;
}

interface ChartAccount {
  id: string;
  account_code: string;
  account_name: string;
}

export default function FeeAccounts() {
  const { isAdmin } = useAuth();
  const [feeAccounts, setFeeAccounts] = useState<FeeAccount[]>([]);
  const [chartAccounts, setChartAccounts] = useState<ChartAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FeeAccount | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', account_id: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [feeRes, chartRes] = await Promise.all([
      supabase.from('fee_accounts').select('*').order('name'),
      supabase.from('chart_of_accounts').select('id, account_code, account_name').eq('is_active', true).order('account_code'),
    ]);
    
    if (feeRes.data) {
      const enriched = feeRes.data.map(fa => ({
        ...fa,
        account_name: chartRes.data?.find(c => c.id === fa.account_id)?.account_name,
      }));
      setFeeAccounts(enriched);
    }
    if (chartRes.data) setChartAccounts(chartRes.data);
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
      account_id: formData.account_id || null,
    };

    if (editingItem) {
      const { error } = await supabase.from('fee_accounts').update(payload).eq('id', editingItem.id);
      if (error) { toast.error('Failed to update'); return; }
      toast.success('Fee account updated');
    } else {
      const { error } = await supabase.from('fee_accounts').insert(payload);
      if (error) { toast.error('Failed to create'); return; }
      toast.success('Fee account created');
    }
    
    setDialogOpen(false);
    setEditingItem(null);
    setFormData({ name: '', description: '', account_id: '' });
    fetchData();
  };

  const handleEdit = (item: FeeAccount) => {
    setEditingItem(item);
    setFormData({ name: item.name, description: item.description || '', account_id: item.account_id || '' });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this fee account?')) return;
    const { error } = await supabase.from('fee_accounts').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Fee account deleted');
    fetchData();
  };

  if (!isAdmin) {
    return <div className="p-6"><p className="text-muted-foreground">Access denied.</p></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Fee Accounts</h1>
          <p className="text-muted-foreground">Manage fee account types linked to chart of accounts</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingItem(null); setFormData({ name: '', description: '', account_id: '' }); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Fee Account</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit' : 'Add'} Fee Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Tuition Fees" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Description" />
              </div>
              <div className="space-y-2">
                <Label>Linked GL Account</Label>
                <Select value={formData.account_id} onValueChange={(v) => setFormData({ ...formData, account_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {chartAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.account_code} - {acc.account_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSubmit} className="w-full">{editingItem ? 'Update' : 'Create'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Fee Accounts List</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Linked GL Account</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feeAccounts.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No fee accounts found</TableCell></TableRow>
                ) : (
                  feeAccounts.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.description || '-'}</TableCell>
                      <TableCell>{item.account_name || '-'}</TableCell>
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
