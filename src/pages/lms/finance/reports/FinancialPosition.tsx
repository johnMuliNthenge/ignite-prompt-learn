import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface BalanceItem {
  account_code: string;
  account_name: string;
  amount: number;
}

export default function FinancialPosition() {
  const { isAdmin } = useAuth();
  const [assets, setAssets] = useState<BalanceItem[]>([]);
  const [liabilities, setLiabilities] = useState<BalanceItem[]>([]);
  const [equity, setEquity] = useState<BalanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all account types
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('account_code, account_name, account_type')
        .eq('is_active', true)
        .order('account_code');

      if (error) throw error;

      const accounts = data || [];

      setAssets(accounts
        .filter((acc: any) => acc.account_type === 'Asset')
        .map((acc: any) => ({
          account_code: acc.account_code,
          account_name: acc.account_name,
          amount: 0,
        })));

      setLiabilities(accounts
        .filter((acc: any) => acc.account_type === 'Liability')
        .map((acc: any) => ({
          account_code: acc.account_code,
          account_name: acc.account_name,
          amount: 0,
        })));

      setEquity(accounts
        .filter((acc: any) => acc.account_type === 'Equity')
        .map((acc: any) => ({
          account_code: acc.account_code,
          account_name: acc.account_name,
          amount: 0,
        })));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => {
    fetchData();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  };

  const totalAssets = assets.reduce((sum, item) => sum + item.amount, 0);
  const totalLiabilities = liabilities.reduce((sum, item) => sum + item.amount, 0);
  const totalEquity = equity.reduce((sum, item) => sum + item.amount, 0);

  if (!isAdmin) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">You don't have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Statement of Financial Position</h1>
          <p className="text-muted-foreground">Assets, Liabilities & Equity (Balance Sheet)</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Report Date</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <Label>As of Date</Label>
              <Input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
              />
            </div>
            <Button onClick={handleGenerate}>
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Assets */}
          <Card>
            <CardHeader>
              <CardTitle className="text-blue-600">Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        No asset accounts
                      </TableCell>
                    </TableRow>
                  ) : (
                    assets.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <span className="font-mono text-xs mr-2">{item.account_code}</span>
                          {item.account_name}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                      </TableRow>
                    ))
                  )}
                  <TableRow className="font-bold bg-blue-50">
                    <TableCell>Total Assets</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalAssets)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Liabilities */}
          <Card>
            <CardHeader>
              <CardTitle className="text-orange-600">Liabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {liabilities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        No liability accounts
                      </TableCell>
                    </TableRow>
                  ) : (
                    liabilities.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <span className="font-mono text-xs mr-2">{item.account_code}</span>
                          {item.account_name}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                      </TableRow>
                    ))
                  )}
                  <TableRow className="font-bold bg-orange-50">
                    <TableCell>Total Liabilities</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalLiabilities)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Equity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-purple-600">Equity</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equity.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        No equity accounts
                      </TableCell>
                    </TableRow>
                  ) : (
                    equity.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <span className="font-mono text-xs mr-2">{item.account_code}</span>
                          {item.account_name}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                      </TableRow>
                    ))
                  )}
                  <TableRow className="font-bold bg-purple-50">
                    <TableCell>Total Equity</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalEquity)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Balance Check */}
          <Card className="border-primary">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold">Total Liabilities + Equity</span>
                <span className="text-2xl font-bold">
                  {formatCurrency(totalLiabilities + totalEquity)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {totalAssets === (totalLiabilities + totalEquity) 
                  ? '✓ Assets = Liabilities + Equity (Balanced)'
                  : '⚠ Assets ≠ Liabilities + Equity (Unbalanced)'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
