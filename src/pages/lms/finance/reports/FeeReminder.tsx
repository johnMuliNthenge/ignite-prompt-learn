import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

export default function FeeReminder() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <div className="p-6"><p className="text-muted-foreground">Access denied.</p></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Fee Reminder</h1><p className="text-muted-foreground">Send fee payment reminders to students</p></div>
        <Button><Send className="mr-2 h-4 w-4" />Send Reminders</Button>
      </div>
      <Card><CardHeader><CardTitle>Students with Outstanding Balances</CardTitle></CardHeader><CardContent><p className="text-muted-foreground text-center py-8">List of students requiring fee reminders.</p></CardContent></Card>
    </div>
  );
}
