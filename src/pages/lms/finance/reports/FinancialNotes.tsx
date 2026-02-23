import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface NoteSection {
  title: string;
  items: { label: string; amount: number }[];
  total: number;
}

export default function FinancialNotes() {
  const { isAdmin } = useAuth();
  const [notes, setNotes] = useState<NoteSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Note 1: Cash and Cash Equivalents breakdown
      const { data: bankAccounts } = await supabase
        .from('bank_accounts')
        .select('account_name, bank_name, current_balance')
        .eq('is_active', true);

      const { data: cashAccounts } = await supabase
        .from('cash_accounts')
        .select('name, current_balance')
        .eq('is_active', true);

      const cashNote: NoteSection = {
        title: 'Note 1: Cash and Cash Equivalents',
        items: [
          ...(bankAccounts || []).map((b: any) => ({ label: `${b.bank_name} - ${b.account_name}`, amount: Number(b.current_balance) || 0 })),
          ...(cashAccounts || []).map((c: any) => ({ label: c.name, amount: Number(c.current_balance) || 0 })),
        ],
        total: 0,
      };
      cashNote.total = cashNote.items.reduce((s, i) => s + i.amount, 0);

      // Note 2: Student Receivables aging
      const { data: invoices } = await supabase.from('fee_invoices').select('total_amount, amount_paid, balance_due, invoice_date');
      const totalReceivable = (invoices || []).reduce((s, i) => s + (Number(i.balance_due) || 0), 0);
      const receivableNote: NoteSection = {
        title: 'Note 2: Student Fee Receivables',
        items: [
          { label: 'Gross Receivables', amount: (invoices || []).reduce((s, i) => s + (Number(i.total_amount) || 0), 0) },
          { label: 'Less: Amounts Received', amount: -(invoices || []).reduce((s, i) => s + (Number(i.amount_paid) || 0), 0) },
        ],
        total: totalReceivable,
      };

      // Note 3: Payables
      const { data: vouchers } = await supabase
        .from('payment_vouchers')
        .select('amount, status')
        .in('status', ['Approved', 'Pending']);
      const unpaidVouchers = (vouchers || []).reduce((s, v) => s + (Number(v.amount) || 0), 0);
      const payablesNote: NoteSection = {
        title: 'Note 3: Accounts Payable',
        items: [
          { label: 'Approved Payment Vouchers (Unpaid)', amount: unpaidVouchers },
        ],
        total: unpaidVouchers,
      };

      // Note 4: Accounting Policies
      const policiesNote: NoteSection = {
        title: 'Note 4: Significant Accounting Policies',
        items: [
          { label: 'Basis of Preparation: IPSAS Accrual Basis', amount: 0 },
          { label: 'Revenue Recognition: Upon invoice issuance', amount: 0 },
          { label: 'Depreciation: Straight-line method', amount: 0 },
          { label: 'Currency: Kenya Shillings (KES)', amount: 0 },
        ],
        total: 0,
      };

      setNotes([cashNote, receivableNote, payablesNote, policiesNote]);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load financial notes');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(n);

  if (!isAdmin) return <div className="p-6"><p className="text-muted-foreground">Access denied.</p></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Notes to Financial Statements</h1>
          <p className="text-muted-foreground">Supplementary disclosures per IPSAS requirements</p>
        </div>
        <Button variant="outline"><Download className="mr-2 h-4 w-4" />Export</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : (
        notes.map((note, ni) => (
          <Card key={ni}>
            <CardHeader><CardTitle>{note.title}</CardTitle></CardHeader>
            <CardContent>
              {note.title.includes('Policies') ? (
                <ul className="list-disc pl-6 space-y-2">
                  {note.items.map((item, i) => (
                    <li key={i} className="text-muted-foreground">{item.label}</li>
                  ))}
                </ul>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount (KES)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {note.items.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell>{item.label}</TableCell>
                        <TableCell className={`text-right ${item.amount < 0 ? 'text-destructive' : ''}`}>
                          {item.amount !== 0 ? fmt(item.amount) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">{fmt(note.total)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
