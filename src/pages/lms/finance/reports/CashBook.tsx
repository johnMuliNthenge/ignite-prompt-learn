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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface CashEntry {
  id: string;
  date: string;
  reference: string;
  description: string;
  receipts: number;
  payments: number;
  balance: number;
}

export default function CashBook() {
  const { isAdmin } = useAuth();
  const [cashEntries, setCashEntries] = useState<CashEntry[]>([]);
  const [bankEntries, setBankEntries] = useState<CashEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // In a real implementation, fetch from actual cash and bank transaction tables
      // For now, showing placeholder data structure
      setCashEntries([]);
      setBankEntries([]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load cash book');
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

  const totalCashReceipts = cashEntries.reduce((sum, e) => sum + e.receipts, 0);
  const totalCashPayments = cashEntries.reduce((sum, e) => sum + e.payments, 0);
  const totalBankReceipts = bankEntries.reduce((sum, e) => sum + e.receipts, 0);
  const totalBankPayments = bankEntries.reduce((sum, e) => sum + e.payments, 0);

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
          <h1 className="text-3xl font-bold">Cash Book</h1>
          <p className="text-muted-foreground">Record of all cash and bank transactions</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Report Period</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button onClick={handleGenerate}>
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="cash" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cash">Cash Account</TabsTrigger>
          <TabsTrigger value="bank">Bank Account</TabsTrigger>
        </TabsList>

        <TabsContent value="cash">
          <Card>
            <CardHeader>
              <CardTitle>Cash Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Receipts</TableHead>
                        <TableHead className="text-right">Payments</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cashEntries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            No cash transactions found for this period
                          </TableCell>
                        </TableRow>
                      ) : (
                        cashEntries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell>{format(new Date(entry.date), 'dd/MM/yyyy')}</TableCell>
                            <TableCell className="font-mono">{entry.reference}</TableCell>
                            <TableCell>{entry.description}</TableCell>
                            <TableCell className="text-right text-green-600">
                              {entry.receipts > 0 ? formatCurrency(entry.receipts) : '-'}
                            </TableCell>
                            <TableCell className="text-right text-red-600">
                              {entry.payments > 0 ? formatCurrency(entry.payments) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(entry.balance)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  {cashEntries.length > 0 && (
                    <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Total Receipts</p>
                        <p className="text-lg font-bold text-green-600">{formatCurrency(totalCashReceipts)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Total Payments</p>
                        <p className="text-lg font-bold text-red-600">{formatCurrency(totalCashPayments)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Net Movement</p>
                        <p className="text-lg font-bold">{formatCurrency(totalCashReceipts - totalCashPayments)}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bank">
          <Card>
            <CardHeader>
              <CardTitle>Bank Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Receipts</TableHead>
                        <TableHead className="text-right">Payments</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bankEntries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            No bank transactions found for this period
                          </TableCell>
                        </TableRow>
                      ) : (
                        bankEntries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell>{format(new Date(entry.date), 'dd/MM/yyyy')}</TableCell>
                            <TableCell className="font-mono">{entry.reference}</TableCell>
                            <TableCell>{entry.description}</TableCell>
                            <TableCell className="text-right text-green-600">
                              {entry.receipts > 0 ? formatCurrency(entry.receipts) : '-'}
                            </TableCell>
                            <TableCell className="text-right text-red-600">
                              {entry.payments > 0 ? formatCurrency(entry.payments) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(entry.balance)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  {bankEntries.length > 0 && (
                    <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Total Receipts</p>
                        <p className="text-lg font-bold text-green-600">{formatCurrency(totalBankReceipts)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Total Payments</p>
                        <p className="text-lg font-bold text-red-600">{formatCurrency(totalBankPayments)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Net Movement</p>
                        <p className="text-lg font-bold">{formatCurrency(totalBankReceipts - totalBankPayments)}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
