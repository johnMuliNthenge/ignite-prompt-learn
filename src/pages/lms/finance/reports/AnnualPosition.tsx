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

interface PositionRow {
  account_code: string;
  account_name: string;
  group_name: string;
  current_year: number;
  prior_year: number;
}

export default function AnnualPosition() {
  const { isAdmin } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [rows, setRows] = useState<PositionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const yr = parseInt(year);
      const currentEnd = `${yr}-12-31`;
      const priorEnd = `${yr - 1}-12-31`;

      const { data: accounts } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name, account_type, normal_balance, account_groups(name)')
        .eq('is_active', true)
        .in('account_type', ['Asset', 'Liability', 'Equity'])
        .order('account_code');

      // Current year GL
      const { data: currentGL } = await supabase
        .from('general_ledger')
        .select('account_id, debit, credit')
        .lte('transaction_date', currentEnd);

      // Prior year GL
      const { data: priorGL } = await supabase
        .from('general_ledger')
        .select('account_id, debit, credit')
        .lte('transaction_date', priorEnd);

      const buildMap = (data: any[]) => {
        const map = new Map<string, number>();
        data.forEach((e: any) => {
          map.set(e.account_id, (map.get(e.account_id) || 0) + (Number(e.debit) || 0) - (Number(e.credit) || 0));
        });
        return map;
      };

      const currentMap = buildMap(currentGL || []);
      const priorMap = buildMap(priorGL || []);

      const results: PositionRow[] = (accounts || []).map((acc: any) => {
        const currentRaw = currentMap.get(acc.id) || 0;
        const priorRaw = priorMap.get(acc.id) || 0;
        const sign = acc.normal_balance === 'Debit' ? 1 : -1;
        return {
          account_code: acc.account_code,
          account_name: acc.account_name,
          group_name: acc.account_groups?.name || 'Other',
          current_year: currentRaw * sign,
          prior_year: priorRaw * sign,
        };
      }).filter(r => Math.abs(r.current_year) >= 0.01 || Math.abs(r.prior_year) >= 0.01);

      setRows(results);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load annual position');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(n);

  if (!isAdmin) return <div className="p-6"><p className="text-muted-foreground">Access denied.</p></div>;

  const assetRows = rows.filter(r => ['Asset'].some(t => {
    const acc = rows.find(a => a.account_code === r.account_code);
    return acc;
  }));
  // Group by account_type from accounts
  const renderSection = (type: string, label: string) => {
    // We need to re-filter based on the account_type
    const filtered = rows; // All rows are already filtered to Asset/Liability/Equity
    const groups = new Map<string, PositionRow[]>();
    filtered.forEach(r => {
      if (!groups.has(r.group_name)) groups.set(r.group_name, []);
      groups.get(r.group_name)!.push(r);
    });

    return null; // Simplified - render all together
  };

  const yr = parseInt(year);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Annual Statement of Financial Position</h1>
          <p className="text-muted-foreground">Year-end balance sheet with comparative</p>
        </div>
        <Button variant="outline"><Download className="mr-2 h-4 w-4" />Export</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Financial Year</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <Label>Year</Label>
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
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead className="text-right">{yr} (Current)</TableHead>
                  <TableHead className="text-right">{yr - 1} (Prior)</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No data — post transactions to see balances</TableCell></TableRow>
                ) : rows.map((r, i) => {
                  const variance = r.current_year - r.prior_year;
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{r.account_code}</TableCell>
                      <TableCell>{r.account_name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{r.group_name}</TableCell>
                      <TableCell className="text-right">{fmt(r.current_year)}</TableCell>
                      <TableCell className="text-right">{fmt(r.prior_year)}</TableCell>
                      <TableCell className={`text-right ${variance > 0 ? 'text-green-600' : variance < 0 ? 'text-destructive' : ''}`}>
                        {variance !== 0 ? fmt(variance) : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
