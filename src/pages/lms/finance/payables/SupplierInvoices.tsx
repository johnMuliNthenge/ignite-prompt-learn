import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Eye, Loader2, FileText, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface SupplierInvoice {
  id: string;
  invoice_number: string;
  supplier_invoice_ref: string;
  vendor_id: string;
  vendor_name: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: string;
}

interface Vendor {
  id: string;
  name: string;
}

export default function SupplierInvoices() {
  const { isAdmin, user } = useAuth();
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    vendor_id: '',
    supplier_invoice_ref: '',
    amount: '',
    description: '',
    invoice_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([fetchInvoices(), fetchVendors()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    const { data, error } = await supabase
      .from('payables')
      .select(`
        id,
        bill_number,
        vendor_id,
        bill_date,
        due_date,
        total_amount,
        amount_paid,
        balance_due,
        status,
        notes,
        vendors(name)
      `)
      .order('bill_date', { ascending: false });

    if (error) {
      console.error('Error fetching invoices:', error);
      return;
    }

    const formatted: SupplierInvoice[] = (data || []).map((inv: any) => ({
      id: inv.id,
      invoice_number: inv.bill_number,
      supplier_invoice_ref: inv.notes || '',
      vendor_id: inv.vendor_id,
      vendor_name: inv.vendors?.name || 'Unknown',
      invoice_date: inv.bill_date,
      due_date: inv.due_date || '',
      total_amount: Number(inv.total_amount) || 0,
      amount_paid: Number(inv.amount_paid) || 0,
      balance_due: Number(inv.balance_due) || 0,
      status: inv.status,
    }));

    setInvoices(formatted);
  };

  const fetchVendors = async () => {
    const { data, error } = await supabase
      .from('vendors')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    if (!error) setVendors(data || []);
  };

  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `SI-${year}-${random}`;
  };

  const handleCreate = async () => {
    if (!formData.vendor_id || !formData.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const invoiceNumber = generateInvoiceNumber();
      const amount = parseFloat(formData.amount);

      const { error } = await supabase.from('payables').insert({
        bill_number: invoiceNumber,
        vendor_id: formData.vendor_id,
        bill_date: formData.invoice_date,
        due_date: formData.due_date || null,
        subtotal: amount,
        total_amount: amount,
        balance_due: amount,
        status: 'Unpaid',
        notes: formData.supplier_invoice_ref,
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success('Supplier invoice created successfully');
      setCreateDialogOpen(false);
      resetForm();
      fetchInvoices();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      vendor_id: '',
      supplier_invoice_ref: '',
      amount: '',
      description: '',
      invoice_date: format(new Date(), 'yyyy-MM-dd'),
      due_date: '',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'Paid': 'bg-green-500',
      'Partial': 'bg-yellow-500',
      'Unpaid': 'bg-red-500',
      'Cancelled': 'bg-gray-500',
    };
    return <Badge className={colors[status] || 'bg-gray-500'}>{status}</Badge>;
  };

  const filtered = invoices.filter(inv =>
    inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.supplier_invoice_ref.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) {
    return <div className="p-6"><p className="text-muted-foreground">Access denied</p></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Supplier Invoices</h1>
          <p className="text-muted-foreground">Manage invoices received from suppliers/vendors</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Invoice</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Supplier Invoice</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Invoice Date *</Label>
                  <Input
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Supplier/Vendor *</Label>
                <Select value={formData.vendor_id} onValueChange={(v) => setFormData({ ...formData, vendor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>
                    {vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Supplier Invoice Reference</Label>
                <Input
                  value={formData.supplier_invoice_ref}
                  onChange={(e) => setFormData({ ...formData, supplier_invoice_ref: e.target.value })}
                  placeholder="Supplier's invoice number"
                />
              </div>
              <div className="space-y-2">
                <Label>Amount (KES) *</Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Invoice details..."
                  rows={2}
                />
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Invoice
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{invoices.length}</div>
            <p className="text-sm text-muted-foreground">Total Invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(invoices.reduce((sum, i) => sum + i.balance_due, 0))}
            </div>
            <p className="text-sm text-muted-foreground">Total Outstanding</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(invoices.reduce((sum, i) => sum + i.amount_paid, 0))}
            </div>
            <p className="text-sm text-muted-foreground">Total Paid</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{invoices.filter(i => i.status === 'Unpaid').length}</div>
            <p className="text-sm text-muted-foreground">Unpaid Invoices</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Invoices</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search invoices..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Supplier Invoices</h3>
              <p className="text-muted-foreground">Add your first supplier invoice to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Supplier Ref</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.supplier_invoice_ref || '-'}</TableCell>
                    <TableCell>{invoice.vendor_name}</TableCell>
                    <TableCell>{format(new Date(invoice.invoice_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{invoice.due_date ? format(new Date(invoice.due_date), 'dd/MM/yyyy') : '-'}</TableCell>
                    <TableCell className="text-right">{formatCurrency(invoice.total_amount)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(invoice.balance_due)}</TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                        {invoice.balance_due > 0 && (
                          <Button variant="ghost" size="icon" title="Pay"><DollarSign className="h-4 w-4" /></Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
