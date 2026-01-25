import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ImprestLimit {
  id: string;
  cash_account_id: string | null;
  limit_amount: number;
  effective_date: string;
  is_active: boolean;
  cash_account_name?: string;
}

interface CashAccount {
  id: string;
  name: string;
  is_petty_cash: boolean;
}

export default function ImprestLimits() {
  const { isAdmin } = useAuth();
  const [limits, setLimits] = useState<ImprestLimit[]>([]);
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ cash_account_id: '', limit_amount: '', effective_date: format(new Date(), 'yyyy-MM-dd') });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [limitsRes, cashRes] = await Promise.all([
      supabase.from('imprest_limits').select('*').order('effective_date', { ascending: false }),
      supabase.from('cash_accounts').select('id, name, is_petty_cash').eq('is_petty_cash', true).eq('is_active', true),
    ]);
    
    if (limitsRes.data && cashRes.data) {
      const enriched = limitsRes.data.map(l => ({
        ...l,
        cash_account_name: cashRes.data.find(c => c.id === l.cash_account_id)?.name,
      }));
      setLimits(enriched);
    }
    if (cashRes.data) setCashAccounts(cashRes.data);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.cash_account_id || !formData.limit_amount || !formData.effective_date) {
      toast.error('All fields are required');
      return;
    }

    // Deactivate previous limits for this cash account
    await supabase.from('imprest_limits').update({ is_active: false }).eq('cash_account_id', formData.cash_account_id);

    const { error } = await supabase.from('imprest_limits').insert({
      cash_account_id: formData.cash_account_id,
      limit_amount: parseFloat(formData.limit_amount),
      effective_date: formData.effective_date,
      is_active: true,
    });

    if (error) { toast.error('Failed to create'); return; }
    toast.success('Imprest limit set');
    
    // Also update the cash account's imprest_limit field
    await supabase.from('cash_accounts').update({ imprest_limit: parseFloat(formData.limit_amount) }).eq('id', formData.cash_account_id);
    
    setDialogOpen(false);
    setFormData({ cash_account_id: '', limit_amount: '', effective_date: format(new Date(), 'yyyy-MM-dd') });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this imprest limit record?')) return;
    const { error } = await supabase.from('imprest_limits').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Imprest limit deleted');
    fetchData();
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);

  if (!isAdmin) {
    return <div className="p-6"><p className="text-muted-foreground">Access denied.</p></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Imprest Limit Setup</h1>
          <p className="text-muted-foreground">Set petty cash imprest limits for auto-reconciliation</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setFormData({ cash_account_id: '', limit_amount: '', effective_date: format(new Date(), 'yyyy-MM-dd') }); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Set Imprest Limit</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Imprest Limit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Petty Cash Account *</Label>
                <Select value={formData.cash_account_id} onValueChange={(v) => setFormData({ ...formData, cash_account_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select petty cash account" /></SelectTrigger>
                  <SelectContent>
                    {cashAccounts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Limit Amount (KES) *</Label>
                  <Input type="number" value={formData.limit_amount} onChange={(e) => setFormData({ ...formData, limit_amount: e.target.value })} placeholder="50000" />
                </div>
                <div className="space-y-2">
                  <Label>Effective Date *</Label>
                  <Input type="date" value={formData.effective_date} onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })} />
                </div>
              </div>
              <Button onClick={handleSubmit} className="w-full">Set Limit</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {cashAccounts.length === 0 && !loading && (
        <Card className="border-yellow-500">
          <CardContent className="pt-6">
            <p className="text-yellow-600">No petty cash accounts found. Please create a petty cash account in Cash & Bank Management first.</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Imprest Limits History</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cash Account</TableHead>
                  <TableHead className="text-right">Limit Amount</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {limits.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No imprest limits found</TableCell></TableRow>
                ) : (
                  limits.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.cash_account_name || '-'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.limit_amount)}</TableCell>
                      <TableCell>{format(new Date(item.effective_date), 'dd MMM yyyy')}</TableCell>
                      <TableCell>
                        {item.is_active ? <Badge className="bg-green-500">Active</Badge> : <Badge variant="secondary">Superseded</Badge>}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4" /></Button>
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
