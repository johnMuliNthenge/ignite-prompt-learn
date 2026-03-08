import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProtectedPage, ActionButton } from '@/components/auth/ProtectedPage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Check, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function ProcurementInvoices() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchInvoices(); }, []);

  const fetchInvoices = async () => {
    const { data } = await supabase.from('procurement_invoices')
      .select('*, procurement_suppliers(name, supplier_code), purchase_orders(po_number)')
      .order('created_at', { ascending: false });
    setInvoices((data as any[]) || []);
    setLoading(false);
  };

  const approveInvoice = async (id: string) => {
    const { error } = await supabase.from('procurement_invoices').update({ status: 'approved' }).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Invoice approved - ready for payment'); fetchInvoices(); }
  };

  const markPaid = async (invoice: any) => {
    // Update invoice status
    const { error } = await supabase.from('procurement_invoices').update({ status: 'paid' }).eq('id', invoice.id);
    if (error) { toast.error(error.message); return; }

    toast.success('Invoice marked as paid');
    fetchInvoices();
  };

  const statusColors: Record<string, string> = { pending: 'secondary', approved: 'default', paid: 'default', cancelled: 'destructive' };

  return (
    <ProtectedPage moduleCode="procurement.invoices" title="Supplier Invoices">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">Supplier Invoices</h1><p className="text-muted-foreground">Manage procurement invoices and payments</p></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold">{invoices.filter(i => i.status === 'pending').length}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Approved (Awaiting Payment)</p>
            <p className="text-2xl font-bold">{invoices.filter(i => i.status === 'approved').length}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Paid</p>
            <p className="text-2xl font-bold">{invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total_amount), 0).toLocaleString()}</p>
          </CardContent></Card>
        </div>

        <Card><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Invoice #</TableHead><TableHead>Supplier</TableHead><TableHead>PO #</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow> :
              invoices.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8">No invoices</TableCell></TableRow> :
              invoices.map(inv => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono">{inv.invoice_number}</TableCell>
                  <TableCell>{inv.procurement_suppliers?.name}</TableCell>
                  <TableCell>{inv.purchase_orders?.po_number || '-'}</TableCell>
                  <TableCell className="font-medium">{Number(inv.total_amount).toLocaleString()}</TableCell>
                  <TableCell><Badge variant={statusColors[inv.status] as any}>{inv.status}</Badge></TableCell>
                  <TableCell>{format(new Date(inv.created_at), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {inv.status === 'pending' && <Button size="sm" variant="outline" onClick={() => approveInvoice(inv.id)}><Check className="h-3 w-3 mr-1" />Approve</Button>}
                      {inv.status === 'approved' && <Button size="sm" onClick={() => markPaid(inv)}><CreditCard className="h-3 w-3 mr-1" />Pay</Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      </div>
    </ProtectedPage>
  );
}
