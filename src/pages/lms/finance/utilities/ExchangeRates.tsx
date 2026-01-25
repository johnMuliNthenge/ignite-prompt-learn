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
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ExchangeRate {
  id: string;
  from_currency_id: string | null;
  to_currency_id: string | null;
  rate: number;
  effective_date: string;
  from_currency?: string;
  to_currency?: string;
}

interface Currency {
  id: string;
  code: string;
  name: string;
}

export default function ExchangeRates() {
  const { isAdmin } = useAuth();
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ from_currency_id: '', to_currency_id: '', rate: '', effective_date: format(new Date(), 'yyyy-MM-dd') });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [ratesRes, currRes] = await Promise.all([
      supabase.from('exchange_rates').select('*').order('effective_date', { ascending: false }),
      supabase.from('currencies').select('id, code, name').eq('is_active', true).order('code'),
    ]);
    
    if (ratesRes.data && currRes.data) {
      const enriched = ratesRes.data.map(r => ({
        ...r,
        from_currency: currRes.data.find(c => c.id === r.from_currency_id)?.code,
        to_currency: currRes.data.find(c => c.id === r.to_currency_id)?.code,
      }));
      setRates(enriched);
    }
    if (currRes.data) setCurrencies(currRes.data);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.from_currency_id || !formData.to_currency_id || !formData.rate || !formData.effective_date) {
      toast.error('All fields are required');
      return;
    }

    if (formData.from_currency_id === formData.to_currency_id) {
      toast.error('From and To currencies must be different');
      return;
    }

    const { error } = await supabase.from('exchange_rates').insert({
      from_currency_id: formData.from_currency_id,
      to_currency_id: formData.to_currency_id,
      rate: parseFloat(formData.rate),
      effective_date: formData.effective_date,
    });

    if (error) { toast.error('Failed to create'); return; }
    toast.success('Exchange rate created');
    
    setDialogOpen(false);
    setFormData({ from_currency_id: '', to_currency_id: '', rate: '', effective_date: format(new Date(), 'yyyy-MM-dd') });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this exchange rate?')) return;
    const { error } = await supabase.from('exchange_rates').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Exchange rate deleted');
    fetchData();
  };

  if (!isAdmin) {
    return <div className="p-6"><p className="text-muted-foreground">Access denied.</p></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Exchange Rates</h1>
          <p className="text-muted-foreground">Manage currency exchange rates</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setFormData({ from_currency_id: '', to_currency_id: '', rate: '', effective_date: format(new Date(), 'yyyy-MM-dd') }); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Exchange Rate</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Exchange Rate</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From Currency *</Label>
                  <Select value={formData.from_currency_id} onValueChange={(v) => setFormData({ ...formData, from_currency_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>To Currency *</Label>
                  <Select value={formData.to_currency_id} onValueChange={(v) => setFormData({ ...formData, to_currency_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Rate *</Label>
                  <Input type="number" step="0.0001" value={formData.rate} onChange={(e) => setFormData({ ...formData, rate: e.target.value })} placeholder="1.0000" />
                </div>
                <div className="space-y-2">
                  <Label>Effective Date *</Label>
                  <Input type="date" value={formData.effective_date} onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })} />
                </div>
              </div>
              <Button onClick={handleSubmit} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Exchange Rates History</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No exchange rates found</TableCell></TableRow>
                ) : (
                  rates.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">{item.from_currency || '-'}</TableCell>
                      <TableCell className="font-mono">{item.to_currency || '-'}</TableCell>
                      <TableCell className="text-right font-mono">{Number(item.rate).toFixed(4)}</TableCell>
                      <TableCell>{format(new Date(item.effective_date), 'dd MMM yyyy')}</TableCell>
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
