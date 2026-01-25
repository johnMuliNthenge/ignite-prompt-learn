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
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Search, Download, Loader2, FileText, Eye, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  date: string;
  reference: string;
  type: 'Invoice' | 'Payment' | 'Credit Note' | 'Debit Note';
  student_name: string;
  student_no: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export default function Transactions() {
  const { isAdmin } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      // Fetch invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('fee_invoices')
        .select(`
          id,
          invoice_number,
          invoice_date,
          total_amount,
          students(student_no, other_name, surname)
        `)
        .order('invoice_date', { ascending: false })
        .limit(200);

      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('fee_payments')
        .select(`
          id,
          receipt_number,
          payment_date,
          amount,
          students(student_no, other_name, surname)
        `)
        .order('payment_date', { ascending: false })
        .limit(200);

      const allTransactions: Transaction[] = [];

      // Add invoices
      (invoicesData || []).forEach((inv: any) => {
        allTransactions.push({
          id: inv.id,
          date: inv.invoice_date,
          reference: inv.invoice_number,
          type: 'Invoice',
          student_name: inv.students ? `${inv.students.other_name} ${inv.students.surname}` : 'Unknown',
          student_no: inv.students?.student_no || '',
          description: 'Fee Invoice',
          debit: Number(inv.total_amount) || 0,
          credit: 0,
          balance: 0,
        });
      });

      // Add payments
      (paymentsData || []).forEach((pay: any) => {
        allTransactions.push({
          id: pay.id,
          date: pay.payment_date,
          reference: pay.receipt_number,
          type: 'Payment',
          student_name: pay.students ? `${pay.students.other_name} ${pay.students.surname}` : 'Unknown',
          student_no: pay.students?.student_no || '',
          description: 'Fee Payment',
          debit: 0,
          credit: Number(pay.amount) || 0,
          balance: 0,
        });
      });

      // Sort by date descending
      allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Calculate running balance
      let runningBalance = 0;
      const withBalance = allTransactions.reverse().map(tx => {
        runningBalance += tx.debit - tx.credit;
        return { ...tx, balance: runningBalance };
      }).reverse();

      setTransactions(withBalance);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    fetchTransactions();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      'Invoice': 'bg-blue-500',
      'Payment': 'bg-green-500',
      'Credit Note': 'bg-orange-500',
      'Debit Note': 'bg-red-500',
    };
    return <Badge className={colors[type] || 'bg-gray-500'}>{type}</Badge>;
  };

  const filtered = transactions.filter(tx => {
    const matchesSearch = 
      tx.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.student_no.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || tx.type === filterType;
    
    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && tx.date >= startDate;
    }
    if (endDate) {
      matchesDate = matchesDate && tx.date <= endDate;
    }
    
    return matchesSearch && matchesType && matchesDate;
  });

  const totalDebits = filtered.reduce((sum, tx) => sum + tx.debit, 0);
  const totalCredits = filtered.reduce((sum, tx) => sum + tx.credit, 0);

  if (!isAdmin) {
    return <div className="p-6"><p className="text-muted-foreground">Access denied</p></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Receivables Transactions</h1>
          <p className="text-muted-foreground">View all student fee transactions</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Reference, name..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="pl-10" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Invoice">Invoices</SelectItem>
                  <SelectItem value="Payment">Payments</SelectItem>
                  <SelectItem value="Credit Note">Credit Notes</SelectItem>
                  <SelectItem value="Debit Note">Debit Notes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button onClick={handleFilter} className="w-full">Apply Filters</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Debits (Invoices)</div>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalDebits)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Credits (Payments)</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalCredits)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Net Balance</div>
            <div className={`text-2xl font-bold ${totalDebits - totalCredits > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(totalDebits - totalCredits)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transactions ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Transactions</h3>
              <p className="text-muted-foreground">No transactions match your filters</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((tx) => (
                  <TableRow key={`${tx.type}-${tx.id}`}>
                    <TableCell>{format(new Date(tx.date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="font-mono">{tx.reference}</TableCell>
                    <TableCell>{getTypeBadge(tx.type)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{tx.student_name}</p>
                        <p className="text-xs text-muted-foreground">{tx.student_no}</p>
                      </div>
                    </TableCell>
                    <TableCell>{tx.description}</TableCell>
                    <TableCell className="text-right">
                      {tx.debit > 0 ? formatCurrency(tx.debit) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {tx.credit > 0 ? formatCurrency(tx.credit) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(tx.balance)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon"><Printer className="h-4 w-4" /></Button>
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
