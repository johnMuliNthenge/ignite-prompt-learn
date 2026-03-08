import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileText, Search, Printer, Mail, Eye, Send, Loader2 } from 'lucide-react';
import { useInstitution } from '@/contexts/InstitutionContext';

const PayslipManagement = () => {
  const { institution } = useInstitution();
  const [payslips, setPayslips] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showPayslip, setShowPayslip] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);
  const [payslipDetails, setPayslipDetails] = useState<any[]>([]);
  const [sending, setSending] = useState<string | null>(null);
  const [sendingAll, setSendingAll] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

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

  const sendPayslipEmail = async (ps: any) => {
    const email = ps.hr_employees?.email;
    if (!email) { toast.error('Employee has no email address configured'); return; }

    setSending(ps.id);
    try {
      const { data, error } = await supabase.functions.invoke('send-payslip', {
        body: { payslipId: ps.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await supabase.from('payslips').update({ email_sent: true, email_sent_at: new Date().toISOString() }).eq('id', ps.id);
      toast.success(`Payslip sent to ${email}`);
      fetchPayslips();
    } catch (err: any) {
      toast.error(`Failed to send: ${err.message}`);
    } finally {
      setSending(null);
    }
  };

  const sendAllPayslips = async () => {
    const unsent = filtered.filter(ps => !ps.email_sent && ps.hr_employees?.email);
    if (unsent.length === 0) { toast.info('No unsent payslips with valid email addresses'); return; }
    if (!confirm(`Send payslips to ${unsent.length} employees?`)) return;

    setSendingAll(true);
    let sent = 0, failed = 0;
    for (const ps of unsent) {
      try {
        const { data, error } = await supabase.functions.invoke('send-payslip', {
          body: { payslipId: ps.id },
        });
        if (error || data?.error) { failed++; continue; }
        await supabase.from('payslips').update({ email_sent: true, email_sent_at: new Date().toISOString() }).eq('id', ps.id);
        sent++;
      } catch { failed++; }
    }
    toast.success(`${sent} payslips sent, ${failed} failed`);
    setSendingAll(false);
    fetchPayslips();
  };

  const printPayslip = () => {
    if (!printRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Payslip - ${selectedPayslip?.payslip_number}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 30px; color: #333; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
        .header h1 { margin: 0; font-size: 20px; }
        .header p { margin: 5px 0; color: #666; font-size: 12px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; font-size: 13px; }
        .info-grid div { padding: 3px 0; }
        .info-grid strong { margin-left: 5px; }
        .section { margin-bottom: 15px; }
        .section h3 { font-size: 14px; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
        .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; border-bottom: 1px dotted #eee; }
        .total { font-weight: bold; font-size: 14px; border-top: 2px solid #333; padding-top: 8px; margin-top: 8px; }
        .columns { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
        .net-pay { text-align: center; font-size: 18px; font-weight: bold; margin-top: 20px; padding: 15px; border: 2px solid #333; }
        .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #999; }
        @media print { body { padding: 15px; } }
      </style></head><body>
      ${printRef.current.innerHTML}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 300);
  };

  const filtered = payslips.filter(ps => {
    const name = `${ps.hr_employees?.first_name || ''} ${ps.hr_employees?.last_name || ''}`.toLowerCase();
    return name.includes(search.toLowerCase()) || ps.payslip_number.toLowerCase().includes(search.toLowerCase());
  });

  const earnings = payslipDetails.filter(d => d.component_type === 'earning');
  const deductions = payslipDetails.filter(d => d.component_type === 'deduction');
  const reliefs = payslipDetails.filter(d => d.component_type === 'relief');
  const employerItems = payslipDetails.filter(d => d.component_type === 'employer');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><FileText className="h-6 w-6" /><h1 className="text-2xl font-bold">Payslip Management</h1></div>
        {filtered.length > 0 && (
          <Button onClick={sendAllPayslips} disabled={sendingAll}>
            {sendingAll ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            {sendingAll ? 'Sending...' : 'Email All Unsent'}
          </Button>
        )}
      </div>

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
                  <TableHead>Email Status</TableHead>
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
                      <TableCell>
                        <Badge variant={ps.email_sent ? 'default' : 'secondary'}>
                          {ps.email_sent ? 'Sent' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => viewPayslip(ps)} title="View"><Eye className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => sendPayslipEmail(ps)} disabled={sending === ps.id} title="Send Email">
                            {sending === ps.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                          </Button>
                        </div>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Payslip: {selectedPayslip?.payslip_number}</DialogTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={printPayslip}><Printer className="h-4 w-4 mr-1" />Print</Button>
                <Button size="sm" onClick={() => selectedPayslip && sendPayslipEmail(selectedPayslip)} disabled={sending === selectedPayslip?.id}>
                  {sending === selectedPayslip?.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Mail className="h-4 w-4 mr-1" />}Email
                </Button>
              </div>
            </div>
          </DialogHeader>
          {selectedPayslip && (
            <>
              <div ref={printRef}>
                <div className="header" style={{ textAlign: 'center', borderBottom: '2px solid #333', paddingBottom: '15px', marginBottom: '20px' }}>
                  <h1 style={{ margin: 0, fontSize: '20px' }}>{institution?.name || 'Institution'}</h1>
                  <p style={{ margin: '5px 0', color: '#666', fontSize: '12px' }}>PAYSLIP - {selectedPayslip.payroll_periods?.name || ''}</p>
                  <p style={{ margin: '5px 0', color: '#666', fontSize: '12px' }}>Payslip No: {selectedPayslip.payslip_number}</p>
                </div>
                <div className="info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px', fontSize: '13px' }}>
                  <div>Employee: <strong>{selectedPayslip.hr_employees?.first_name} {selectedPayslip.hr_employees?.middle_name || ''} {selectedPayslip.hr_employees?.last_name}</strong></div>
                  <div>Staff ID: <strong>{selectedPayslip.hr_employees?.employee_no}</strong></div>
                  <div>Department: <strong>{selectedPayslip.hr_employees?.hr_departments?.name || '-'}</strong></div>
                  <div>Period: <strong>{selectedPayslip.payroll_periods?.name}</strong></div>
                </div>
                <div className="columns" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                  <div className="section">
                    <h3 style={{ fontSize: '14px', marginBottom: '8px', borderBottom: '1px solid #ddd', paddingBottom: '4px', color: 'green' }}>Earnings</h3>
                    {earnings.map((d, i) => (
                      <div key={i} className="row" style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px', borderBottom: '1px dotted #eee' }}>
                        <span>{d.component_name}</span><span>{d.amount?.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="total" style={{ fontWeight: 'bold', borderTop: '2px solid #333', paddingTop: '8px', marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Gross Pay</span><span>{selectedPayslip.gross_pay?.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="section">
                    <h3 style={{ fontSize: '14px', marginBottom: '8px', borderBottom: '1px solid #ddd', paddingBottom: '4px', color: 'red' }}>Deductions</h3>
                    {deductions.map((d, i) => (
                      <div key={i} className="row" style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px', borderBottom: '1px dotted #eee' }}>
                        <span>{d.component_name} {d.is_statutory ? '(Statutory)' : ''}</span><span>{d.amount?.toLocaleString()}</span>
                      </div>
                    ))}
                    {reliefs.map((d, i) => (
                      <div key={i} className="row" style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px', borderBottom: '1px dotted #eee', color: 'blue' }}>
                        <span>{d.component_name}</span><span>({d.amount?.toLocaleString()})</span>
                      </div>
                    ))}
                    <div className="total" style={{ fontWeight: 'bold', borderTop: '2px solid #333', paddingTop: '8px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', color: 'red' }}>
                      <span>Total Deductions</span><span>{selectedPayslip.total_deductions?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                {employerItems.length > 0 && (
                  <div className="section" style={{ marginTop: '15px' }}>
                    <h3 style={{ fontSize: '14px', marginBottom: '8px', borderBottom: '1px solid #ddd', paddingBottom: '4px', color: '#2563eb' }}>Employer Contributions (Not deducted from salary)</h3>
                    {employerItems.map((d, i) => (
                      <div key={i} className="row" style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px', borderBottom: '1px dotted #eee' }}>
                        <span>{d.component_name}</span><span>{d.amount?.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="net-pay" style={{ textAlign: 'center', fontSize: '18px', fontWeight: 'bold', marginTop: '20px', padding: '15px', border: '2px solid #333' }}>
                  NET PAY: {selectedPayslip.net_pay?.toLocaleString()}
                </div>
                <div className="footer" style={{ textAlign: 'center', marginTop: '30px', fontSize: '11px', color: '#999' }}>
                  This is a computer-generated payslip. No signature required.
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayslipManagement;
