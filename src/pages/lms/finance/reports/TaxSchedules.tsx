import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function TaxSchedules() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <div className="p-6"><p className="text-muted-foreground">Access denied.</p></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Tax Schedules</h1><p className="text-muted-foreground">VAT, WHT and other tax reports</p></div>
        <Button variant="outline"><Download className="mr-2 h-4 w-4" />Export</Button>
      </div>
      <Card><CardHeader><CardTitle>Tax Schedules</CardTitle></CardHeader><CardContent><p className="text-muted-foreground text-center py-8">Tax computation schedules will be displayed here.</p></CardContent></Card>
    </div>
  );
}
