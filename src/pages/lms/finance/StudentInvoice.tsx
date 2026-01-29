import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import FeeTemplateManager from '@/components/lms/finance/FeeTemplateManager';
import StudentInvoicing from '@/components/lms/finance/StudentInvoicing';

const MODULE_CODE = 'finance.student_invoice';

export default function StudentInvoice() {
  const [activeTab, setActiveTab] = useState('fee-setup');

  return (
    <ProtectedPage moduleCode={MODULE_CODE} title="Student Invoice">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Student Invoice</h1>
          <p className="text-muted-foreground">
            Create fee structures and invoice students
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="fee-setup">Fee Setup</TabsTrigger>
            <TabsTrigger value="invoice-student">Invoice Student</TabsTrigger>
          </TabsList>

          <TabsContent value="fee-setup" className="mt-6">
            <FeeTemplateManager />
          </TabsContent>

          <TabsContent value="invoice-student" className="mt-6">
            <StudentInvoicing />
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedPage>
  );
}
