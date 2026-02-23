import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Shield } from 'lucide-react';
import { format } from 'date-fns';

const PayrollAuditLog = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('payroll_audit_log').select('*').order('performed_at', { ascending: false }).limit(200);
      // Get user emails
      const userIds = [...new Set((data || []).map(l => l.performed_by).filter(Boolean))];
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data: p } = await supabase.from('lms_profiles').select('user_id, full_name, email').in('user_id', userIds);
        profiles = p || [];
      }
      setLogs((data || []).map(l => ({
        ...l,
        user: profiles.find(p => p.user_id === l.performed_by),
      })));
      setLoading(false);
    };
    fetch();
  }, []);

  const actionColors: Record<string, string> = {
    payroll_processed: 'default',
    payroll_approved: 'secondary',
    payroll_finalized: 'outline',
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2"><Shield className="h-6 w-6" /><h1 className="text-2xl font-bold">Payroll Audit Log</h1></div>
      <Card>
        <CardContent className="pt-6">
          {loading ? <p>Loading...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Performed By</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No audit logs</TableCell></TableRow> :
                  logs.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="text-sm">{format(new Date(l.performed_at), 'dd MMM yyyy HH:mm')}</TableCell>
                      <TableCell><Badge variant={actionColors[l.action] as any || 'default'}>{l.action.replace(/_/g, ' ')}</Badge></TableCell>
                      <TableCell>{l.entity_type}</TableCell>
                      <TableCell>{l.user?.full_name || l.user?.email || l.performed_by?.slice(0, 8)}</TableCell>
                      <TableCell className="text-xs max-w-[300px] truncate">{l.details ? JSON.stringify(l.details) : '-'}</TableCell>
                    </TableRow>
                  ))
                }
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollAuditLog;
