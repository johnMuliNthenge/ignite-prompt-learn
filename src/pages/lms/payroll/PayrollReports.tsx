import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, Printer } from 'lucide-react';

const PayrollReports = () => {
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [deptData, setDeptData] = useState<any[]>([]);
  const [statutoryData, setStatutoryData] = useState<any[]>([]);
  const [bankData, setBankData] = useState<any[]>([]);
  const [payeData, setPayeData] = useState<any[]>([]);
  const [nssfData, setNssfData] = useState<any[]>([]);
  const [nhifData, setNhifData] = useState<any[]>([]);
  const [shifData, setShifData] = useState<any[]>([]);
  const [housingData, setHousingData] = useState<any[]>([]);
  const [loanData, setLoanData] = useState<any[]>([]);
  const [fiData, setFiData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [allDetails, setAllDetails] = useState<Record<string, any[]>>({});
  const [empAccounts, setEmpAccounts] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('payroll_periods').select('id, name').order('period_start', { ascending: false }).then(({ data }) => setPeriods(data || []));
  }, []);

  useEffect(() => { if (selectedPeriod) fetchReports(); }, [selectedPeriod]);

  const fetchReports = async () => {
    setLoading(true);
    const { data: runs } = await supabase.from('payroll_runs').select('id').eq('period_id', selectedPeriod).in('status', ['computed', 'approved', 'finalized', 'posted']);
    if (!runs || runs.length === 0) { setLoading(false); setSummaryData([]); return; }
    const runId = runs[0].id;

    const { data: items } = await supabase.from('payroll_items').select('*, hr_employees(employee_no, first_name, middle_name, last_name, hr_departments(name))').eq('payroll_run_id', runId);
    const empIds = (items || []).map(i => i.employee_id);
    const [accRes, detailsRes, fiRes] = await Promise.all([
      supabase.from('employee_payroll_accounts').select('employee_id, bank_name, bank_account_number, disbursement_mode_id, tax_number, pension_number').in('employee_id', empIds),
      supabase.from('payroll_item_details').select('*').in('payroll_item_id', (items || []).map(i => i.id)),
      supabase.from('employee_bank_accounts').select('*, financial_institutions(name, bank_code)').in('employee_id', empIds).eq('is_active', true),
    ]);

    setEmpAccounts(accRes.data || []);
    setSummaryData(items || []);

    const details = detailsRes.data || [];
    const grouped: Record<string, any[]> = {};
    details.forEach(d => {
      if (!grouped[d.payroll_item_id]) grouped[d.payroll_item_id] = [];
      grouped[d.payroll_item_id].push(d);
    });
    setAllDetails(grouped);

    // Department
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

    // All statutory
    const statDetails = details.filter(d => d.is_statutory);
    const statMap: Record<string, { name: string, total: number }> = {};
    statDetails.forEach(d => {
      if (!statMap[d.component_name]) statMap[d.component_name] = { name: d.component_name, total: 0 };
      statMap[d.component_name].total += d.amount || 0;
    });
    setStatutoryData(Object.values(statMap));

    // Per-statutory breakdowns
    const buildStatBreakdown = (keyword: string) => {
      return (items || []).map(i => {
        const det = (grouped[i.id] || []).find(d => d.component_name?.toLowerCase().includes(keyword));
        if (!det) return null;
        const acc = (accRes.data || []).find(a => a.employee_id === i.employee_id);
        return { ...i, amount: det.amount, tax_number: acc?.tax_number || '' };
      }).filter(Boolean);
    };
    setPayeData(buildStatBreakdown('paye') as any[]);
    setNssfData(buildStatBreakdown('nssf') as any[]);
    setNhifData(buildStatBreakdown('nhif') as any[]);
    setShifData(buildStatBreakdown('shif') as any[]);
    setHousingData(buildStatBreakdown('housing') as any[]);

    // Loans
    const loanDetails = details.filter(d => ['loan', 'salary_advance'].includes(d.category));
    const loanMap: Record<string, { employee: string, loans: any[] }> = {};
    loanDetails.forEach(d => {
      const item = (items || []).find(i => i.id === d.payroll_item_id);
      const empName = item ? `${item.hr_employees?.first_name || ''} ${item.hr_employees?.last_name || ''}` : 'Unknown';
      const key = item?.employee_id || 'unknown';
      if (!loanMap[key]) loanMap[key] = { employee: empName, loans: [] };
      loanMap[key].loans.push(d);
    });
    setLoanData(Object.values(loanMap));

    // Financial Institution remittance
    const fiBankMap: Record<string, { bank: string, count: number, total: number }> = {};
    (items || []).forEach(i => {
      const empBanks = (fiRes.data || []).filter(b => b.employee_id === i.employee_id);
      if (empBanks.length > 0) {
        empBanks.forEach(b => {
          const bankName = b.financial_institutions?.name || b.bank_name || 'Unknown';
          if (!fiBankMap[bankName]) fiBankMap[bankName] = { bank: bankName, count: 0, total: 0 };
          fiBankMap[bankName].count++;
          fiBankMap[bankName].total += (i.net_pay || 0) * ((b.percentage || 100) / 100);
        });
      } else {
        const acc = (accRes.data || []).find(a => a.employee_id === i.employee_id);
        const bankName = acc?.bank_name || 'Not Configured';
        if (!fiBankMap[bankName]) fiBankMap[bankName] = { bank: bankName, count: 0, total: 0 };
        fiBankMap[bankName].count++;
        fiBankMap[bankName].total += i.net_pay || 0;
      }
    });
    setFiData(Object.values(fiBankMap));
    setBankData(Object.values(fiBankMap)); // reuse for bank transfer

    setLoading(false);
  };

  const totalOf = (arr: any[], field: string) => arr.reduce((s, i) => s + ((i as any)[field] || 0), 0);

  const StatutoryBreakdownTable = ({ data, title, deductionLabel }: { data: any[], title: string, deductionLabel: string }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />Print</Button>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? <p className="text-muted-foreground text-center py-4">No data for this period</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>KRA PIN</TableHead>
                <TableHead>Gross Pay</TableHead>
                <TableHead>{deductionLabel}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((i: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell className="font-mono">{i.hr_employees?.employee_no}</TableCell>
                  <TableCell>{i.hr_employees?.first_name} {i.hr_employees?.last_name}</TableCell>
                  <TableCell>{i.tax_number || '-'}</TableCell>
                  <TableCell>{i.gross_pay?.toLocaleString()}</TableCell>
                  <TableCell className="font-bold">{i.amount?.toLocaleString()}</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold border-t-2">
                <TableCell colSpan={4}>TOTAL</TableCell>
                <TableCell>{totalOf(data, 'amount').toLocaleString()}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

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

      {selectedPeriod && !loading && (
        <Tabs defaultValue="summary">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="salary-register">Salary Register</TabsTrigger>
            <TabsTrigger value="department">Department</TabsTrigger>
            <TabsTrigger value="statutory">Statutory</TabsTrigger>
            <TabsTrigger value="paye">PAYE</TabsTrigger>
            <TabsTrigger value="nssf">NSSF</TabsTrigger>
            <TabsTrigger value="nhif">NHIF</TabsTrigger>
            <TabsTrigger value="shif">SHIF</TabsTrigger>
            <TabsTrigger value="housing">Housing Levy</TabsTrigger>
            <TabsTrigger value="fi-remittance">Bank Remittance</TabsTrigger>
            <TabsTrigger value="loans">Loan Statements</TabsTrigger>
          </TabsList>

          {/* Summary */}
          <TabsContent value="summary">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Payroll Summary</CardTitle>
                <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />Print</Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff ID</TableHead><TableHead>Name</TableHead><TableHead>Department</TableHead>
                      <TableHead>Basic</TableHead><TableHead>Gross</TableHead><TableHead>Deductions</TableHead><TableHead>Net Pay</TableHead>
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
                      <TableCell>{totalOf(summaryData, 'basic_salary').toLocaleString()}</TableCell>
                      <TableCell>{totalOf(summaryData, 'gross_pay').toLocaleString()}</TableCell>
                      <TableCell className="text-destructive">{totalOf(summaryData, 'total_deductions').toLocaleString()}</TableCell>
                      <TableCell className="text-green-600">{totalOf(summaryData, 'net_pay').toLocaleString()}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Detailed Salary Register */}
          <TabsContent value="salary-register">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Detailed Salary Register</CardTitle>
                <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />Print</Button>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff ID</TableHead><TableHead>Name</TableHead><TableHead>Basic</TableHead>
                      <TableHead>Allowances</TableHead><TableHead>Gross</TableHead>
                      <TableHead>PAYE</TableHead><TableHead>NSSF</TableHead><TableHead>NHIF/SHIF</TableHead>
                      <TableHead>H.Levy</TableHead><TableHead>Others</TableHead><TableHead>Net Pay</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaryData.map(i => {
                      const dets = allDetails[i.id] || [];
                      const findAmt = (kw: string) => dets.filter(d => d.component_name?.toLowerCase().includes(kw)).reduce((s: number, d: any) => s + (d.amount || 0), 0);
                      const allowances = dets.filter(d => d.component_type === 'earning' && d.category !== 'basic_pay').reduce((s: number, d: any) => s + (d.amount || 0), 0);
                      const paye = findAmt('paye');
                      const nssf = findAmt('nssf');
                      const nhif = findAmt('nhif') + findAmt('shif');
                      const hlevy = findAmt('housing');
                      const otherDed = (i.total_deductions || 0) - paye - nssf - nhif - hlevy;
                      return (
                        <TableRow key={i.id}>
                          <TableCell className="font-mono text-xs">{i.hr_employees?.employee_no}</TableCell>
                          <TableCell className="text-xs">{i.hr_employees?.first_name} {i.hr_employees?.last_name}</TableCell>
                          <TableCell className="text-xs">{i.basic_salary?.toLocaleString()}</TableCell>
                          <TableCell className="text-xs">{allowances > 0 ? allowances.toLocaleString() : '-'}</TableCell>
                          <TableCell className="text-xs font-medium">{i.gross_pay?.toLocaleString()}</TableCell>
                          <TableCell className="text-xs">{paye > 0 ? paye.toLocaleString() : '-'}</TableCell>
                          <TableCell className="text-xs">{nssf > 0 ? nssf.toLocaleString() : '-'}</TableCell>
                          <TableCell className="text-xs">{nhif > 0 ? nhif.toLocaleString() : '-'}</TableCell>
                          <TableCell className="text-xs">{hlevy > 0 ? hlevy.toLocaleString() : '-'}</TableCell>
                          <TableCell className="text-xs">{otherDed > 0 ? otherDed.toLocaleString() : '-'}</TableCell>
                          <TableCell className="text-xs font-bold text-green-600">{i.net_pay?.toLocaleString()}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Department */}
          <TabsContent value="department">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Department Payroll Report</CardTitle>
                <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />Print</Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Department</TableHead><TableHead>Employees</TableHead><TableHead>Total Gross</TableHead><TableHead>Total Deductions</TableHead><TableHead>Total Net</TableHead></TableRow>
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
                    <TableRow className="font-bold border-t-2">
                      <TableCell>TOTAL</TableCell>
                      <TableCell>{deptData.reduce((s, d) => s + d.count, 0)}</TableCell>
                      <TableCell>{deptData.reduce((s, d) => s + d.gross, 0).toLocaleString()}</TableCell>
                      <TableCell className="text-destructive">{deptData.reduce((s, d) => s + d.deductions, 0).toLocaleString()}</TableCell>
                      <TableCell className="text-green-600">{deptData.reduce((s, d) => s + d.net, 0).toLocaleString()}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statutory Overview */}
          <TabsContent value="statutory">
            <Card>
              <CardHeader><CardTitle>Statutory Deduction Summary</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Deduction</TableHead><TableHead>Total Amount</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {statutoryData.length === 0 ? <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">No statutory deductions</TableCell></TableRow> :
                      statutoryData.map((s, i) => (
                        <TableRow key={i}><TableCell className="font-medium">{s.name}</TableCell><TableCell className="font-bold">{s.total.toLocaleString()}</TableCell></TableRow>
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

          {/* Individual Statutory Reports */}
          <TabsContent value="paye"><StatutoryBreakdownTable data={payeData} title="Monthly PAYE Remittance" deductionLabel="PAYE Amount" /></TabsContent>
          <TabsContent value="nssf"><StatutoryBreakdownTable data={nssfData} title="Monthly NSSF Returns" deductionLabel="NSSF Amount" /></TabsContent>
          <TabsContent value="nhif"><StatutoryBreakdownTable data={nhifData} title="Monthly NHIF Returns" deductionLabel="NHIF Amount" /></TabsContent>
          <TabsContent value="shif"><StatutoryBreakdownTable data={shifData} title="Monthly SHIF Returns" deductionLabel="SHIF Amount" /></TabsContent>
          <TabsContent value="housing"><StatutoryBreakdownTable data={housingData} title="Housing Levy Remittance" deductionLabel="Housing Levy" /></TabsContent>

          {/* Financial Institution Remittance */}
          <TabsContent value="fi-remittance">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Financial Institution Remittance</CardTitle>
                <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />Print</Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Bank / Institution</TableHead><TableHead>Employees</TableHead><TableHead>Total Amount</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {fiData.map((b, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{b.bank}</TableCell>
                        <TableCell>{b.count}</TableCell>
                        <TableCell className="font-bold">{Math.round(b.total).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold border-t-2">
                      <TableCell>TOTAL</TableCell>
                      <TableCell>{fiData.reduce((s, b) => s + b.count, 0)}</TableCell>
                      <TableCell>{Math.round(fiData.reduce((s, b) => s + b.total, 0)).toLocaleString()}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Loan Statements */}
          <TabsContent value="loans">
            <Card>
              <CardHeader><CardTitle>Loan Statements</CardTitle></CardHeader>
              <CardContent>
                {loanData.length === 0 ? <p className="text-muted-foreground text-center py-4">No loan deductions this period</p> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Loan/Advance</TableHead><TableHead>Amount Deducted</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {loanData.map((l, idx) => (
                        l.loans.map((loan: any, li: number) => (
                          <TableRow key={`${idx}-${li}`}>
                            {li === 0 && <TableCell rowSpan={l.loans.length} className="font-medium">{l.employee}</TableCell>}
                            <TableCell>{loan.component_name}</TableCell>
                            <TableCell className="font-bold">{loan.amount?.toLocaleString()}</TableCell>
                          </TableRow>
                        ))
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {loading && <p className="text-center text-muted-foreground">Loading reports...</p>}
    </div>
  );
};

export default PayrollReports;
