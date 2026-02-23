import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface VendorSummary {
  id: string;
  name: string;
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
      const { data: vendorData } = await supabase.from('vendors').select('id, name').eq('is_active', true).order('name');
      
      // Fetch vouchers per vendor
      const { data: vouchers } = await supabase.from('payment_vouchers').select('vendor_id, amount, status');
      const { data: payments } = await supabase.from('payable_payments').select('vendor_id, amount, status').eq('status', 'Completed');

      const summaries: VendorSummary[] = (vendorData || []).map((v: any) => {
        const voucherTotal = (vouchers || [])
          .filter((pv: any) => pv.vendor_id === v.id && pv.status !== 'Draft')
          .reduce((s: number, pv: any) => s + (Number(pv.amount) || 0), 0);
        const paidTotal = (payments || [])
          .filter((p: any) => p.vendor_id === v.id)
          .reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);

        return {
          id: v.id,
          name: v.name,
          totalInvoiced: voucherTotal,
          totalPaid: paidTotal,
          balance: voucherTotal - paidTotal,
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
      // Vouchers (debits - amounts owed)
      const { data: vouchers } = await supabase
        .from('payment_vouchers')
        .select('voucher_number, voucher_date, amount, description, status')
        .eq('vendor_id', vendorId)
        .neq('status', 'Draft')
        .order('voucher_date');

      // Payments (credits - amounts paid)
      const { data: payments } = await supabase
        .from('payable_payments')
        .select('payment_number, payment_date, amount, notes')
        .eq('vendor_id', vendorId)
        .eq('status', 'Completed')
        .order('payment_date');

      const allTxns: VendorTxn[] = [];
      (vouchers || []).forEach((v: any) => {
        allTxns.push({
          date: v.voucher_date,
          reference: v.voucher_number,
          description: v.description || 'Payment Voucher',
          debit: Number(v.amount) || 0,
          credit: 0,
          balance: 0,
        });
      });
      (payments || []).forEach((p: any) => {
        allTxns.push({
          date: p.payment_date,
          reference: p.payment_number,
          description: p.notes || 'Payment',
          debit: 0,
          credit: Number(p.amount) || 0,
          balance: 0,
        });
      });

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

  const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(n);

  if (!isAdmin) return <div className="p-6"><p className="text-muted-foreground">Access denied.</p></div>;

  const selectedName = vendors.find(v => v.id === selectedVendor)?.name || '';

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
                  <TableHead className="text-right">Total Invoiced</TableHead>
                  <TableHead className="text-right">Total Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No suppliers found</TableCell></TableRow>
                ) : vendors.map(v => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.name}</TableCell>
                    <TableCell className="text-right">{fmt(v.totalInvoiced)}</TableCell>
                    <TableCell className="text-right text-green-600">{fmt(v.totalPaid)}</TableCell>
                    <TableCell className={`text-right font-medium ${v.balance > 0 ? 'text-destructive' : ''}`}>
                      {v.balance > 0 ? fmt(v.balance) : '-'}
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

      {/* Detailed Statement */}
      {selectedVendor && (
        <Card>
          <CardHeader><CardTitle>Statement: {selectedName}</CardTitle></CardHeader>
          <CardContent>
            {txnLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No transactions</TableCell></TableRow>
                  ) : transactions.map((t, i) => (
                    <TableRow key={i}>
                      <TableCell>{format(new Date(t.date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="font-mono text-xs">{t.reference}</TableCell>
                      <TableCell>{t.description}</TableCell>
                      <TableCell className="text-right">{t.debit > 0 ? fmt(t.debit) : '-'}</TableCell>
                      <TableCell className="text-right text-green-600">{t.credit > 0 ? fmt(t.credit) : '-'}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(t.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
