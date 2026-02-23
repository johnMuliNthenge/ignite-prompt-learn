import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Play, RotateCcw, CheckCircle, Lock, DollarSign } from 'lucide-react';

const PayrollProcessing = () => {
  const { user } = useAuth();
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [currentRun, setCurrentRun] = useState<any>(null);
  const [payrollItems, setPayrollItems] = useState<any[]>([]);
  const [itemDetails, setItemDetails] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => { fetchPeriods(); }, []);
  useEffect(() => { if (selectedPeriodId) fetchRun(); }, [selectedPeriodId]);

  const fetchPeriods = async () => {
    const { data } = await supabase.from('payroll_periods').select('*').in('status', ['open', 'processing']).order('period_start', { ascending: false });
    setPeriods(data || []);
    setLoading(false);
  };

  const fetchRun = async () => {
    const { data: runs } = await supabase.from('payroll_runs').select('*').eq('period_id', selectedPeriodId).order('created_at', { ascending: false }).limit(1);
    if (runs && runs.length > 0) {
      setCurrentRun(runs[0]);
      await fetchItems(runs[0].id);
    } else {
      setCurrentRun(null);
      setPayrollItems([]);
      setItemDetails({});
    }
  };

  const fetchItems = async (runId: string) => {
    const { data: items } = await supabase.from('payroll_items').select('*, hr_employees(employee_no, first_name, middle_name, last_name, hr_departments(name))').eq('payroll_run_id', runId).order('created_at');
    setPayrollItems(items || []);
    // Fetch details for all items
    if (items && items.length > 0) {
      const { data: details } = await supabase.from('payroll_item_details').select('*').in('payroll_item_id', items.map(i => i.id)).order('component_type', { ascending: false });
      const grouped: Record<string, any[]> = {};
      (details || []).forEach(d => {
        if (!grouped[d.payroll_item_id]) grouped[d.payroll_item_id] = [];
        grouped[d.payroll_item_id].push(d);
      });
      setItemDetails(grouped);
    }
  };

  const startPayroll = async () => {
    setProcessing(true);
    try {
      // Create payroll run
      const { data: run, error: runErr } = await supabase.from('payroll_runs').insert({
        period_id: selectedPeriodId,
        status: 'processing',
        processed_by: user?.id,
      }).select().single();
      if (runErr) throw runErr;

      // Get all active employee payroll accounts
      const { data: empAccounts } = await supabase.from('employee_payroll_accounts').select('*, hr_employees(id, first_name, last_name, status), salary_structures(id, name)').eq('is_active', true);
      const activeAccounts = (empAccounts || []).filter(ea => ea.hr_employees?.status === 'active');

      if (activeAccounts.length === 0) { toast.error('No active employees with payroll accounts'); setProcessing(false); return; }

      // Get statutory deductions
      const { data: statConfigs } = await supabase.from('statutory_deduction_configs').select('*').eq('is_active', true);
      const { data: taxBands } = await supabase.from('payroll_tax_bands').select('*').order('sort_order');

      // Get employee deductions
      const { data: empDeductions } = await supabase.from('employee_deductions').select('*').eq('is_active', true);

      let totalGross = 0, totalDeductions = 0, totalNet = 0;

      for (const account of activeAccounts) {
        // Get salary components for this structure
        let components: any[] = [];
        if (account.salary_structure_id) {
          const { data: comps } = await supabase.from('salary_components').select('*').eq('structure_id', account.salary_structure_id).order('sort_order');
          components = comps || [];
        }

        const basicSalary = account.basic_salary || 0;
        let grossPay = basicSalary;
        const detailItems: any[] = [];

        // Add basic pay
        detailItems.push({ component_name: 'Basic Pay', component_type: 'earning', category: 'basic_pay', amount: basicSalary });

        // Calculate earnings
        const earnings = components.filter(c => c.component_type === 'earning' && c.category !== 'basic_pay');
        for (const comp of earnings) {
          let amount = 0;
          if (comp.calculation_type === 'fixed') {
            amount = comp.default_amount || 0;
          } else if (comp.calculation_type === 'percentage') {
            const baseAmount = comp.percentage_of?.toLowerCase() === 'basic pay' ? basicSalary : grossPay;
            amount = baseAmount * (comp.default_amount / 100);
          }
          grossPay += amount;
          detailItems.push({ component_name: comp.name, component_type: 'earning', category: comp.category, amount });
        }

        let totalDed = 0;
        let taxableIncome = grossPay;

        // Calculate statutory deductions
        for (const stat of (statConfigs || [])) {
          let dedAmount = 0;
          const bands = (taxBands || []).filter(b => b.statutory_config_id === stat.id);

          if (stat.deduction_type === 'tax' && bands.length > 0) {
            // PAYE calculation using bands
            let remainingIncome = taxableIncome;
            for (const band of bands) {
              const lower = band.lower_limit || 0;
              const upper = band.upper_limit || Infinity;
              const bandWidth = upper - lower;
              const applicableAmount = Math.min(Math.max(remainingIncome - lower, 0), bandWidth);
              if (applicableAmount > 0) {
                dedAmount += applicableAmount * band.rate + (band.fixed_amount || 0);
              }
              if (remainingIncome <= upper) break;
            }
          } else if (bands.length > 0) {
            // Use first band rate for non-tax statutory
            const band = bands[0];
            dedAmount = grossPay * band.rate + (band.fixed_amount || 0);
          }

          if (dedAmount > 0) {
            totalDed += dedAmount;
            detailItems.push({ component_name: stat.name, component_type: 'deduction', category: 'statutory', amount: dedAmount, is_statutory: true, statutory_config_id: stat.id });
          }
        }

        // Structure-based deductions
        const deductions = components.filter(c => c.component_type === 'deduction');
        for (const comp of deductions) {
          let amount = 0;
          if (comp.calculation_type === 'fixed') { amount = comp.default_amount || 0; }
          else if (comp.calculation_type === 'percentage') {
            const base = comp.percentage_of?.toLowerCase() === 'basic pay' ? basicSalary : grossPay;
            amount = base * (comp.default_amount / 100);
          }
          totalDed += amount;
          detailItems.push({ component_name: comp.name, component_type: 'deduction', category: comp.category, amount });
        }

        // Employee-specific deductions (loans, advances)
        const empDeds = (empDeductions || []).filter(d => d.employee_id === account.employee_id);
        for (const ded of empDeds) {
          if (ded.balance > 0 && ded.monthly_amount > 0) {
            const amount = Math.min(ded.monthly_amount, ded.balance);
            totalDed += amount;
            detailItems.push({ component_name: ded.name, component_type: 'deduction', category: ded.deduction_type, amount });
          }
        }

        const netPay = grossPay - totalDed;
        totalGross += grossPay;
        totalDeductions += totalDed;
        totalNet += netPay;

        // Insert payroll item
        const { data: item, error: itemErr } = await supabase.from('payroll_items').insert({
          payroll_run_id: run.id,
          employee_id: account.employee_id,
          basic_salary: basicSalary,
          gross_pay: Math.round(grossPay * 100) / 100,
          taxable_income: Math.round(taxableIncome * 100) / 100,
          total_deductions: Math.round(totalDed * 100) / 100,
          net_pay: Math.round(netPay * 100) / 100,
        }).select().single();
        if (itemErr) throw itemErr;

        // Insert details
        if (detailItems.length > 0) {
          await supabase.from('payroll_item_details').insert(
            detailItems.map(d => ({ ...d, payroll_item_id: item.id, amount: Math.round(d.amount * 100) / 100 }))
          );
        }
      }

      // Update run totals
      await supabase.from('payroll_runs').update({
        status: 'computed',
        total_gross: Math.round(totalGross * 100) / 100,
        total_deductions: Math.round(totalDeductions * 100) / 100,
        total_net: Math.round(totalNet * 100) / 100,
        employee_count: activeAccounts.length,
      }).eq('id', run.id);

      // Log audit
      await supabase.from('payroll_audit_log').insert({ action: 'payroll_processed', entity_type: 'payroll_run', entity_id: run.id, performed_by: user?.id, details: { period_id: selectedPeriodId, employee_count: activeAccounts.length } });

      toast.success(`Payroll computed for ${activeAccounts.length} employees`);
      fetchRun();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const approvePayroll = async () => {
    if (!currentRun) return;
    await supabase.from('payroll_runs').update({ status: 'approved', approved_by: user?.id }).eq('id', currentRun.id);
    await supabase.from('payroll_audit_log').insert({ action: 'payroll_approved', entity_type: 'payroll_run', entity_id: currentRun.id, performed_by: user?.id });
    toast.success('Payroll approved');
    fetchRun();
  };

  const finalizePayroll = async () => {
    if (!currentRun || !confirm('Finalize payroll? This will generate payslips and post to finance.')) return;
    try {
      // Generate payslips
      for (const item of payrollItems) {
        const { data: psNum } = await supabase.rpc('generate_payslip_number');
        await supabase.from('payslips').insert({
          payroll_item_id: item.id,
          payroll_run_id: currentRun.id,
          employee_id: item.employee_id,
          period_id: selectedPeriodId,
          payslip_number: psNum,
          gross_pay: item.gross_pay,
          total_deductions: item.total_deductions,
          net_pay: item.net_pay,
        });
      }

      // Post to finance - create journal entry
      const { data: settings } = await supabase.from('payroll_settings').select('*').limit(1).single();
      if (settings?.auto_finance_posting && settings.salary_expense_account_id && settings.payroll_liability_account_id) {
        const { data: jeNum } = await supabase.rpc('generate_journal_number');
        const { data: je, error: jeErr } = await supabase.from('journal_entries').insert({
          entry_number: jeNum,
          transaction_date: new Date().toISOString().split('T')[0],
          narration: `Payroll - ${periods.find(p => p.id === selectedPeriodId)?.name || 'Period'}`,
          status: 'posted',
          total_debit: currentRun.total_gross,
          total_credit: currentRun.total_gross,
          prepared_by: user?.id,
        }).select().single();
        if (!jeErr && je) {
          // Dr Salary Expense
          await supabase.from('general_ledger').insert({
            journal_entry_id: je.id,
            account_id: settings.salary_expense_account_id,
            debit_amount: currentRun.total_gross,
            credit_amount: 0,
            description: 'Payroll salary expense',
            transaction_date: new Date().toISOString().split('T')[0],
          });
          // Cr Payroll Liability (net pay)
          await supabase.from('general_ledger').insert({
            journal_entry_id: je.id,
            account_id: settings.payroll_liability_account_id,
            debit_amount: 0,
            credit_amount: currentRun.total_net,
            description: 'Payroll net pay liability',
            transaction_date: new Date().toISOString().split('T')[0],
          });
          // Cr Statutory accounts
          const statDetails = payrollItems.flatMap(item => (itemDetails[item.id] || []).filter(d => d.is_statutory && d.statutory_config_id));
          const statTotals: Record<string, { amount: number, configId: string }> = {};
          for (const d of statDetails) {
            if (!statTotals[d.statutory_config_id]) statTotals[d.statutory_config_id] = { amount: 0, configId: d.statutory_config_id };
            statTotals[d.statutory_config_id].amount += d.amount;
          }
          const { data: statConfigs } = await supabase.from('statutory_deduction_configs').select('id, name, account_id').in('id', Object.keys(statTotals));
          for (const cfg of (statConfigs || [])) {
            if (cfg.account_id && statTotals[cfg.id]) {
              await supabase.from('general_ledger').insert({
                journal_entry_id: je.id,
                account_id: cfg.account_id,
                debit_amount: 0,
                credit_amount: Math.round(statTotals[cfg.id].amount * 100) / 100,
                description: `Payroll - ${cfg.name}`,
                transaction_date: new Date().toISOString().split('T')[0],
              });
            }
          }

          await supabase.from('payroll_runs').update({ journal_entry_id: je.id }).eq('id', currentRun.id);
        }
      }

      // Update employee deduction balances
      const { data: empDeds } = await supabase.from('employee_deductions').select('*').eq('is_active', true);
      for (const item of payrollItems) {
        const details = itemDetails[item.id] || [];
        for (const d of details) {
          if (['loan', 'salary_advance'].includes(d.category)) {
            const empDed = (empDeds || []).find(ed => ed.employee_id === item.employee_id && ed.name === d.component_name);
            if (empDed) {
              const newRecovered = (empDed.amount_recovered || 0) + d.amount;
              const newBalance = (empDed.total_amount || 0) - newRecovered;
              await supabase.from('employee_deductions').update({
                amount_recovered: newRecovered,
                balance: Math.max(0, newBalance),
                is_active: newBalance > 0,
              }).eq('id', empDed.id);
            }
          }
        }
      }

      await supabase.from('payroll_runs').update({ status: 'finalized', finalized_by: user?.id, finalized_at: new Date().toISOString() }).eq('id', currentRun.id);
      await supabase.from('payroll_periods').update({ status: 'finalized' }).eq('id', selectedPeriodId);
      await supabase.from('payroll_audit_log').insert({ action: 'payroll_finalized', entity_type: 'payroll_run', entity_id: currentRun.id, performed_by: user?.id });

      toast.success('Payroll finalized, payslips generated, and posted to finance');
      fetchRun();
    } catch (err: any) { toast.error(err.message); }
  };

  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2"><DollarSign className="h-6 w-6" /><h1 className="text-2xl font-bold">Payroll Processing</h1></div>

      <Card>
        <CardHeader><CardTitle>Select Payroll Period</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label>Period</Label>
              <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                <SelectTrigger><SelectValue placeholder="Select period" /></SelectTrigger>
                <SelectContent>
                  {periods.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.period_start} to {p.period_end})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {selectedPeriodId && !currentRun && (
              <Button onClick={startPayroll} disabled={processing}>
                <Play className="h-4 w-4 mr-2" />{processing ? 'Processing...' : 'Start Processing'}
              </Button>
            )}
            {currentRun?.status === 'computed' && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={async () => {
                  await supabase.from('payroll_item_details').delete().in('payroll_item_id', payrollItems.map(i => i.id));
                  await supabase.from('payroll_items').delete().eq('payroll_run_id', currentRun.id);
                  await supabase.from('payroll_runs').delete().eq('id', currentRun.id);
                  setCurrentRun(null);
                  setPayrollItems([]);
                  toast.info('Payroll reset. You can re-process.');
                }}><RotateCcw className="h-4 w-4 mr-2" />Recalculate</Button>
                <Button onClick={approvePayroll}><CheckCircle className="h-4 w-4 mr-2" />Approve</Button>
              </div>
            )}
            {currentRun?.status === 'approved' && (
              <Button onClick={finalizePayroll}><Lock className="h-4 w-4 mr-2" />Finalize</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {currentRun && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Employees</p><p className="text-2xl font-bold">{currentRun.employee_count}</p></CardContent></Card>
            <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Gross</p><p className="text-2xl font-bold">{currentRun.total_gross?.toLocaleString()}</p></CardContent></Card>
            <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Deductions</p><p className="text-2xl font-bold text-destructive">{currentRun.total_deductions?.toLocaleString()}</p></CardContent></Card>
            <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Net Pay</p><p className="text-2xl font-bold text-green-600">{currentRun.total_net?.toLocaleString()}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Employee Payroll Details</CardTitle></CardHeader>
            <CardContent>
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
                  {payrollItems.map(item => (
                    <>
                      <TableRow key={item.id} className="cursor-pointer hover:bg-muted" onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}>
                        <TableCell className="font-mono">{item.hr_employees?.employee_no}</TableCell>
                        <TableCell className="font-medium">{item.hr_employees?.first_name} {item.hr_employees?.last_name}</TableCell>
                        <TableCell>{item.hr_employees?.hr_departments?.name || '-'}</TableCell>
                        <TableCell>{item.basic_salary?.toLocaleString()}</TableCell>
                        <TableCell>{item.gross_pay?.toLocaleString()}</TableCell>
                        <TableCell className="text-destructive">{item.total_deductions?.toLocaleString()}</TableCell>
                        <TableCell className="font-bold text-green-600">{item.net_pay?.toLocaleString()}</TableCell>
                      </TableRow>
                      {expandedItem === item.id && (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-muted/50 p-4">
                            <div className="grid grid-cols-2 gap-6">
                              <div>
                                <h4 className="font-semibold mb-2 text-green-700">Earnings</h4>
                                {(itemDetails[item.id] || []).filter(d => d.component_type === 'earning').map((d, i) => (
                                  <div key={i} className="flex justify-between text-sm py-1 border-b border-border/50">
                                    <span>{d.component_name}</span><span>{d.amount?.toLocaleString()}</span>
                                  </div>
                                ))}
                              </div>
                              <div>
                                <h4 className="font-semibold mb-2 text-destructive">Deductions</h4>
                                {(itemDetails[item.id] || []).filter(d => d.component_type === 'deduction').map((d, i) => (
                                  <div key={i} className="flex justify-between text-sm py-1 border-b border-border/50">
                                    <span>{d.component_name} {d.is_statutory && <Badge variant="outline" className="ml-1 text-xs">Statutory</Badge>}</span><span>{d.amount?.toLocaleString()}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default PayrollProcessing;
