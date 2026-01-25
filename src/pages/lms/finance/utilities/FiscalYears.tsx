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
import { Plus, Pencil, Lock, Unlock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface FiscalYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_closed: boolean;
}

export default function FiscalYears() {
  const { isAdmin } = useAuth();
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FiscalYear | null>(null);
  const [formData, setFormData] = useState({ name: '', start_date: '', end_date: '', is_active: false });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from('fiscal_years').select('*').order('start_date', { ascending: false });
    if (data) setFiscalYears(data);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.start_date || !formData.end_date) {
      toast.error('All fields are required');
      return;
    }

    if (new Date(formData.end_date) <= new Date(formData.start_date)) {
      toast.error('End date must be after start date');
      return;
    }

    const payload = {
      name: formData.name,
      start_date: formData.start_date,
      end_date: formData.end_date,
      is_active: formData.is_active,
    };

    // If setting as active, deactivate others first
    if (formData.is_active) {
      await supabase.from('fiscal_years').update({ is_active: false }).neq('id', editingItem?.id || '');
    }

    if (editingItem) {
      const { error } = await supabase.from('fiscal_years').update(payload).eq('id', editingItem.id);
      if (error) { toast.error('Failed to update'); return; }
      toast.success('Fiscal year updated');
    } else {
      const { error } = await supabase.from('fiscal_years').insert(payload);
      if (error) { toast.error('Failed to create'); return; }
      toast.success('Fiscal year created');
    }
    
    setDialogOpen(false);
    setEditingItem(null);
    setFormData({ name: '', start_date: '', end_date: '', is_active: false });
    fetchData();
  };

  const handleEdit = (item: FiscalYear) => {
    if (item.is_closed) {
      toast.error('Cannot edit a closed fiscal year');
      return;
    }
    setEditingItem(item);
    setFormData({ 
      name: item.name, 
      start_date: item.start_date, 
      end_date: item.end_date,
      is_active: item.is_active || false,
    });
    setDialogOpen(true);
  };

  const handleToggleClosed = async (item: FiscalYear) => {
    if (!item.is_closed) {
      if (!confirm('Are you sure you want to CLOSE this fiscal year? This will lock all transactions.')) return;
    }
    
    const { error } = await supabase.from('fiscal_years').update({ is_closed: !item.is_closed }).eq('id', item.id);
    if (error) { toast.error('Failed to update'); return; }
    toast.success(item.is_closed ? 'Fiscal year reopened' : 'Fiscal year closed');
    fetchData();
  };

  if (!isAdmin) {
    return <div className="p-6"><p className="text-muted-foreground">Access denied.</p></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Fiscal Years</h1>
          <p className="text-muted-foreground">Manage financial reporting periods</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingItem(null); setFormData({ name: '', start_date: '', end_date: '', is_active: false }); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Fiscal Year</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit' : 'Add'} Fiscal Year</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., FY 2025" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>End Date *</Label>
                  <Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
                <Label>Set as Active Fiscal Year</Label>
              </div>
              <Button onClick={handleSubmit} className="w-full">{editingItem ? 'Update' : 'Create'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Fiscal Years</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fiscalYears.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No fiscal years found</TableCell></TableRow>
                ) : (
                  fiscalYears.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{format(new Date(item.start_date), 'dd MMM yyyy')}</TableCell>
                      <TableCell>{format(new Date(item.end_date), 'dd MMM yyyy')}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {item.is_active && <Badge className="bg-green-500">Active</Badge>}
                          {item.is_closed && <Badge variant="secondary">Closed</Badge>}
                          {!item.is_active && !item.is_closed && <Badge variant="outline">Open</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} disabled={item.is_closed}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleToggleClosed(item)} title={item.is_closed ? 'Reopen' : 'Close'}>
                            {item.is_closed ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                          </Button>
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
