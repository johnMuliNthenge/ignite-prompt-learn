import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProtectedPage, ActionButton } from '@/components/auth/ProtectedPage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function SupplierManagement() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    name: '', contact_person: '', phone: '', email: '', address: '',
    tax_id: '', payment_terms: 'Net 30', supplier_category: '',
    bank_name: '', bank_account: '', bank_branch: '',
  });

  useEffect(() => { fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    const { data } = await supabase.from('procurement_suppliers').select('*').order('name');
    setSuppliers((data as any[]) || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    try {
      if (editing) {
        const { error } = await supabase.from('procurement_suppliers').update({
          name: form.name, contact_person: form.contact_person || null, phone: form.phone || null,
          email: form.email || null, address: form.address || null, tax_id: form.tax_id || null,
          payment_terms: form.payment_terms, supplier_category: form.supplier_category || null,
          bank_name: form.bank_name || null, bank_account: form.bank_account || null, bank_branch: form.bank_branch || null,
        }).eq('id', editing.id);
        if (error) throw error;
        toast.success('Supplier updated');
      } else {
        const { data: code } = await supabase.rpc('generate_supplier_code');
        const { error } = await supabase.from('procurement_suppliers').insert({
          supplier_code: code as string, name: form.name, contact_person: form.contact_person || null,
          phone: form.phone || null, email: form.email || null, address: form.address || null,
          tax_id: form.tax_id || null, payment_terms: form.payment_terms,
          supplier_category: form.supplier_category || null, bank_name: form.bank_name || null,
          bank_account: form.bank_account || null, bank_branch: form.bank_branch || null,
        });
        if (error) throw error;
        toast.success('Supplier created');
      }
      setDialogOpen(false); resetForm(); fetchSuppliers();
    } catch (err: any) { toast.error(err.message); }
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ name: '', contact_person: '', phone: '', email: '', address: '', tax_id: '', payment_terms: 'Net 30', supplier_category: '', bank_name: '', bank_account: '', bank_branch: '' });
  };

  const editSupplier = (s: any) => {
    setEditing(s);
    setForm({
      name: s.name, contact_person: s.contact_person || '', phone: s.phone || '', email: s.email || '',
      address: s.address || '', tax_id: s.tax_id || '', payment_terms: s.payment_terms || 'Net 30',
      supplier_category: s.supplier_category || '', bank_name: s.bank_name || '',
      bank_account: s.bank_account || '', bank_branch: s.bank_branch || '',
    });
    setDialogOpen(true);
  };

  const filtered = suppliers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.supplier_code.toLowerCase().includes(search.toLowerCase()));

  return (
    <ProtectedPage moduleCode="procurement.suppliers" title="Supplier Management">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">Supplier Management</h1><p className="text-muted-foreground">Manage supplier database</p></div>
          <ActionButton moduleCode="procurement.suppliers" action="add">
            <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Supplier</Button></DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{editing ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Supplier Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Contact Person</Label><Input value={form.contact_person} onChange={e => setForm({...form, contact_person: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                  <div className="col-span-2 space-y-2"><Label>Address</Label><Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Tax ID / PIN</Label><Input value={form.tax_id} onChange={e => setForm({...form, tax_id: e.target.value})} /></div>
                  <div className="space-y-2">
                    <Label>Payment Terms</Label>
                    <Select value={form.payment_terms} onValueChange={v => setForm({...form, payment_terms: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Cash on Delivery', 'Prepaid'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Category</Label><Input value={form.supplier_category} onChange={e => setForm({...form, supplier_category: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Bank Name</Label><Input value={form.bank_name} onChange={e => setForm({...form, bank_name: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Bank Account</Label><Input value={form.bank_account} onChange={e => setForm({...form, bank_account: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Bank Branch</Label><Input value={form.bank_branch} onChange={e => setForm({...form, bank_branch: e.target.value})} /></div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSubmit} disabled={!form.name}>{editing ? 'Update' : 'Create'}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </ActionButton>
        </div>

        <div className="flex items-center gap-2"><Search className="h-4 w-4 text-muted-foreground" /><Input placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" /></div>

        <Card><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Phone</TableHead><TableHead>Terms</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow> :
              filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8">No suppliers</TableCell></TableRow> :
              filtered.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono">{s.supplier_code}</TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.contact_person || '-'}</TableCell>
                  <TableCell>{s.phone || '-'}</TableCell>
                  <TableCell>{s.payment_terms}</TableCell>
                  <TableCell><Badge variant={s.status === 'active' ? 'default' : 'destructive'}>{s.status}</Badge></TableCell>
                  <TableCell><Button size="icon" variant="ghost" onClick={() => editSupplier(s)}><Edit className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      </div>
    </ProtectedPage>
  );
}
