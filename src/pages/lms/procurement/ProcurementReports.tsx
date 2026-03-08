import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ProcurementReports() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [pos, setPos] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [supRes, poRes, invRes] = await Promise.all([
      supabase.from('procurement_suppliers').select('*').eq('status', 'active'),
      supabase.from('purchase_orders').select('*, procurement_suppliers(name)').order('created_at', { ascending: false }).limit(100),
      supabase.from('procurement_invoices').select('*, procurement_suppliers(name)').order('created_at', { ascending: false }).limit(100),
    ]);
    setSuppliers((supRes.data as any[]) || []);
    setPos((poRes.data as any[]) || []);
    setInvoices((invRes.data as any[]) || []);
    setLoading(false);
  };

  const totalPOValue = pos.reduce((s, p) => s + Number(p.total_amount || 0), 0);
  const pendingPOs = pos.filter(p => !['delivered', 'closed', 'cancelled'].includes(p.status));
  const unpaidInvoices = invoices.filter(i => i.status !== 'paid');

  return (
    <ProtectedPage moduleCode="procurement.reports" title="Procurement Reports">
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Procurement Reports</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Active Suppliers</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{suppliers.length}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total PO Value</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{totalPOValue.toLocaleString()}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pending Orders</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{pendingPOs.length}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Unpaid Invoices</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-destructive">{unpaidInvoices.length}</p></CardContent></Card>
        </div>

        <Tabs defaultValue="suppliers">
          <TabsList>
            <TabsTrigger value="suppliers">Supplier Performance</TabsTrigger>
            <TabsTrigger value="orders">Purchase Analytics</TabsTrigger>
            <TabsTrigger value="pending">Pending Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="suppliers">
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Code</TableHead><TableHead>Supplier</TableHead><TableHead>Total POs</TableHead><TableHead>Total Value</TableHead><TableHead>Paid</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {suppliers.map(s => {
                    const supPOs = pos.filter(p => p.supplier_id === s.id);
                    const supInvPaid = invoices.filter(i => i.supplier_id === s.id && i.status === 'paid');
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono">{s.supplier_code}</TableCell>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>{supPOs.length}</TableCell>
                        <TableCell>{supPOs.reduce((sum, p) => sum + Number(p.total_amount || 0), 0).toLocaleString()}</TableCell>
                        <TableCell>{supInvPaid.reduce((sum, i) => sum + Number(i.total_amount || 0), 0).toLocaleString()}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>PO #</TableHead><TableHead>Supplier</TableHead><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {pos.slice(0, 50).map(po => (
                    <TableRow key={po.id}>
                      <TableCell className="font-mono">{po.po_number}</TableCell>
                      <TableCell>{po.procurement_suppliers?.name}</TableCell>
                      <TableCell><Badge variant="outline">{po.po_type}</Badge></TableCell>
                      <TableCell>{Number(po.total_amount || 0).toLocaleString()}</TableCell>
                      <TableCell><Badge>{po.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="pending">
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>PO #</TableHead><TableHead>Supplier</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Delivery Date</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {pendingPOs.map(po => (
                    <TableRow key={po.id}>
                      <TableCell className="font-mono">{po.po_number}</TableCell>
                      <TableCell>{po.procurement_suppliers?.name}</TableCell>
                      <TableCell>{Number(po.total_amount || 0).toLocaleString()}</TableCell>
                      <TableCell><Badge variant="secondary">{po.status}</Badge></TableCell>
                      <TableCell>{po.delivery_date ? new Date(po.delivery_date).toLocaleDateString() : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedPage>
  );
}
