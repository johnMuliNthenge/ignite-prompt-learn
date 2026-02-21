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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, Loader2, Link } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentMode {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  can_receive: boolean;
  can_pay: boolean;
  asset_account_id: string | null;
  asset_account?: {
    account_code: string;
    account_name: string;
  } | null;
}

interface AssetAccount {
  id: string;
  account_code: string;
  account_name: string;
}

const defaultForm = { name: '', description: '', is_active: true, can_receive: true, can_pay: true, asset_account_id: '' };

export default function PaymentModes() {
  const { isAdmin } = useAuth();
  const [modes, setModes] = useState<PaymentMode[]>([]);
  const [assetAccounts, setAssetAccounts] = useState<AssetAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PaymentMode | null>(null);
  const [formData, setFormData] = useState(defaultForm);

  useEffect(() => {
    fetchData();
    fetchAssetAccounts();
  }, []);

  const fetchAssetAccounts = async () => {
    const { data } = await supabase
      .from('chart_of_accounts')
      .select('id, account_code, account_name')
      .eq('account_type', 'Asset')
      .eq('is_active', true)
      .order('account_code');
    setAssetAccounts(data || []);
  };

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('payment_modes')
      .select(`
        id, name, description, is_active, can_receive, can_pay, asset_account_id,
        asset_account:asset_account_id ( account_code, account_name )
      `)
      .order('name');
    if (data) setModes(data as any);
    setLoading(false);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setFormData(defaultForm);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!formData.asset_account_id) {
      toast.error('Linked Asset Account is required — every payment mode must have an asset ledger account');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      description: formData.description || null,
      is_active: formData.is_active,
      can_receive: formData.can_receive,
      can_pay: formData.can_pay,
      asset_account_id: formData.asset_account_id,
    };

    if (editingItem) {
      const { error } = await supabase.from('payment_modes').update(payload).eq('id', editingItem.id);
      if (error) { toast.error('Failed to update'); return; }
      toast.success('Payment mode updated');
    } else {
      const { error } = await supabase.from('payment_modes').insert(payload);
      if (error) { toast.error('Failed to create'); return; }
      toast.success('Payment mode created');
    }

    closeDialog();
    fetchData();
  };

  const handleEdit = (item: PaymentMode) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      is_active: item.is_active !== false,
      can_receive: item.can_receive !== false,
      can_pay: item.can_pay !== false,
      asset_account_id: item.asset_account_id || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this payment mode?')) return;
    const { error } = await supabase.from('payment_modes').delete().eq('id', id);
    if (error) { toast.error('Failed to delete — may be in use'); return; }
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
          <p className="text-muted-foreground">
            Manage payment methods and their linked asset accounts for transaction posting
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Payment Mode</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit' : 'Add'} Payment Mode</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., M-Pesa, Bank Transfer, Cash"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>

              {/* KEY FIELD: Linked Asset Account */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Link className="h-3.5 w-3.5" />
                  Linked Asset Account *
                </Label>
                <Select
                  value={formData.asset_account_id || 'none'}
                  onValueChange={(v) => setFormData({ ...formData, asset_account_id: v === 'none' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select asset account..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>— Select an asset account —</SelectItem>
                    {assetAccounts.length === 0 ? (
                      <SelectItem value="__empty__" disabled>No active Asset accounts found</SelectItem>
                    ) : (
                      assetAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.account_code} — {acc.account_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  This determines the debit/credit leg of the asset account during transaction posting.
                  Only Asset-type ledger accounts are shown.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                />
                <Label>Active</Label>
              </div>

              <div className="space-y-3 rounded-md border p-3">
                <Label className="text-sm font-semibold">Transaction Usage</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.can_receive}
                    onCheckedChange={(v) => setFormData({ ...formData, can_receive: v })}
                  />
                  <Label className="text-sm">Can be used to receive payments (Receivables)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.can_pay}
                    onCheckedChange={(v) => setFormData({ ...formData, can_pay: v })}
                  />
                  <Label className="text-sm">Can be used to make payments (Payables)</Label>
                </div>
              </div>

              <Button onClick={handleSubmit} className="w-full">
                {editingItem ? 'Update' : 'Create'} Payment Mode
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info banner */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm text-foreground">
          <strong>Accounting Rule:</strong> Every payment mode must be linked to an Asset account (e.g. Bank — KCB, Petty Cash, M-Pesa Float).
          When a payment is received, the system <em>Debits</em> the linked asset account.
          When a payment is made, the system <em>Credits</em> it. No transaction can be posted without a valid payment mode.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Payment Modes ({modes.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Linked Asset Account</TableHead>
                  <TableHead>Receive</TableHead>
                  <TableHead>Pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No payment modes found. Add one to enable transaction posting.
                    </TableCell>
                  </TableRow>
                ) : (
                  modes.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground">{item.description || '—'}</TableCell>
                      <TableCell>
                        {item.asset_account ? (
                          <div>
                            <span className="font-mono text-xs text-muted-foreground">
                              {(item.asset_account as any).account_code}
                            </span>
                            <div className="text-sm">{(item.asset_account as any).account_name}</div>
                          </div>
                        ) : (
                          <Badge variant="destructive" className="text-xs">⚠ Not Linked</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.can_receive ? <Badge variant="default" className="text-xs">Yes</Badge> : <Badge variant="secondary" className="text-xs">No</Badge>}
                      </TableCell>
                      <TableCell>
                        {item.can_pay ? <Badge variant="default" className="text-xs">Yes</Badge> : <Badge variant="secondary" className="text-xs">No</Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-4 w-4" />
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
