import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface VendorSummary {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  totalInvoiced: number;
  totalPaid: number;
  balance: number;
}

interface VendorTxn {
  date: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(n);

export default function SupplierStatements() {
  const { isAdmin } = useAuth();
  const [vendors, setVendors] = useState<VendorSummary[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [transactions, setTransactions] = useState<VendorTxn[]>([]);
  const [loading, setLoading] = useState(true);
  const [txnLoading, setTxnLoading] = useState(false);

  useEffect(() => { fetchVendors(); }, []);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      // Get vendors
      const { data: vendorData } = await supabase.from('vendors').select('id, name, contact_person, phone').eq('is_active', true).order('name');

      // Get payables (supplier invoices/bills) - the actual source of amounts owed
      const { data: payables } = await supabase.from('payables').select('vendor_id, total_amount, amount_paid, balance_due, status');

      const summaries: VendorSummary[] = (vendorData || []).map((v: any) => {
        const vendorPayables = (payables || []).filter((p: any) => p.vendor_id === v.id);
        const totalInvoiced = vendorPayables.reduce((s: number, p: any) => s + (Number(p.total_amount) || 0), 0);
        const totalPaid = vendorPayables.reduce((s: number, p: any) => s + (Number(p.amount_paid) || 0), 0);
        const balance = vendorPayables.reduce((s: number, p: any) => s + (Number(p.balance_due) || 0), 0);

        return {
          id: v.id,
          name: v.name,
          contact_person: v.contact_person,
          phone: v.phone,
          totalInvoiced,
          totalPaid,
          balance,
        };
      });

      setVendors(summaries);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const fetchVendorTransactions = async (vendorId: string) => {
    setSelectedVendor(vendorId);
    setTxnLoading(true);
    try {
      // Payables/Bills (debits - amounts owed to vendor)
      const { data: payables } = await supabase
        .from('payables')
        .select('id, bill_number, bill_date, total_amount, notes, status')
        .eq('vendor_id', vendorId)
        .order('bill_date');

      // Payments against those payables (credits - amounts paid)
      const payableIds = (payables || []).map((p: any) => p.id);
      let payments: any[] = [];
      if (payableIds.length > 0) {
        const { data } = await supabase
          .from('payable_payments')
          .select('payment_number, payment_date, amount, notes, payable_id')
          .in('payable_id', payableIds)
          .eq('status', 'Completed')
          .order('payment_date');
        payments = data || [];
      }

      // Also check for vouchers linked to this vendor
      const { data: vouchers } = await supabase
        .from('payment_vouchers')
        .select('voucher_number, voucher_date, amount, description, status')
        .eq('vendor_id', vendorId)
        .neq('status', 'Draft')
        .order('voucher_date');

      const allTxns: VendorTxn[] = [];

      // Add payable bills as debits
      (payables || []).forEach((p: any) => {
        allTxns.push({
          date: p.bill_date,
          reference: p.bill_number || '-',
          description: p.notes || `Supplier Invoice (${p.status})`,
          debit: Number(p.total_amount) || 0,
          credit: 0,
          balance: 0,
        });
      });

      // Add payments as credits
      payments.forEach((p: any) => {
        allTxns.push({
          date: p.payment_date,
          reference: p.payment_number || '-',
          description: p.notes || 'Payment',
          debit: 0,
          credit: Number(p.amount) || 0,
          balance: 0,
        });
      });

      // Add vouchers as debits (if any, and not already captured via payables)
      (vouchers || []).forEach((v: any) => {
        allTxns.push({
          date: v.voucher_date,
          reference: v.voucher_number || '-',
          description: v.description || `Payment Voucher (${v.status})`,
          debit: Number(v.amount) || 0,
          credit: 0,
          balance: 0,
        });
      });

      // Sort by date then compute running balance
      allTxns.sort((a, b) => a.date.localeCompare(b.date));
      let running = 0;
      allTxns.forEach(t => { running += t.debit - t.credit; t.balance = running; });

      setTransactions(allTxns);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load statement');
    } finally {
      setTxnLoading(false);
    }
  };

  if (!isAdmin) return <div className="p-6"><p className="text-muted-foreground">Access denied.</p></div>;

  const selectedName = vendors.find(v => v.id === selectedVendor)?.name || '';
  const selectedVendorData = vendors.find(v => v.id === selectedVendor);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Supplier Statements</h1>
          <p className="text-muted-foreground">Vendor account transaction history</p>
        </div>
        <Button variant="outline"><Download className="mr-2 h-4 w-4" />Export</Button>
      </div>

      {/* Vendor Summary */}
      {!selectedVendor && (
        <Card>
          <CardHeader><CardTitle>Supplier Summary</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Total Invoiced</TableHead>
                    <TableHead className="text-right">Total Paid</TableHead>
                    <TableHead className="text-right">Balance Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No suppliers found</TableCell></TableRow>
                  ) : vendors.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{v.contact_person || v.phone || '-'}</TableCell>
                      <TableCell className="text-right">{fmt(v.totalInvoiced)}</TableCell>
                      <TableCell className="text-right text-green-600">{fmt(v.totalPaid)}</TableCell>
                      <TableCell className={`text-right font-medium ${v.balance > 0 ? 'text-destructive' : ''}`}>
                        {fmt(v.balance)}
                      </TableCell>
                      <TableCell>
                        {v.balance <= 0
                          ? <Badge className="bg-green-500">Settled</Badge>
                          : <Badge variant="destructive">Outstanding</Badge>}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => fetchVendorTransactions(v.id)}>View Statement</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detailed Statement */}
      {selectedVendor && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Statement: {selectedName}</CardTitle>
                {selectedVendorData && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedVendorData.contact_person && `Contact: ${selectedVendorData.contact_person}`}
                    {selectedVendorData.phone && ` | Phone: ${selectedVendorData.phone}`}
                  </p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => { setSelectedVendor(''); setTransactions([]); }}>
                <ArrowLeft className="mr-2 h-4 w-4" />Back to Summary
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {txnLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit (Owed)</TableHead>
                      <TableHead className="text-right">Credit (Paid)</TableHead>
                      <TableHead className="text-right">Running Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No transactions found</TableCell></TableRow>
                    ) : (
                      <>
                        {transactions.map((t, i) => (
                          <TableRow key={i}>
                            <TableCell>{format(new Date(t.date), 'dd/MM/yyyy')}</TableCell>
                            <TableCell className="font-mono text-xs">{t.reference}</TableCell>
                            <TableCell>{t.description}</TableCell>
                            <TableCell className="text-right">{t.debit > 0 ? fmt(t.debit) : '-'}</TableCell>
                            <TableCell className="text-right text-green-600">{t.credit > 0 ? fmt(t.credit) : '-'}</TableCell>
                            <TableCell className={`text-right font-medium ${t.balance > 0 ? 'text-destructive' : ''}`}>{fmt(t.balance)}</TableCell>
                          </TableRow>
                        ))}
                        {/* Totals row */}
                        <TableRow className="font-bold border-t-2">
                          <TableCell colSpan={3} className="text-right">Totals:</TableCell>
                          <TableCell className="text-right">{fmt(transactions.reduce((s, t) => s + t.debit, 0))}</TableCell>
                          <TableCell className="text-right text-green-600">{fmt(transactions.reduce((s, t) => s + t.credit, 0))}</TableCell>
                          <TableCell className={`text-right ${transactions[transactions.length - 1]?.balance > 0 ? 'text-destructive' : ''}`}>
                            {fmt(transactions[transactions.length - 1]?.balance || 0)}
                          </TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
