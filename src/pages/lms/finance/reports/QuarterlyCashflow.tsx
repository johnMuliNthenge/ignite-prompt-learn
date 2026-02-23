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
import { format, startOfQuarter, endOfQuarter, addQuarters } from 'date-fns';

interface CashFlowLine {
  description: string;
  amount: number;
}

interface QuarterData {
  label: string;
  start: string;
  end: string;
  operating: CashFlowLine[];
  investing: CashFlowLine[];
  financing: CashFlowLine[];
}

export default function QuarterlyCashflow() {
  const { isAdmin } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [quarters, setQuarters] = useState<QuarterData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const yr = parseInt(year);
      const quarterDefs = [0, 1, 2, 3].map(q => {
        const qStart = startOfQuarter(new Date(yr, q * 3, 1));
        const qEnd = endOfQuarter(qStart);
        return {
          label: `Q${q + 1} ${yr}`,
          start: format(qStart, 'yyyy-MM-dd'),
          end: format(qEnd, 'yyyy-MM-dd'),
        };
      });

      const results: QuarterData[] = [];

      for (const qd of quarterDefs) {
        // Operating: Fee receipts (inflow)
        const { data: feePayments } = await supabase
          .from('fee_payments')
          .select('amount')
          .eq('status', 'Completed')
          .gte('payment_date', qd.start)
          .lte('payment_date', qd.end);

        const feeInflow = (feePayments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);

        // Operating: Supplier/expense payments (outflow)
        const { data: expPayments } = await supabase
          .from('payable_payments')
          .select('amount')
          .eq('status', 'Completed')
          .gte('payment_date', qd.start)
          .lte('payment_date', qd.end);

        const expOutflow = (expPayments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);

        // Operating: Payment vouchers paid
        const { data: vouchers } = await supabase
          .from('payment_vouchers')
          .select('amount')
          .eq('status', 'Paid')
          .gte('paid_at', qd.start)
          .lte('paid_at', qd.end);

        const voucherOutflow = (vouchers || []).reduce((s, v) => s + (Number(v.amount) || 0), 0);

        const operating: CashFlowLine[] = [];
        if (feeInflow > 0) operating.push({ description: 'Receipts from Students (Fees)', amount: feeInflow });
        if (expOutflow > 0) operating.push({ description: 'Payments to Suppliers', amount: -expOutflow });
        if (voucherOutflow > 0) operating.push({ description: 'Payments via Vouchers', amount: -voucherOutflow });

        results.push({
          ...qd,
          operating,
          investing: [], // No investing data sources yet
          financing: [], // No financing data sources yet
        });
      }

      setQuarters(results);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load cashflow data');
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
          <h1 className="text-3xl font-bold">Quarterly Cash Flow Statement</h1>
          <p className="text-muted-foreground">IPSAS Cash Flow — Direct Method</p>
        </div>
        <Button variant="outline"><Download className="mr-2 h-4 w-4" />Export</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Select Year</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <Label>Financial Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={fetchData}>Generate</Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : (
        <Card>
          <CardContent className="pt-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[250px]">Description</TableHead>
                  {quarters.map(q => <TableHead key={q.label} className="text-right min-w-[150px]">{q.label}</TableHead>)}
                  <TableHead className="text-right min-w-[150px]">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Operating Activities */}
                <TableRow className="bg-muted/30 font-semibold">
                  <TableCell colSpan={quarters.length + 2}>A. Cash Flows from Operating Activities</TableCell>
                </TableRow>
                {(() => {
                  const allDescs = new Set<string>();
                  quarters.forEach(q => q.operating.forEach(l => allDescs.add(l.description)));
                  const rows = Array.from(allDescs);
                  return rows.map(desc => (
                    <TableRow key={desc}>
                      <TableCell className="pl-8">{desc}</TableCell>
                      {quarters.map(q => {
                        const line = q.operating.find(l => l.description === desc);
                        return (
                          <TableCell key={q.label} className={`text-right ${(line?.amount || 0) < 0 ? 'text-destructive' : ''}`}>
                            {line ? fmt(line.amount) : '-'}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right font-medium">
                        {fmt(quarters.reduce((s, q) => s + (q.operating.find(l => l.description === desc)?.amount || 0), 0))}
                      </TableCell>
                    </TableRow>
                  ));
                })()}
                <TableRow className="font-bold border-t">
                  <TableCell className="pl-8">Net Cash from Operations</TableCell>
                  {quarters.map(q => {
                    const net = q.operating.reduce((s, l) => s + l.amount, 0);
                    return <TableCell key={q.label} className={`text-right ${net < 0 ? 'text-destructive' : 'text-green-600'}`}>{fmt(net)}</TableCell>;
                  })}
                  <TableCell className="text-right font-bold">
                    {fmt(quarters.reduce((s, q) => s + q.operating.reduce((ss, l) => ss + l.amount, 0), 0))}
                  </TableCell>
                </TableRow>

                {/* Investing */}
                <TableRow className="bg-muted/30 font-semibold">
                  <TableCell colSpan={quarters.length + 2}>B. Cash Flows from Investing Activities</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-8 text-muted-foreground italic" colSpan={quarters.length + 2}>No investing transactions recorded</TableCell>
                </TableRow>

                {/* Financing */}
                <TableRow className="bg-muted/30 font-semibold">
                  <TableCell colSpan={quarters.length + 2}>C. Cash Flows from Financing Activities</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-8 text-muted-foreground italic" colSpan={quarters.length + 2}>No financing transactions recorded</TableCell>
                </TableRow>

                {/* Net Change */}
                <TableRow className="font-bold bg-muted border-t-2">
                  <TableCell>Net Change in Cash</TableCell>
                  {quarters.map(q => {
                    const net = q.operating.reduce((s, l) => s + l.amount, 0);
                    return <TableCell key={q.label} className={`text-right ${net < 0 ? 'text-destructive' : 'text-green-600'}`}>{fmt(net)}</TableCell>;
                  })}
                  <TableCell className="text-right">
                    {fmt(quarters.reduce((s, q) => s + q.operating.reduce((ss, l) => ss + l.amount, 0), 0))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
