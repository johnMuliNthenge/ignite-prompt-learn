import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3 } from 'lucide-react';

const PayrollReports = () => {
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [deptData, setDeptData] = useState<any[]>([]);
  const [statutoryData, setStatutoryData] = useState<any[]>([]);
  const [bankData, setBankData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('payroll_periods').select('id, name').order('period_start', { ascending: false }).then(({ data }) => setPeriods(data || []));
  }, []);

  useEffect(() => { if (selectedPeriod) fetchReports(); }, [selectedPeriod]);

  const fetchReports = async () => {
    setLoading(true);

    // Get run for period
    const { data: runs } = await supabase.from('payroll_runs').select('id').eq('period_id', selectedPeriod).in('status', ['computed', 'approved', 'finalized', 'posted']);
    if (!runs || runs.length === 0) { setLoading(false); setSummaryData([]); return; }
    const runId = runs[0].id;

    // Summary
    const { data: items } = await supabase.from('payroll_items').select('*, hr_employees(employee_no, first_name, last_name, hr_departments(name))').eq('payroll_run_id', runId);
    // Get employee payroll accounts separately for bank info
    const empIds = (items || []).map(i => i.employee_id);
    const { data: empAccounts } = await supabase.from('employee_payroll_accounts').select('employee_id, bank_name, bank_account_number, payment_mode_id').in('employee_id', empIds);
    const { data: pmodes } = await supabase.from('payment_modes').select('id, name');
    setSummaryData(items || []);

    // Dept grouping
    const deptMap: Record<string, { dept: string, gross: number, deductions: number, net: number, count: number }> = {};
    (items || []).forEach(i => {
      const dept = i.hr_employees?.hr_departments?.name || 'Unassigned';
      if (!deptMap[dept]) deptMap[dept] = { dept, gross: 0, deductions: 0, net: 0, count: 0 };
      deptMap[dept].gross += i.gross_pay || 0;
      deptMap[dept].deductions += i.total_deductions || 0;
      deptMap[dept].net += i.net_pay || 0;
      deptMap[dept].count++;
    });
    setDeptData(Object.values(deptMap));

    // Statutory
    const { data: details } = await supabase.from('payroll_item_details').select('*').in('payroll_item_id', (items || []).map(i => i.id)).eq('is_statutory', true);
    const statMap: Record<string, { name: string, total: number }> = {};
    (details || []).forEach(d => {
      if (!statMap[d.component_name]) statMap[d.component_name] = { name: d.component_name, total: 0 };
      statMap[d.component_name].total += d.amount || 0;
    });
    setStatutoryData(Object.values(statMap));

    // Bank transfer
    const bankMap: Record<string, any[]> = {};
    (items || []).forEach(i => {
      const empAcc = (empAccounts || []).find((ea: any) => ea.employee_id === i.employee_id);
      const pm = empAcc ? (pmodes || []).find((p: any) => p.id === empAcc.payment_mode_id)?.name || 'Unknown' : 'Unknown';
      if (!bankMap[pm]) bankMap[pm] = [];
      bankMap[pm].push(i);
    });
    setBankData(Object.entries(bankMap).map(([mode, items]) => ({
      mode,
      count: items.length,
      total: items.reduce((sum: number, i: any) => sum + (i.net_pay || 0), 0),
    })));

    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2"><BarChart3 className="h-6 w-6" /><h1 className="text-2xl font-bold">Payroll Reports</h1></div>

      <Card>
        <CardContent className="pt-6">
          <div className="max-w-sm">
            <Label>Select Period</Label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger><SelectValue placeholder="Select period" /></SelectTrigger>
              <SelectContent>{periods.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedPeriod && (
        <Tabs defaultValue="summary">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="department">By Department</TabsTrigger>
            <TabsTrigger value="statutory">Statutory</TabsTrigger>
            <TabsTrigger value="bank">Bank Transfer</TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <Card>
              <CardHeader><CardTitle>Payroll Summary</CardTitle></CardHeader>
              <CardContent>
                {loading ? <p>Loading...</p> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Basic</TableHead>
                        <TableHead>Gross</TableHead>
                        <TableHead>Deductions</TableHead>
                        <TableHead>Net Pay</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summaryData.map(i => (
                        <TableRow key={i.id}>
                          <TableCell className="font-mono">{i.hr_employees?.employee_no}</TableCell>
                          <TableCell>{i.hr_employees?.first_name} {i.hr_employees?.last_name}</TableCell>
                          <TableCell>{i.hr_employees?.hr_departments?.name || '-'}</TableCell>
                          <TableCell>{i.basic_salary?.toLocaleString()}</TableCell>
                          <TableCell>{i.gross_pay?.toLocaleString()}</TableCell>
                          <TableCell className="text-destructive">{i.total_deductions?.toLocaleString()}</TableCell>
                          <TableCell className="font-bold text-green-600">{i.net_pay?.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold border-t-2">
                        <TableCell colSpan={3}>TOTALS</TableCell>
                        <TableCell>{summaryData.reduce((s, i) => s + (i.basic_salary || 0), 0).toLocaleString()}</TableCell>
                        <TableCell>{summaryData.reduce((s, i) => s + (i.gross_pay || 0), 0).toLocaleString()}</TableCell>
                        <TableCell className="text-destructive">{summaryData.reduce((s, i) => s + (i.total_deductions || 0), 0).toLocaleString()}</TableCell>
                        <TableCell className="text-green-600">{summaryData.reduce((s, i) => s + (i.net_pay || 0), 0).toLocaleString()}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="department">
            <Card>
              <CardHeader><CardTitle>Department Payroll Report</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Department</TableHead>
                      <TableHead>Employees</TableHead>
                      <TableHead>Total Gross</TableHead>
                      <TableHead>Total Deductions</TableHead>
                      <TableHead>Total Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deptData.map((d, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{d.dept}</TableCell>
                        <TableCell>{d.count}</TableCell>
                        <TableCell>{d.gross.toLocaleString()}</TableCell>
                        <TableCell className="text-destructive">{d.deductions.toLocaleString()}</TableCell>
                        <TableCell className="font-bold text-green-600">{d.net.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statutory">
            <Card>
              <CardHeader><CardTitle>Statutory Deduction Report</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Deduction</TableHead><TableHead>Total Amount</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {statutoryData.length === 0 ? <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">No statutory deductions</TableCell></TableRow> :
                      statutoryData.map((s, i) => (
                        <TableRow key={i}><TableCell className="font-medium">{s.name}</TableCell><TableCell>{s.total.toLocaleString()}</TableCell></TableRow>
                      ))
                    }
                    <TableRow className="font-bold border-t-2">
                      <TableCell>TOTAL</TableCell>
                      <TableCell>{statutoryData.reduce((s, d) => s + d.total, 0).toLocaleString()}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bank">
            <Card>
              <CardHeader><CardTitle>Bank Transfer Report</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Payment Mode</TableHead><TableHead>Employees</TableHead><TableHead>Total Amount</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {bankData.map((b, i) => (
                      <TableRow key={i}><TableCell className="font-medium">{b.mode}</TableCell><TableCell>{b.count}</TableCell><TableCell className="font-bold">{b.total.toLocaleString()}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default PayrollReports;
