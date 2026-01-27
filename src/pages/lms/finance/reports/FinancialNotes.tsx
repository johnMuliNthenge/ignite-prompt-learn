import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProtectedPage } from '@/components/auth/ProtectedPage';

const MODULE_CODE = 'finance.reports';

export default function FinancialNotes() {
  return (
    <ProtectedPage moduleCode={MODULE_CODE} title="Notes to Financial Statements">
      <div className="p-6 space-y-6">
        <div><h1 className="text-3xl font-bold">Notes to Financial Statements</h1><p className="text-muted-foreground">Supplementary disclosures</p></div>
        <Card><CardHeader><CardTitle>Financial Notes</CardTitle></CardHeader><CardContent><p className="text-muted-foreground text-center py-8">Notes and disclosures will be compiled here.</p></CardContent></Card>
      </div>
    </ProtectedPage>
  );
}
