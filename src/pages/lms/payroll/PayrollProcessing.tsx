import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
      const { data: run, error: runErr } = await supabase.from('payroll_runs').insert({
        period_id: selectedPeriodId,
        status: 'processing',
        processed_by: user?.id,
      }).select().single();
      if (runErr) throw runErr;

      // Fetch all required data in parallel
      const [empAccountsRes, statConfigsRes, taxBandsRes, empDeductionsRes, settingsRes, nonCashRes] = await Promise.all([
        supabase.from('employee_payroll_accounts').select('*, hr_employees(id, first_name, last_name, status), salary_structures(id, name)').eq('is_active', true),
        supabase.from('statutory_deduction_configs').select('*').eq('is_active', true),
        supabase.from('payroll_tax_bands').select('*').order('sort_order'),
        supabase.from('employee_deductions').select('*').eq('is_active', true),
        supabase.from('payroll_settings').select('*').limit(1).single(),
        supabase.from('employee_non_cash_benefits').select('*, non_cash_benefits(name, default_amount)').eq('is_active', true),
      ]);

      const activeAccounts = (empAccountsRes.data || []).filter(ea => ea.hr_employees?.status === 'active');
      if (activeAccounts.length === 0) { toast.error('No active employees with payroll accounts'); setProcessing(false); return; }

      const statConfigs = statConfigsRes.data || [];
      const taxBands = taxBandsRes.data || [];
      const empDeductions = empDeductionsRes.data || [];
      const settings = settingsRes.data || {};
      const nonCashBenefits = nonCashRes.data || [];

      // Relief rates from settings
      const personalRelief = Number(settings.personal_relief) || 2400;
      const insuranceReliefRate = (Number(settings.insurance_relief_rate) || 15) / 100;
      const maxInsuranceRelief = Number(settings.max_insurance_relief) || 5000;
      const shifReliefRate = (Number(settings.shif_relief_rate) || 15) / 100;
      const housingLevyReliefRate = (Number(settings.housing_levy_relief_rate) || 15) / 100;
      const maxHousingLevyRelief = Number(settings.max_housing_levy_relief) || 9000;
      const employerNssfRate = Number(settings.employer_nssf_rate) || 0.06;
      const employerHousingLevyRate = Number(settings.employer_housing_levy_rate) || 0.015;

      let totalGross = 0, totalDeductions = 0, totalNet = 0;

      for (const account of activeAccounts) {
        let components: any[] = [];
        if (account.salary_structure_id) {
          const { data: comps } = await supabase.from('salary_components').select('*').eq('structure_id', account.salary_structure_id).order('sort_order');
          components = comps || [];
        }

        const basicSalary = account.basic_salary || 0;
        let grossPay = basicSalary;
        const detailItems: any[] = [];

        detailItems.push({ component_name: 'Basic Pay', component_type: 'earning', category: 'basic_pay', amount: basicSalary });

        // Calculate earnings from salary structure
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

        // Add non-cash benefits to taxable income
        const empNCB = nonCashBenefits.filter(b => b.employee_id === account.employee_id);
        let nonCashTotal = 0;
        for (const ncb of empNCB) {
          const val = ncb.amount || ncb.non_cash_benefits?.taxable_value || 0;
          nonCashTotal += val;
          detailItems.push({ component_name: ncb.non_cash_benefits?.name || 'Non-Cash Benefit', component_type: 'earning', category: 'benefit', amount: val });
        }

        let taxableIncome = grossPay + nonCashTotal;
        let totalDed = 0;
        let payeAmount = 0, nssfAmount = 0, shifAmount = 0, housingLevyAmount = 0;
        let employerContributions = 0;
        let totalRelief = 0;

        // === STATUTORY DEDUCTIONS (respecting sheltered flags) ===
        for (const stat of statConfigs) {
          let dedAmount = 0;
          const bands = taxBands.filter(b => b.statutory_config_id === stat.id);
          const statType = stat.deduction_type;
          const statName = stat.name?.toLowerCase() || '';

          // Check sheltered flags
          if (statName.includes('paye') && account.sheltered_paye) continue;
          if ((statName.includes('nhif') || statName.includes('shif')) && account.sheltered_nhif) continue;
          if (statName.includes('nssf') && account.sheltered_nssf) continue;
          if (statName.includes('housing') && (account.sheltered_housing_levy || account.sheltered_nhlf)) continue;

          if (statType === 'tax' && bands.length > 0) {
            // PAYE: Progressive tax calculation
            let remaining = taxableIncome;
            for (const band of bands) {
              const lower = band.lower_limit || 0;
              const upper = band.upper_limit || Infinity;
              const bandWidth = upper - lower;
              const applicableAmount = Math.min(Math.max(remaining - lower, 0), bandWidth);
              if (applicableAmount > 0) {
                dedAmount += applicableAmount * band.rate + (band.fixed_amount || 0);
              }
              if (remaining <= upper) break;
            }
            payeAmount = dedAmount;
          } else if (bands.length > 0) {
            // Non-tax statutory: use first band rate
            const band = bands[0];
            dedAmount = grossPay * band.rate + (band.fixed_amount || 0);
            
            // Apply minimum thresholds
            if (statName.includes('shif') && settings.min_shif_deduction) {
              dedAmount = Math.max(dedAmount, Number(settings.min_shif_deduction));
            }

            if (statName.includes('nssf')) nssfAmount = dedAmount;
            if (statName.includes('shif') || statName.includes('nhif')) shifAmount = dedAmount;
            if (statName.includes('housing')) housingLevyAmount = dedAmount;
          }

          if (dedAmount > 0) {
            totalDed += dedAmount;
            detailItems.push({ component_name: stat.name, component_type: 'deduction', category: 'statutory', amount: dedAmount, is_statutory: true, statutory_config_id: stat.id });
          }
        }

        // === TAX RELIEFS (Kenya IAS/IPSAS compliant) ===
        // 1. Personal Relief
        totalRelief += personalRelief;

        // 2. Insurance Relief (on SHIF contribution)
        if (shifAmount > 0) {
          const shifRelief = Math.min(shifAmount * shifReliefRate, maxInsuranceRelief);
          totalRelief += shifRelief;
        }

        // 3. Housing Levy Relief
        if (housingLevyAmount > 0) {
          const hlRelief = Math.min(housingLevyAmount * housingLevyReliefRate, maxHousingLevyRelief);
          totalRelief += hlRelief;
        }

        // Apply reliefs to PAYE (PAYE cannot go below 0)
        if (payeAmount > 0) {
          payeAmount = Math.max(0, payeAmount - totalRelief);
          // Update the PAYE detail item
          const payeDetail = detailItems.find(d => d.component_type === 'deduction' && d.category === 'statutory' && d.component_name?.toLowerCase().includes('paye'));
          if (payeDetail) {
            const originalPaye = payeDetail.amount;
            payeDetail.amount = payeAmount;
            totalDed -= (originalPaye - payeAmount);
          }
          // Add relief as info line
          detailItems.push({ component_name: 'Tax Relief (Personal + Insurance + Housing)', component_type: 'relief', category: 'relief', amount: totalRelief });
        }

        // === EMPLOYER CONTRIBUTIONS (not deducted from employee) ===
        // Employer NSSF
        if (!account.sheltered_nssf) {
          const employerNssf = grossPay * employerNssfRate;
          employerContributions += employerNssf;
          detailItems.push({ component_name: 'Employer NSSF Contribution', component_type: 'employer', category: 'statutory', amount: employerNssf });
        }
        // Employer Housing Levy
        if (!account.sheltered_housing_levy && !account.sheltered_nhlf) {
          const employerHL = grossPay * employerHousingLevyRate;
          employerContributions += employerHL;
          detailItems.push({ component_name: 'Employer Housing Levy', component_type: 'employer', category: 'statutory', amount: employerHL });
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
        const empDeds = empDeductions.filter(d => d.employee_id === account.employee_id);
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

        const { data: item, error: itemErr } = await supabase.from('payroll_items').insert({
          payroll_run_id: run.id,
          employee_id: account.employee_id,
          basic_salary: basicSalary,
          gross_pay: Math.round(grossPay * 100) / 100,
          taxable_income: Math.round(taxableIncome * 100) / 100,
          total_deductions: Math.round(totalDed * 100) / 100,
          net_pay: Math.round(netPay * 100) / 100,
          employer_contributions: Math.round(employerContributions * 100) / 100,
          tax_relief: Math.round(totalRelief * 100) / 100,
          paye: Math.round(payeAmount * 100) / 100,
          nssf: Math.round(nssfAmount * 100) / 100,
          shif: Math.round(shifAmount * 100) / 100,
          housing_levy: Math.round(housingLevyAmount * 100) / 100,
        }).select().single();
        if (itemErr) throw itemErr;

        if (detailItems.length > 0) {
          await supabase.from('payroll_item_details').insert(
            detailItems.map(d => ({ ...d, payroll_item_id: item.id, amount: Math.round(d.amount * 100) / 100 }))
          );
        }
      }

      await supabase.from('payroll_runs').update({
        status: 'computed',
        total_gross: Math.round(totalGross * 100) / 100,
        total_deductions: Math.round(totalDeductions * 100) / 100,
        total_net: Math.round(totalNet * 100) / 100,
        employee_count: activeAccounts.length,
      }).eq('id', run.id);

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
          total_debit: currentRun.total_gross + (payrollItems.reduce((s, i) => s + (i.employer_contributions || 0), 0)),
          total_credit: currentRun.total_gross + (payrollItems.reduce((s, i) => s + (i.employer_contributions || 0), 0)),
          prepared_by: user?.id,
        }).select().single();
        if (!jeErr && je) {
          const txDate = new Date().toISOString().split('T')[0];
          // Dr Salary Expense (gross pay)
          await supabase.from('general_ledger').insert({
            journal_entry_id: je.id,
            account_id: settings.salary_expense_account_id,
            debit: currentRun.total_gross,
            credit: 0,
            description: 'Payroll salary expense',
            transaction_date: txDate,
          });
          // Cr Payroll Liability (net pay)
          await supabase.from('general_ledger').insert({
            journal_entry_id: je.id,
            account_id: settings.payroll_liability_account_id,
            debit: 0,
            credit: currentRun.total_net,
            description: 'Payroll net pay liability',
            transaction_date: txDate,
          });
          // Cr Statutory accounts
          const statDetails = payrollItems.flatMap(item => (itemDetails[item.id] || []).filter(d => d.is_statutory && d.statutory_config_id));
          const statTotals: Record<string, { amount: number, configId: string }> = {};
          for (const d of statDetails) {
            if (!statTotals[d.statutory_config_id]) statTotals[d.statutory_config_id] = { amount: 0, configId: d.statutory_config_id };
            statTotals[d.statutory_config_id].amount += d.amount;
          }
          const statConfigIds = Object.keys(statTotals);
          if (statConfigIds.length > 0) {
            const { data: statConfigs } = await supabase.from('statutory_deduction_configs').select('id, name, account_id').in('id', statConfigIds);
            for (const cfg of (statConfigs || [])) {
              if (cfg.account_id && statTotals[cfg.id]) {
                await supabase.from('general_ledger').insert({
                  journal_entry_id: je.id,
                  account_id: cfg.account_id,
                  debit: 0,
                  credit: Math.round(statTotals[cfg.id].amount * 100) / 100,
                  description: `Payroll - ${cfg.name}`,
                  transaction_date: txDate,
                });
              }
            }
          }

          // Employer NSSF contribution: Dr Expense, Cr Liability
          const totalEmployerNssf = payrollItems.reduce((s, item) => {
            const d = (itemDetails[item.id] || []).find(d => d.component_type === 'employer' && d.component_name?.includes('NSSF'));
            return s + (d?.amount || 0);
          }, 0);
          if (totalEmployerNssf > 0 && settings.employer_nssf_account_id) {
            await supabase.from('general_ledger').insert({
              journal_entry_id: je.id,
              account_id: settings.employer_nssf_account_id,
              debit: Math.round(totalEmployerNssf * 100) / 100,
              credit: 0,
              description: 'Employer NSSF contribution expense',
              transaction_date: txDate,
            });
            if (settings.nssf_account_id) {
              await supabase.from('general_ledger').insert({
                journal_entry_id: je.id,
                account_id: settings.nssf_account_id,
                debit: 0,
                credit: Math.round(totalEmployerNssf * 100) / 100,
                description: 'Employer NSSF contribution liability',
                transaction_date: txDate,
              });
            }
          }

          // Employer Housing Levy: Dr Expense, Cr Liability
          const totalEmployerHL = payrollItems.reduce((s, item) => {
            const d = (itemDetails[item.id] || []).find(d => d.component_type === 'employer' && d.component_name?.includes('Housing'));
            return s + (d?.amount || 0);
          }, 0);
          if (totalEmployerHL > 0 && settings.employer_housing_levy_account_id) {
            await supabase.from('general_ledger').insert({
              journal_entry_id: je.id,
              account_id: settings.employer_housing_levy_account_id,
              debit: Math.round(totalEmployerHL * 100) / 100,
              credit: 0,
              description: 'Employer Housing Levy expense',
              transaction_date: txDate,
            });
            if (settings.nhlf_account_id) {
              await supabase.from('general_ledger').insert({
                journal_entry_id: je.id,
                account_id: settings.nhlf_account_id,
                debit: 0,
                credit: Math.round(totalEmployerHL * 100) / 100,
                description: 'Employer Housing Levy liability',
                transaction_date: txDate,
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
                <Play className="h-4 w-4 mr-2" />{processing ? 'Processing...' : 'Process Payroll'}
              </Button>
            )}
            {currentRun?.status === 'processing' && (
              <Button onClick={startPayroll} disabled={processing}>
                <Play className="h-4 w-4 mr-2" />{processing ? 'Processing...' : 'Process Payroll'}
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
                    <TableHead>PAYE</TableHead>
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
                        <TableCell className="text-orange-600">{item.paye?.toLocaleString() || '0'}</TableCell>
                        <TableCell className="text-destructive">{item.total_deductions?.toLocaleString()}</TableCell>
                        <TableCell className="font-bold text-green-600">{item.net_pay?.toLocaleString()}</TableCell>
                      </TableRow>
                      {expandedItem === item.id && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-muted/50 p-4">
                            <div className="grid grid-cols-3 gap-6">
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
                                {(itemDetails[item.id] || []).filter(d => d.component_type === 'relief').map((d, i) => (
                                  <div key={i} className="flex justify-between text-sm py-1 border-b border-border/50 text-blue-600">
                                    <span>{d.component_name}</span><span>-{d.amount?.toLocaleString()}</span>
                                  </div>
                                ))}
                              </div>
                              <div>
                                <h4 className="font-semibold mb-2 text-blue-700">Employer Contributions</h4>
                                {(itemDetails[item.id] || []).filter(d => d.component_type === 'employer').map((d, i) => (
                                  <div key={i} className="flex justify-between text-sm py-1 border-b border-border/50">
                                    <span>{d.component_name}</span><span>{d.amount?.toLocaleString()}</span>
                                  </div>
                                ))}
                                <div className="flex justify-between font-bold pt-2 text-blue-700">
                                  <span>Total Employer Cost</span><span>{item.employer_contributions?.toLocaleString() || '0'}</span>
                                </div>
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
