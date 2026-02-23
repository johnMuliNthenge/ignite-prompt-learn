import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileText, Search, Download, Mail, Eye } from 'lucide-react';

const PayslipManagement = () => {
  const [payslips, setPayslips] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showPayslip, setShowPayslip] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);
  const [payslipDetails, setPayslipDetails] = useState<any[]>([]);

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { fetchPayslips(); }, [selectedPeriod]);

  const fetchData = async () => {
    const { data: p } = await supabase.from('payroll_periods').select('id, name').order('period_start', { ascending: false });
    setPeriods(p || []);
    fetchPayslips();
  };

  const fetchPayslips = async () => {
    setLoading(true);
    let query = supabase.from('payslips').select('*, hr_employees(employee_no, first_name, middle_name, last_name, email, hr_departments(name)), payroll_periods(name)').order('created_at', { ascending: false });
    if (selectedPeriod !== 'all') query = query.eq('period_id', selectedPeriod);
    const { data } = await query;
    setPayslips(data || []);
    setLoading(false);
  };

  const viewPayslip = async (ps: any) => {
    setSelectedPayslip(ps);
    const { data } = await supabase.from('payroll_item_details').select('*').eq('payroll_item_id', ps.payroll_item_id).order('component_type');
    setPayslipDetails(data || []);
    setShowPayslip(true);
  };

  const filtered = payslips.filter(ps => {
    const name = `${ps.hr_employees?.first_name || ''} ${ps.hr_employees?.last_name || ''}`.toLowerCase();
    return name.includes(search.toLowerCase()) || ps.payslip_number.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2"><FileText className="h-6 w-6" /><h1 className="text-2xl font-bold">Payslip Management</h1></div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-10" placeholder="Search payslips..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="min-w-[200px]">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger><SelectValue placeholder="All periods" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Periods</SelectItem>
                  {periods.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <p>Loading...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payslip #</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Pay</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">No payslips found</TableCell></TableRow> :
                  filtered.map(ps => (
                    <TableRow key={ps.id}>
                      <TableCell className="font-mono">{ps.payslip_number}</TableCell>
                      <TableCell className="font-medium">{ps.hr_employees?.first_name} {ps.hr_employees?.last_name}</TableCell>
                      <TableCell>{ps.hr_employees?.hr_departments?.name || '-'}</TableCell>
                      <TableCell>{ps.payroll_periods?.name || '-'}</TableCell>
                      <TableCell>{ps.gross_pay?.toLocaleString()}</TableCell>
                      <TableCell className="text-destructive">{ps.total_deductions?.toLocaleString()}</TableCell>
                      <TableCell className="font-bold text-green-600">{ps.net_pay?.toLocaleString()}</TableCell>
                      <TableCell><Badge variant={ps.email_sent ? 'default' : 'secondary'}>{ps.email_sent ? 'Sent' : 'Pending'}</Badge></TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => viewPayslip(ps)}><Eye className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))
                }
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payslip Preview Dialog */}
      <Dialog open={showPayslip} onOpenChange={setShowPayslip}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Payslip: {selectedPayslip?.payslip_number}</DialogTitle></DialogHeader>
          {selectedPayslip && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Employee:</span> <strong>{selectedPayslip.hr_employees?.first_name} {selectedPayslip.hr_employees?.last_name}</strong></div>
                <div><span className="text-muted-foreground">Staff ID:</span> <strong>{selectedPayslip.hr_employees?.employee_no}</strong></div>
                <div><span className="text-muted-foreground">Department:</span> <strong>{selectedPayslip.hr_employees?.hr_departments?.name}</strong></div>
                <div><span className="text-muted-foreground">Period:</span> <strong>{selectedPayslip.payroll_periods?.name}</strong></div>
              </div>
              <div className="border-t pt-4 grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-green-700 mb-2">Earnings</h4>
                  {payslipDetails.filter(d => d.component_type === 'earning').map((d, i) => (
                    <div key={i} className="flex justify-between text-sm py-1 border-b border-border/50">
                      <span>{d.component_name}</span><span>{d.amount?.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold pt-2">
                    <span>Gross Pay</span><span>{selectedPayslip.gross_pay?.toLocaleString()}</span>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-destructive mb-2">Deductions</h4>
                  {payslipDetails.filter(d => d.component_type === 'deduction').map((d, i) => (
                    <div key={i} className="flex justify-between text-sm py-1 border-b border-border/50">
                      <span>{d.component_name}</span><span>{d.amount?.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold pt-2 text-destructive">
                    <span>Total Deductions</span><span>{selectedPayslip.total_deductions?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div className="border-t pt-4 flex justify-between text-xl font-bold">
                <span>Net Pay</span><span className="text-green-600">{selectedPayslip.net_pay?.toLocaleString()}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayslipManagement;
