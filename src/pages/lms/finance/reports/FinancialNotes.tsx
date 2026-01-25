import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function FinancialNotes() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <div className="p-6"><p className="text-muted-foreground">Access denied.</p></div>;

  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-3xl font-bold">Notes to Financial Statements</h1><p className="text-muted-foreground">Supplementary disclosures</p></div>
      <Card><CardHeader><CardTitle>Financial Notes</CardTitle></CardHeader><CardContent><p className="text-muted-foreground text-center py-8">Notes and disclosures will be compiled here.</p></CardContent></Card>
    </div>
  );
}
