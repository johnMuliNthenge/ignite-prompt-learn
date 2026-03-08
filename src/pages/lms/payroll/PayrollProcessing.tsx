import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Play, RotateCcw, CheckCircle, Lock, DollarSign, Eye, Search, Plus, ArrowLeft } from 'lucide-react';
import PayslipViewDialog from '@/components/lms/payroll/PayslipViewDialog';

const PayrollProcessing = () => {
  const { user } = useAuth();
  // View mode: 'history' (default) or 'process' (new payroll run)
  const [viewMode, setViewMode] = useState<'history' | 'process'>('history');

  // History state
  const [allRuns, setAllRuns] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [allPeriods, setAllPeriods] = useState<any[]>([]);

  // Expanded run state - shows employee items for a run
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [expandedRunItems, setExpandedRunItems] = useState<any[]>([]);
  const [expandedItemDetails, setExpandedItemDetails] = useState<Record<string, any[]>>({});
  const [loadingItems, setLoadingItems] = useState(false);

  // Payslip dialog
  const [showPayslip, setShowPayslip] = useState(false);
  const [selectedPayslipItem, setSelectedPayslipItem] = useState<any>(null);
  const [selectedPayslipDetails, setSelectedPayslipDetails] = useState<any[]>([]);
  const [selectedPayslipPeriod, setSelectedPayslipPeriod] = useState('');

  // Processing state (for new payroll)
  const [openPeriods, setOpenPeriods] = useState<any[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [currentRun, setCurrentRun] = useState<any>(null);
  const [payrollItems, setPayrollItems] = useState<any[]>([]);
  const [itemDetails, setItemDetails] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => { fetchHistory(); }, []);

  // ==================== HISTORY VIEW ====================
  const fetchHistory = async () => {
    setHistoryLoading(true);
    const [runsRes, periodsRes] = await Promise.all([
      supabase.from('payroll_runs').select('*, payroll_periods(id, name, period_start, period_end)').order('created_at', { ascending: false }),
      supabase.from('payroll_periods').select('id, name').order('period_start', { ascending: false }),
    ]);
    setAllRuns(runsRes.data || []);
    setAllPeriods(periodsRes.data || []);
    setHistoryLoading(false);
  };

  const filteredRuns = allRuns.filter(run => {
    if (filterPeriod !== 'all' && run.period_id !== filterPeriod) return false;
    if (filterStatus !== 'all' && run.status !== filterStatus) return false;
    if (searchQuery) {
      const periodName = run.payroll_periods?.name?.toLowerCase() || '';
      if (!periodName.includes(searchQuery.toLowerCase())) return false;
    }
    return true;
  });

  const expandRun = async (runId: string) => {
    if (expandedRunId === runId) { setExpandedRunId(null); return; }
    setExpandedRunId(runId);
    setLoadingItems(true);
    const { data: items } = await supabase.from('payroll_items')
      .select('*, hr_employees(employee_no, first_name, middle_name, last_name, email, hr_departments(name))')
      .eq('payroll_run_id', runId).order('created_at');
    setExpandedRunItems(items || []);
    if (items && items.length > 0) {
      const { data: details } = await supabase.from('payroll_item_details')
        .select('*').in('payroll_item_id', items.map(i => i.id)).order('component_type', { ascending: false });
      const grouped: Record<string, any[]> = {};
      (details || []).forEach(d => {
        if (!grouped[d.payroll_item_id]) grouped[d.payroll_item_id] = [];
        grouped[d.payroll_item_id].push(d);
      });
      setExpandedItemDetails(grouped);
    }
    setLoadingItems(false);
  };

  const viewPayslip = (item: any, periodName: string) => {
    setSelectedPayslipItem(item);
    setSelectedPayslipDetails(expandedItemDetails[item.id] || []);
    setSelectedPayslipPeriod(periodName);
    setShowPayslip(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing': return 'secondary';
      case 'computed': return 'outline';
      case 'approved': return 'default';
      case 'finalized': return 'default';
      default: return 'secondary';
    }
  };

  // ==================== PROCESSING VIEW ====================
  const startProcessView = async () => {
    setViewMode('process');
    setLoading(true);
    const { data } = await supabase.from('payroll_periods').select('*').in('status', ['open', 'processing']).order('period_start', { ascending: false });
    setOpenPeriods(data || []);
    setLoading(false);
  };

  useEffect(() => { if (selectedPeriodId && viewMode === 'process') fetchRun(); }, [selectedPeriodId]);

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
      const settings: any = settingsRes.data || {};
      const nonCashBenefits = nonCashRes.data || [];

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

        const earnings = components.filter(c => c.component_type === 'earning' && c.category !== 'basic_pay');
        for (const comp of earnings) {
          let amount = 0;
          if (comp.calculation_type === 'fixed') { amount = comp.default_amount || 0; }
          else if (comp.calculation_type === 'percentage') {
            const baseAmount = comp.percentage_of?.toLowerCase() === 'basic pay' ? basicSalary : grossPay;
            amount = baseAmount * (comp.default_amount / 100);
          }
          grossPay += amount;
          detailItems.push({ component_name: comp.name, component_type: 'earning', category: comp.category, amount });
        }

        const empNCB = nonCashBenefits.filter(b => b.employee_id === account.employee_id);
        let nonCashTotal = 0;
        for (const ncb of empNCB) {
          const val = ncb.amount || (ncb as any).non_cash_benefits?.default_amount || 0;
          nonCashTotal += val;
          detailItems.push({ component_name: (ncb as any).non_cash_benefits?.name || 'Non-Cash Benefit', component_type: 'earning', category: 'benefit', amount: val });
        }

        let taxableIncome = grossPay + nonCashTotal;
        let totalDed = 0;
        let payeAmount = 0, nssfAmount = 0, shifAmount = 0, housingLevyAmount = 0;
        let employerContributions = 0;
        let totalRelief = 0;

        for (const stat of statConfigs) {
          let dedAmount = 0;
          const bands = taxBands.filter(b => b.statutory_config_id === stat.id);
          const statName = stat.name?.toLowerCase() || '';

          if (statName.includes('paye') && account.sheltered_paye) continue;
          if ((statName.includes('nhif') || statName.includes('shif')) && account.sheltered_nhif) continue;
          if (statName.includes('nssf') && account.sheltered_nssf) continue;
          if (statName.includes('housing') && (account.sheltered_housing_levy || account.sheltered_nhlf)) continue;

          if (stat.deduction_type === 'tax' && bands.length > 0) {
            let remaining = taxableIncome;
            for (const band of bands) {
              const lower = band.lower_limit || 0;
              const upper = band.upper_limit || Infinity;
              const bandWidth = upper - lower;
              const applicableAmount = Math.min(Math.max(remaining - lower, 0), bandWidth);
              if (applicableAmount > 0) { dedAmount += applicableAmount * band.rate + (band.fixed_amount || 0); }
              if (remaining <= upper) break;
            }
            payeAmount = dedAmount;
          } else if (bands.length > 0) {
            const band = bands[0];
            dedAmount = grossPay * band.rate + (band.fixed_amount || 0);
            if (statName.includes('shif') && settings.min_shif_deduction) { dedAmount = Math.max(dedAmount, Number(settings.min_shif_deduction)); }
            if (statName.includes('nssf')) nssfAmount = dedAmount;
            if (statName.includes('shif') || statName.includes('nhif')) shifAmount = dedAmount;
            if (statName.includes('housing')) housingLevyAmount = dedAmount;
          }

          if (dedAmount > 0) {
            totalDed += dedAmount;
            detailItems.push({ component_name: stat.name, component_type: 'deduction', category: 'statutory', amount: dedAmount, is_statutory: true, statutory_config_id: stat.id });
          }
        }

        totalRelief += personalRelief;
        if (shifAmount > 0) { totalRelief += Math.min(shifAmount * shifReliefRate, maxInsuranceRelief); }
        if (housingLevyAmount > 0) { totalRelief += Math.min(housingLevyAmount * housingLevyReliefRate, maxHousingLevyRelief); }

        if (payeAmount > 0) {
          payeAmount = Math.max(0, payeAmount - totalRelief);
          const payeDetail = detailItems.find(d => d.component_type === 'deduction' && d.category === 'statutory' && d.component_name?.toLowerCase().includes('paye'));
          if (payeDetail) {
            const originalPaye = payeDetail.amount;
            payeDetail.amount = payeAmount;
            totalDed -= (originalPaye - payeAmount);
          }
          detailItems.push({ component_name: 'Tax Relief (Personal + Insurance + Housing)', component_type: 'relief', category: 'relief', amount: totalRelief });
        }

        if (!account.sheltered_nssf) {
          const employerNssf = grossPay * employerNssfRate;
          employerContributions += employerNssf;
          detailItems.push({ component_name: 'Employer NSSF Contribution', component_type: 'employer', category: 'statutory', amount: employerNssf });
        }
        if (!account.sheltered_housing_levy && !account.sheltered_nhlf) {
          const employerHL = grossPay * employerHousingLevyRate;
          employerContributions += employerHL;
          detailItems.push({ component_name: 'Employer Housing Levy', component_type: 'employer', category: 'statutory', amount: employerHL });
        }

        const structDeductions = components.filter(c => c.component_type === 'deduction');
        for (const comp of structDeductions) {
          let amount = 0;
          if (comp.calculation_type === 'fixed') { amount = comp.default_amount || 0; }
          else if (comp.calculation_type === 'percentage') {
            const base = comp.percentage_of?.toLowerCase() === 'basic pay' ? basicSalary : grossPay;
            amount = base * (comp.default_amount / 100);
          }
          totalDed += amount;
          detailItems.push({ component_name: comp.name, component_type: 'deduction', category: comp.category, amount });
        }

        const empDeds = empDeductions.filter(d => d.employee_id === account.employee_id);
        for (const ded of empDeds) {
          if (ded.balance > 0 && ded.monthly_amount > 0) {
            const amount = Math.min(ded.monthly_amount, ded.balance);
            totalDed += amount;
            detailItems.push({ component_name: ded.name, component_type: 'deduction', category: ded.deduction_type, amount });
          }
        }

        const netPay = grossPay - totalDed;
        totalGross += grossPay; totalDeductions += totalDed; totalNet += netPay;

        const { data: item, error: itemErr } = await supabase.from('payroll_items').insert({
          payroll_run_id: run.id, employee_id: account.employee_id, basic_salary: basicSalary,
          gross_pay: Math.round(grossPay * 100) / 100, taxable_income: Math.round(taxableIncome * 100) / 100,
          total_deductions: Math.round(totalDed * 100) / 100, net_pay: Math.round(netPay * 100) / 100,
          employer_contributions: Math.round(employerContributions * 100) / 100, tax_relief: Math.round(totalRelief * 100) / 100,
          paye: Math.round(payeAmount * 100) / 100, nssf: Math.round(nssfAmount * 100) / 100,
          shif: Math.round(shifAmount * 100) / 100, housing_levy: Math.round(housingLevyAmount * 100) / 100,
        }).select().single();
        if (itemErr) throw itemErr;

        if (detailItems.length > 0) {
          await supabase.from('payroll_item_details').insert(
            detailItems.map(d => ({ ...d, payroll_item_id: item.id, amount: Math.round(d.amount * 100) / 100 }))
          );
        }
      }

      await supabase.from('payroll_runs').update({
        status: 'computed', total_gross: Math.round(totalGross * 100) / 100,
        total_deductions: Math.round(totalDeductions * 100) / 100, total_net: Math.round(totalNet * 100) / 100,
        employee_count: activeAccounts.length,
      }).eq('id', run.id);

      await supabase.from('payroll_audit_log').insert({ action: 'payroll_processed', entity_type: 'payroll_run', entity_id: run.id, performed_by: user?.id, details: { period_id: selectedPeriodId, employee_count: activeAccounts.length } });
      toast.success(`Payroll computed for ${activeAccounts.length} employees`);
      fetchRun();
    } catch (err: any) { toast.error(err.message); } finally { setProcessing(false); }
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
      for (const item of payrollItems) {
        const { data: psNum } = await supabase.rpc('generate_payslip_number');
        await supabase.from('payslips').insert({
          payroll_item_id: item.id, payroll_run_id: currentRun.id, employee_id: item.employee_id,
          period_id: selectedPeriodId, payslip_number: psNum, gross_pay: item.gross_pay,
          total_deductions: item.total_deductions, net_pay: item.net_pay,
        });
      }

      const { data: settings } = await supabase.from('payroll_settings').select('*').limit(1).single();
      if (settings?.auto_finance_posting && settings.salary_expense_account_id && settings.payroll_liability_account_id) {
        const { data: jeNum } = await supabase.rpc('generate_journal_number');
        const periodName = openPeriods.find(p => p.id === selectedPeriodId)?.name || 'Period';
        const { data: je, error: jeErr } = await supabase.from('journal_entries').insert({
          entry_number: jeNum, transaction_date: new Date().toISOString().split('T')[0],
          narration: `Payroll - ${periodName}`, status: 'posted',
          total_debit: currentRun.total_gross + (payrollItems.reduce((s, i) => s + (i.employer_contributions || 0), 0)),
          total_credit: currentRun.total_gross + (payrollItems.reduce((s, i) => s + (i.employer_contributions || 0), 0)),
          prepared_by: user?.id,
        }).select().single();

        if (!jeErr && je) {
          const txDate = new Date().toISOString().split('T')[0];
          await supabase.from('general_ledger').insert({ journal_entry_id: je.id, account_id: settings.salary_expense_account_id, debit: currentRun.total_gross, credit: 0, description: 'Payroll salary expense', transaction_date: txDate });
          await supabase.from('general_ledger').insert({ journal_entry_id: je.id, account_id: settings.payroll_liability_account_id, debit: 0, credit: currentRun.total_net, description: 'Payroll net pay liability', transaction_date: txDate });

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
                await supabase.from('general_ledger').insert({ journal_entry_id: je.id, account_id: cfg.account_id, debit: 0, credit: Math.round(statTotals[cfg.id].amount * 100) / 100, description: `Payroll - ${cfg.name}`, transaction_date: txDate });
              }
            }
          }

          const totalEmployerNssf = payrollItems.reduce((s, item) => { const d = (itemDetails[item.id] || []).find(d => d.component_type === 'employer' && d.component_name?.includes('NSSF')); return s + (d?.amount || 0); }, 0);
          if (totalEmployerNssf > 0 && settings.employer_nssf_account_id) {
            await supabase.from('general_ledger').insert({ journal_entry_id: je.id, account_id: settings.employer_nssf_account_id, debit: Math.round(totalEmployerNssf * 100) / 100, credit: 0, description: 'Employer NSSF contribution expense', transaction_date: txDate });
            if (settings.nssf_account_id) { await supabase.from('general_ledger').insert({ journal_entry_id: je.id, account_id: settings.nssf_account_id, debit: 0, credit: Math.round(totalEmployerNssf * 100) / 100, description: 'Employer NSSF contribution liability', transaction_date: txDate }); }
          }

          const totalEmployerHL = payrollItems.reduce((s, item) => { const d = (itemDetails[item.id] || []).find(d => d.component_type === 'employer' && d.component_name?.includes('Housing')); return s + (d?.amount || 0); }, 0);
          if (totalEmployerHL > 0 && settings.employer_housing_levy_account_id) {
            await supabase.from('general_ledger').insert({ journal_entry_id: je.id, account_id: settings.employer_housing_levy_account_id, debit: Math.round(totalEmployerHL * 100) / 100, credit: 0, description: 'Employer Housing Levy expense', transaction_date: txDate });
            if (settings.nhlf_account_id) { await supabase.from('general_ledger').insert({ journal_entry_id: je.id, account_id: settings.nhlf_account_id, debit: 0, credit: Math.round(totalEmployerHL * 100) / 100, description: 'Employer Housing Levy liability', transaction_date: txDate }); }
          }

          await supabase.from('payroll_runs').update({ journal_entry_id: je.id }).eq('id', currentRun.id);
        }
      }

      const { data: empDeds } = await supabase.from('employee_deductions').select('*').eq('is_active', true);
      for (const item of payrollItems) {
        const details = itemDetails[item.id] || [];
        for (const d of details) {
          if (['loan', 'salary_advance'].includes(d.category)) {
            const empDed = (empDeds || []).find(ed => ed.employee_id === item.employee_id && ed.name === d.component_name);
            if (empDed) {
              const newRecovered = (empDed.amount_recovered || 0) + d.amount;
              const newBalance = (empDed.total_amount || 0) - newRecovered;
              await supabase.from('employee_deductions').update({ amount_recovered: newRecovered, balance: Math.max(0, newBalance), is_active: newBalance > 0 }).eq('id', empDed.id);
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

  // ==================== RENDER ====================
  if (viewMode === 'process') {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => { setViewMode('history'); fetchHistory(); }}><ArrowLeft className="h-5 w-5" /></Button>
          <DollarSign className="h-6 w-6" /><h1 className="text-2xl font-bold">Process New Payroll</h1>
        </div>

        <Card>
          <CardHeader><CardTitle>Select Payroll Period</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Label>Period</Label>
                <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                  <SelectTrigger><SelectValue placeholder="Select period" /></SelectTrigger>
                  <SelectContent>
                    {openPeriods.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.period_start} to {p.period_end})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {selectedPeriodId && !currentRun && (
                <Button onClick={startPayroll} disabled={processing}><Play className="h-4 w-4 mr-2" />{processing ? 'Processing...' : 'Process Payroll'}</Button>
              )}
              {currentRun?.status === 'processing' && (
                <Button onClick={startPayroll} disabled={processing}><Play className="h-4 w-4 mr-2" />{processing ? 'Processing...' : 'Process Payroll'}</Button>
              )}
              {currentRun?.status === 'computed' && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={async () => {
                    await supabase.from('payroll_item_details').delete().in('payroll_item_id', payrollItems.map(i => i.id));
                    await supabase.from('payroll_items').delete().eq('payroll_run_id', currentRun.id);
                    await supabase.from('payroll_runs').delete().eq('id', currentRun.id);
                    setCurrentRun(null); setPayrollItems([]); toast.info('Payroll reset.');
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
                      <TableHead>Staff ID</TableHead><TableHead>Name</TableHead><TableHead>Department</TableHead>
                      <TableHead>Basic</TableHead><TableHead>Gross</TableHead><TableHead>PAYE</TableHead>
                      <TableHead>Deductions</TableHead><TableHead>Net Pay</TableHead>
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
                          <TableRow key={`${item.id}-details`}>
                            <TableCell colSpan={8} className="bg-muted/50 p-4">
                              <div className="grid grid-cols-3 gap-6">
                                <div>
                                  <h4 className="font-semibold mb-2 text-green-700">Earnings</h4>
                                  {(itemDetails[item.id] || []).filter(d => d.component_type === 'earning').map((d, i) => (
                                    <div key={i} className="flex justify-between text-sm py-1 border-b border-border/50"><span>{d.component_name}</span><span>{d.amount?.toLocaleString()}</span></div>
                                  ))}
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2 text-destructive">Deductions</h4>
                                  {(itemDetails[item.id] || []).filter(d => d.component_type === 'deduction').map((d, i) => (
                                    <div key={i} className="flex justify-between text-sm py-1 border-b border-border/50"><span>{d.component_name} {d.is_statutory && <Badge variant="outline" className="ml-1 text-xs">Statutory</Badge>}</span><span>{d.amount?.toLocaleString()}</span></div>
                                  ))}
                                  {(itemDetails[item.id] || []).filter(d => d.component_type === 'relief').map((d, i) => (
                                    <div key={i} className="flex justify-between text-sm py-1 border-b border-border/50 text-blue-600"><span>{d.component_name}</span><span>-{d.amount?.toLocaleString()}</span></div>
                                  ))}
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2 text-blue-700">Employer Contributions</h4>
                                  {(itemDetails[item.id] || []).filter(d => d.component_type === 'employer').map((d, i) => (
                                    <div key={i} className="flex justify-between text-sm py-1 border-b border-border/50"><span>{d.component_name}</span><span>{d.amount?.toLocaleString()}</span></div>
                                  ))}
                                  <div className="flex justify-between font-bold pt-2 text-blue-700"><span>Total Employer Cost</span><span>{item.employer_contributions?.toLocaleString() || '0'}</span></div>
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
  }

  // ==================== HISTORY VIEW (DEFAULT) ====================
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><DollarSign className="h-6 w-6" /><h1 className="text-2xl font-bold">Payroll Processing</h1></div>
        <Button onClick={startProcessView}><Plus className="h-4 w-4 mr-2" />New Payroll Run</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-10" placeholder="Search by period..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <div className="min-w-[200px]">
              <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                <SelectTrigger><SelectValue placeholder="All periods" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Periods</SelectItem>
                  {allPeriods.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[150px]">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="computed">Computed</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="finalized">Finalized</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {historyLoading ? <p>Loading...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Total Gross</TableHead>
                  <TableHead>Total Deductions</TableHead>
                  <TableHead>Total Net Pay</TableHead>
                  <TableHead>Processed On</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRuns.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No payroll runs found</TableCell></TableRow>
                ) : filteredRuns.map(run => (
                  <>
                    <TableRow key={run.id}>
                      <TableCell className="font-medium">{run.payroll_periods?.name || '-'}</TableCell>
                      <TableCell><Badge variant={getStatusColor(run.status)}>{run.status}</Badge></TableCell>
                      <TableCell>{run.employee_count || 0}</TableCell>
                      <TableCell>{run.total_gross?.toLocaleString() || '0'}</TableCell>
                      <TableCell className="text-destructive">{run.total_deductions?.toLocaleString() || '0'}</TableCell>
                      <TableCell className="font-bold text-green-600">{run.total_net?.toLocaleString() || '0'}</TableCell>
                      <TableCell>{run.created_at ? new Date(run.created_at).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => expandRun(run.id)}>
                          <Eye className="h-4 w-4 mr-1" />{expandedRunId === run.id ? 'Hide' : 'View'}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedRunId === run.id && (
                      <TableRow key={`${run.id}-expand`}>
                        <TableCell colSpan={8} className="bg-muted/30 p-0">
                          {loadingItems ? <p className="p-4">Loading employee details...</p> : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Staff ID</TableHead><TableHead>Name</TableHead><TableHead>Department</TableHead>
                                  <TableHead>Basic</TableHead><TableHead>Gross</TableHead><TableHead>PAYE</TableHead>
                                  <TableHead>Deductions</TableHead><TableHead>Net Pay</TableHead><TableHead>Payslip</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {expandedRunItems.map(item => (
                                  <TableRow key={item.id}>
                                    <TableCell className="font-mono">{item.hr_employees?.employee_no}</TableCell>
                                    <TableCell className="font-medium">{item.hr_employees?.first_name} {item.hr_employees?.last_name}</TableCell>
                                    <TableCell>{item.hr_employees?.hr_departments?.name || '-'}</TableCell>
                                    <TableCell>{item.basic_salary?.toLocaleString()}</TableCell>
                                    <TableCell>{item.gross_pay?.toLocaleString()}</TableCell>
                                    <TableCell className="text-orange-600">{item.paye?.toLocaleString() || '0'}</TableCell>
                                    <TableCell className="text-destructive">{item.total_deductions?.toLocaleString()}</TableCell>
                                    <TableCell className="font-bold text-green-600">{item.net_pay?.toLocaleString()}</TableCell>
                                    <TableCell>
                                      <Button size="sm" variant="outline" onClick={() => viewPayslip(item, run.payroll_periods?.name || '')}>
                                        <Eye className="h-4 w-4 mr-1" />Payslip
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PayslipViewDialog
        open={showPayslip}
        onOpenChange={setShowPayslip}
        payrollItem={selectedPayslipItem}
        details={selectedPayslipDetails}
        periodName={selectedPayslipPeriod}
      />
    </div>
  );
};

export default PayrollProcessing;
