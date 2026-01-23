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
import { Badge } from '@/components/ui/badge';
import { Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Cancellation {
  id: string;
  student_name: string;
  invoice_number: string;
  amount: number;
  reason: string;
  cancellation_date: string;
  status: string;
}

export default function Cancellations() {
  const { isAdmin } = useAuth();
  const [cancellations, setCancellations] = useState<Cancellation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCancellations();
  }, []);

  const fetchCancellations = async () => {
    try {
      const { data, error } = await supabase
        .from('fee_cancellations')
        .select(`
          id,
          amount,
          reason,
          cancellation_date,
          status,
          students(other_name, surname),
          fee_invoices(invoice_number)
        `)
        .order('cancellation_date', { ascending: false });

      if (error) throw error;

      const formattedData: Cancellation[] = (data || []).map((c: any) => ({
        id: c.id,
        student_name: c.students ? `${c.students.other_name} ${c.students.surname}` : 'Unknown',
        invoice_number: c.fee_invoices?.invoice_number || '',
        amount: Number(c.amount) || 0,
        reason: c.reason,
        cancellation_date: c.cancellation_date,
        status: c.status,
      }));

      setCancellations(formattedData);
    } catch (error) {
      console.error('Error fetching cancellations:', error);
      toast.error('Failed to load cancellations');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <Badge className="bg-green-600 hover:bg-green-700">Approved</Badge>;
      case 'Rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const filteredCancellations = cancellations.filter(
    (c) =>
      c.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">You don't have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fee Cancellations</h1>
        <p className="text-muted-foreground">View and manage fee cancellation requests</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Cancellations</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search cancellations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCancellations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No cancellations found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCancellations.map((cancellation) => (
                    <TableRow key={cancellation.id}>
                      <TableCell className="font-medium">{cancellation.student_name}</TableCell>
                      <TableCell className="font-mono">{cancellation.invoice_number}</TableCell>
                      <TableCell className="text-right">{formatCurrency(cancellation.amount)}</TableCell>
                      <TableCell className="max-w-xs truncate">{cancellation.reason}</TableCell>
                      <TableCell>{format(new Date(cancellation.cancellation_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{getStatusBadge(cancellation.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
