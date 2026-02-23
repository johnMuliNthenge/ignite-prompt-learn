import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Shield } from 'lucide-react';

const StatutoryDeductions = () => {
  const [configs, setConfigs] = useState<any[]>([]);
  const [bands, setBands] = useState<any[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showBandDialog, setShowBandDialog] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const [editingBand, setEditingBand] = useState<any>(null);
  const [configForm, setConfigForm] = useState({ name: '', deduction_type: 'tax', is_active: true, effective_from: new Date().toISOString().split('T')[0], effective_to: '', account_id: '' });
  const [bandForm, setBandForm] = useState({ lower_limit: 0, upper_limit: '', rate: 0, fixed_amount: 0, sort_order: 0 });

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (selectedConfig) fetchBands(selectedConfig.id); }, [selectedConfig]);

  const fetchData = async () => {
    setLoading(true);
    const [cfgRes, accRes] = await Promise.all([
      supabase.from('statutory_deduction_configs').select('*').order('name'),
      supabase.from('chart_of_accounts').select('id, account_code, account_name').eq('account_type', 'Liability').eq('is_active', true).order('account_code'),
    ]);
    setConfigs(cfgRes.data || []);
    setAccounts(accRes.data || []);
    setLoading(false);
  };

  const fetchBands = async (configId: string) => {
    const { data } = await supabase.from('payroll_tax_bands').select('*').eq('statutory_config_id', configId).order('sort_order');
    setBands(data || []);
  };

  const handleSaveConfig = async () => {
    try {
      const payload = { ...configForm, effective_to: configForm.effective_to || null, account_id: configForm.account_id || null };
      if (editingConfig) {
        const { error } = await supabase.from('statutory_deduction_configs').update(payload).eq('id', editingConfig.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('statutory_deduction_configs').insert(payload);
        if (error) throw error;
      }
      toast.success('Statutory deduction saved');
      setShowConfigDialog(false);
      setEditingConfig(null);
      fetchData();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleSaveBand = async () => {
    try {
      const payload = { statutory_config_id: selectedConfig.id, lower_limit: Number(bandForm.lower_limit), upper_limit: bandForm.upper_limit ? Number(bandForm.upper_limit) : null, rate: Number(bandForm.rate), fixed_amount: Number(bandForm.fixed_amount), sort_order: Number(bandForm.sort_order) };
      if (editingBand) {
        const { error } = await supabase.from('payroll_tax_bands').update(payload).eq('id', editingBand.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('payroll_tax_bands').insert(payload);
        if (error) throw error;
      }
      toast.success('Tax band saved');
      setShowBandDialog(false);
      setEditingBand(null);
      fetchBands(selectedConfig.id);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDeleteBand = async (id: string) => {
    if (!confirm('Delete this band?')) return;
    await supabase.from('payroll_tax_bands').delete().eq('id', id);
    toast.success('Band deleted');
    fetchBands(selectedConfig.id);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Shield className="h-6 w-6" /><h1 className="text-2xl font-bold">Statutory Deductions</h1></div>
        <Button onClick={() => { setEditingConfig(null); setConfigForm({ name: '', deduction_type: 'tax', is_active: true, effective_from: new Date().toISOString().split('T')[0], effective_to: '', account_id: '' }); setShowConfigDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" />Add Deduction
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle>Deduction Types</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {loading ? <p>Loading...</p> : configs.length === 0 ? <p className="text-muted-foreground">No statutory deductions configured</p> :
              configs.map(c => (
                <div key={c.id} className={`p-3 rounded-lg border cursor-pointer ${selectedConfig?.id === c.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted'}`} onClick={() => setSelectedConfig(c)}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.deduction_type} • From: {c.effective_from}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant={c.is_active ? 'default' : 'secondary'}>{c.is_active ? 'Active' : 'Inactive'}</Badge>
                      <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); setEditingConfig(c); setConfigForm({ name: c.name, deduction_type: c.deduction_type, is_active: c.is_active, effective_from: c.effective_from, effective_to: c.effective_to || '', account_id: c.account_id || '' }); setShowConfigDialog(true); }}><Edit className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>
              ))
            }
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{selectedConfig ? `Tax Bands: ${selectedConfig.name}` : 'Select a Deduction Type'}</CardTitle>
            {selectedConfig && <Button size="sm" onClick={() => { setEditingBand(null); setBandForm({ lower_limit: 0, upper_limit: '', rate: 0, fixed_amount: 0, sort_order: bands.length }); setShowBandDialog(true); }}><Plus className="h-4 w-4 mr-2" />Add Band</Button>}
          </CardHeader>
          <CardContent>
            {!selectedConfig ? <p className="text-muted-foreground">Select a deduction to configure bands/rates</p> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lower Limit</TableHead>
                    <TableHead>Upper Limit</TableHead>
                    <TableHead>Rate (%)</TableHead>
                    <TableHead>Fixed Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bands.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No bands configured</TableCell></TableRow> :
                    bands.map(b => (
                      <TableRow key={b.id}>
                        <TableCell>{b.lower_limit?.toLocaleString()}</TableCell>
                        <TableCell>{b.upper_limit ? b.upper_limit.toLocaleString() : 'Unlimited'}</TableCell>
                        <TableCell>{(b.rate * 100).toFixed(2)}%</TableCell>
                        <TableCell>{b.fixed_amount?.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => { setEditingBand(b); setBandForm({ lower_limit: b.lower_limit, upper_limit: b.upper_limit?.toString() || '', rate: b.rate, fixed_amount: b.fixed_amount || 0, sort_order: b.sort_order || 0 }); setShowBandDialog(true); }}><Edit className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDeleteBand(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Config Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={v => { setShowConfigDialog(v); if (!v) setEditingConfig(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingConfig ? 'Edit' : 'Add'} Statutory Deduction</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={configForm.name} onChange={e => setConfigForm({...configForm, name: e.target.value})} placeholder="e.g. PAYE, NHIF, NSSF" /></div>
            <div>
              <Label>Type</Label>
              <Select value={configForm.deduction_type} onValueChange={v => setConfigForm({...configForm, deduction_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tax">Tax (PAYE)</SelectItem>
                  <SelectItem value="pension">Pension</SelectItem>
                  <SelectItem value="social_security">Social Security</SelectItem>
                  <SelectItem value="health_insurance">Health Insurance</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Effective From</Label><Input type="date" value={configForm.effective_from} onChange={e => setConfigForm({...configForm, effective_from: e.target.value})} /></div>
              <div><Label>Effective To (optional)</Label><Input type="date" value={configForm.effective_to} onChange={e => setConfigForm({...configForm, effective_to: e.target.value})} /></div>
            </div>
            <div>
              <Label>Liability Account</Label>
              <Select value={configForm.account_id} onValueChange={v => setConfigForm({...configForm, account_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.account_code} - {a.account_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2"><Label>Active</Label><Switch checked={configForm.is_active} onCheckedChange={v => setConfigForm({...configForm, is_active: v})} /></div>
          </div>
          <DialogFooter><Button onClick={handleSaveConfig}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Band Dialog */}
      <Dialog open={showBandDialog} onOpenChange={v => { setShowBandDialog(v); if (!v) setEditingBand(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingBand ? 'Edit' : 'Add'} Tax Band</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Lower Limit</Label><Input type="number" value={bandForm.lower_limit} onChange={e => setBandForm({...bandForm, lower_limit: Number(e.target.value)})} /></div>
              <div><Label>Upper Limit (blank=unlimited)</Label><Input type="number" value={bandForm.upper_limit} onChange={e => setBandForm({...bandForm, upper_limit: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Rate (decimal, e.g. 0.10 = 10%)</Label><Input type="number" step="0.0001" value={bandForm.rate} onChange={e => setBandForm({...bandForm, rate: Number(e.target.value)})} /></div>
              <div><Label>Fixed Amount</Label><Input type="number" value={bandForm.fixed_amount} onChange={e => setBandForm({...bandForm, fixed_amount: Number(e.target.value)})} /></div>
            </div>
            <div><Label>Sort Order</Label><Input type="number" value={bandForm.sort_order} onChange={e => setBandForm({...bandForm, sort_order: Number(e.target.value)})} /></div>
          </div>
          <DialogFooter><Button onClick={handleSaveBand}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StatutoryDeductions;
