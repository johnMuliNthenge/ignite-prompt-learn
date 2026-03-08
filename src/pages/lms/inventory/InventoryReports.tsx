import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Package, TrendingDown, ArrowUpDown } from 'lucide-react';

export default function InventoryReports() {
  const [stockBalance, setStockBalance] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    // Stock balance by store
    const { data: stockData } = await supabase.from('store_stock')
      .select('*, inventory_items(item_code, name, cost_price, reorder_level, min_stock_level), inventory_stores(name)')
      .gt('quantity', 0);
    setStockBalance((stockData as any[]) || []);

    // Low stock items
    const allStock = (stockData as any[]) || [];
    const low = allStock.filter(s => s.inventory_items && s.quantity <= s.inventory_items.reorder_level);
    setLowStock(low);

    // Recent movements
    const { data: movData } = await supabase.from('stock_transactions')
      .select('*, inventory_items(name, item_code), inventory_stores(name)')
      .order('created_at', { ascending: false }).limit(50);
    setMovements((movData as any[]) || []);

    setLoading(false);
  };

  const totalValue = stockBalance.reduce((sum, s) => sum + (s.quantity * (s.inventory_items?.cost_price || 0)), 0);

  return (
    <ProtectedPage moduleCode="inventory.reports" title="Inventory Reports">
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Inventory Reports</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Items in Stock</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{stockBalance.length}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Stock Value</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{totalValue.toLocaleString()}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-4 w-4 text-destructive" />Low Stock Alerts</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-destructive">{lowStock.length}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Recent Movements</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{movements.length}</p></CardContent></Card>
        </div>

        <Tabs defaultValue="balance">
          <TabsList>
            <TabsTrigger value="balance">Stock Balance</TabsTrigger>
            <TabsTrigger value="low">Low Stock Alerts</TabsTrigger>
            <TabsTrigger value="movements">Movement Report</TabsTrigger>
            <TabsTrigger value="valuation">Valuation</TabsTrigger>
          </TabsList>

          <TabsContent value="balance">
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Item Code</TableHead><TableHead>Item Name</TableHead><TableHead>Store</TableHead><TableHead>Qty</TableHead><TableHead>Reorder Level</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {stockBalance.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono">{s.inventory_items?.item_code}</TableCell>
                      <TableCell>{s.inventory_items?.name}</TableCell>
                      <TableCell>{s.inventory_stores?.name}</TableCell>
                      <TableCell className="font-medium">{s.quantity}</TableCell>
                      <TableCell>{s.inventory_items?.reorder_level}</TableCell>
                      <TableCell>
                        {s.quantity <= (s.inventory_items?.min_stock_level || 0) ? <Badge variant="destructive">Critical</Badge> :
                         s.quantity <= (s.inventory_items?.reorder_level || 0) ? <Badge variant="secondary">Low</Badge> :
                         <Badge variant="default">OK</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="low">
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Item</TableHead><TableHead>Store</TableHead><TableHead>Current Qty</TableHead><TableHead>Reorder Level</TableHead><TableHead>Action Needed</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {lowStock.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No low stock alerts 🎉</TableCell></TableRow> :
                  lowStock.map(s => (
                    <TableRow key={s.id}>
                      <TableCell>{s.inventory_items?.item_code} - {s.inventory_items?.name}</TableCell>
                      <TableCell>{s.inventory_stores?.name}</TableCell>
                      <TableCell className="font-medium text-destructive">{s.quantity}</TableCell>
                      <TableCell>{s.inventory_items?.reorder_level}</TableCell>
                      <TableCell><Badge variant="destructive">Reorder Required</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="movements">
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Item</TableHead><TableHead>Store</TableHead><TableHead>Qty</TableHead><TableHead>Ref</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {movements.map(m => (
                    <TableRow key={m.id}>
                      <TableCell>{new Date(m.created_at).toLocaleDateString()}</TableCell>
                      <TableCell><Badge variant="outline">{m.transaction_type.toUpperCase()}</Badge></TableCell>
                      <TableCell>{m.inventory_items?.name}</TableCell>
                      <TableCell>{m.inventory_stores?.name}</TableCell>
                      <TableCell>{m.quantity}</TableCell>
                      <TableCell>{m.reference_number || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="valuation">
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Item</TableHead><TableHead>Store</TableHead><TableHead>Qty</TableHead><TableHead>Unit Cost</TableHead><TableHead>Total Value</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {stockBalance.map(s => (
                    <TableRow key={s.id}>
                      <TableCell>{s.inventory_items?.name}</TableCell>
                      <TableCell>{s.inventory_stores?.name}</TableCell>
                      <TableCell>{s.quantity}</TableCell>
                      <TableCell>{(s.inventory_items?.cost_price || 0).toLocaleString()}</TableCell>
                      <TableCell className="font-medium">{(s.quantity * (s.inventory_items?.cost_price || 0)).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={4}>Total Stock Value</TableCell>
                    <TableCell>{totalValue.toLocaleString()}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedPage>
  );
}
