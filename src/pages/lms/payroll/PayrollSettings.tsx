import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Settings } from 'lucide-react';

const PayrollSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [settingsRes, accRes] = await Promise.all([
      supabase.from('payroll_settings').select('*').limit(1).single(),
      supabase.from('chart_of_accounts').select('id, account_code, account_name, account_type').eq('is_active', true).order('account_code'),
    ]);
    setAccounts(accRes.data || []);
    if (settingsRes.data) {
      setSettings(settingsRes.data);
    } else {
      setSettings({
        payroll_frequency: 'Monthly', auto_finance_posting: true, require_payroll_approval: true,
        show_loan_balance_on_payroll: true, use_nssf_tier1_only: false, manual_nssf: false,
        include_employer_pension_in_taxable: false, insurance_relief_rate: 15, max_insurance_relief: 5000,
        max_allowable_deduction: 20000,
        payslip_email_template: 'Dear {employee_name},\n\nPlease find attached your payslip for {period}.\n\nRegards,\nHR Department',
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { id, created_at, updated_at, ...payload } = settings;
      // Clean null-ish strings to null for UUID fields
      const uuidFields = ['currency_id','default_payment_mode_id','salary_expense_account_id','payroll_liability_account_id','paye_account_id','shif_account_id','nssf_account_id','nhlf_account_id','net_pay_account_id','basic_salary_account_id','employer_nssf_account_id','employer_housing_levy_account_id','employee_housing_levy_account_id'];
      uuidFields.forEach(f => { if (!payload[f]) payload[f] = null; });
      
      if (id) {
        const { error } = await supabase.from('payroll_settings').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('payroll_settings').insert(payload).select().single();
        if (error) throw error;
        setSettings(data);
      }
      toast.success('Payroll settings saved');
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  const acctSelect = (label: string, field: string, filterType?: string) => (
    <div>
      <Label>{label}</Label>
      <Select value={settings[field] || ''} onValueChange={v => setSettings({...settings, [field]: v})}>
        <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
        <SelectContent>
          {(filterType ? accounts.filter(a => a.account_type === filterType) : accounts).map(a => (
            <SelectItem key={a.id} value={a.id}>{a.account_code} - {a.account_name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Settings className="h-6 w-6" /><h1 className="text-2xl font-bold">Payroll Setup - Main Settings</h1></div>
        <Button onClick={handleSave} disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? 'Saving...' : 'Save Settings'}</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Employer Details */}
        <Card>
          <CardHeader><CardTitle>Employer Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Employer PIN Number *</Label><Input value={settings.employer_pin || ''} onChange={e => setSettings({...settings, employer_pin: e.target.value})} placeholder="e.g. PIN001" /></div>
            <div><Label>Employer NHIF Code *</Label><Input value={settings.employer_nhif_code || ''} onChange={e => setSettings({...settings, employer_nhif_code: e.target.value})} placeholder="e.g. NHIF001" /></div>
            <div><Label>Employer NSSF Number</Label><Input value={settings.employer_nssf_number || ''} onChange={e => setSettings({...settings, employer_nssf_number: e.target.value})} placeholder="e.g. NSSF001" /></div>
            <div><Label>Payroll Frequency</Label>
              <Select value={settings.payroll_frequency} onValueChange={v => setSettings({...settings, payroll_frequency: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Bi-Weekly">Bi-Weekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Statutory GL Accounts */}
        <Card>
          <CardHeader><CardTitle>Statutory GL Accounts</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {acctSelect('P.A.Y.E Account *', 'paye_account_id', 'Liability')}
            {acctSelect('S.H.I.F Account *', 'shif_account_id', 'Liability')}
            {acctSelect('N.S.S.F Account *', 'nssf_account_id', 'Liability')}
            {acctSelect('N.H.L.F Account', 'nhlf_account_id', 'Liability')}
          </CardContent>
        </Card>

        {/* Payroll GL Accounts */}
        <Card>
          <CardHeader><CardTitle>Payroll GL Accounts</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {acctSelect('Net Pay GL Account', 'net_pay_account_id')}
            {acctSelect('Basic Salary Account *', 'basic_salary_account_id', 'Expense')}
            {acctSelect('Salary Expense Account', 'salary_expense_account_id', 'Expense')}
            {acctSelect('Payroll Liability Account', 'payroll_liability_account_id', 'Liability')}
            {acctSelect('Employer NSSF Account *', 'employer_nssf_account_id', 'Expense')}
          </CardContent>
        </Card>

        {/* Housing Levy */}
        <Card>
          <CardHeader><CardTitle>Housing Levy GL Accounts</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {acctSelect('Employer Housing Levy GL', 'employer_housing_levy_account_id', 'Liability')}
            {acctSelect('Employee Housing Levy GL', 'employee_housing_levy_account_id', 'Liability')}
          </CardContent>
        </Card>

        {/* Relief Rates */}
        <Card>
          <CardHeader><CardTitle>Relief Rates & Limits</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Insurance Relief Rate (%)</Label><Input type="number" value={settings.insurance_relief_rate || 0} onChange={e => setSettings({...settings, insurance_relief_rate: Number(e.target.value)})} /></div>
              <div><Label>Max Insurance Relief</Label><Input type="number" value={settings.max_insurance_relief || 0} onChange={e => setSettings({...settings, max_insurance_relief: Number(e.target.value)})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>NHIF Relief Rate (%)</Label><Input type="number" value={settings.nhif_relief_rate || 0} onChange={e => setSettings({...settings, nhif_relief_rate: Number(e.target.value)})} /></div>
              <div><Label>SHIF Relief Rate (%)</Label><Input type="number" value={settings.shif_relief_rate || 0} onChange={e => setSettings({...settings, shif_relief_rate: Number(e.target.value)})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Housing Levy Relief (%)</Label><Input type="number" value={settings.housing_levy_relief_rate || 0} onChange={e => setSettings({...settings, housing_levy_relief_rate: Number(e.target.value)})} /></div>
              <div><Label>Max Housing Levy Relief</Label><Input type="number" value={settings.max_housing_levy_relief || 0} onChange={e => setSettings({...settings, max_housing_levy_relief: Number(e.target.value)})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Min SHIF Deduction</Label><Input type="number" value={settings.min_shif_deduction || 0} onChange={e => setSettings({...settings, min_shif_deduction: Number(e.target.value)})} /></div>
              <div><Label>Max Allowable Deduction</Label><Input type="number" value={settings.max_allowable_deduction || 0} onChange={e => setSettings({...settings, max_allowable_deduction: Number(e.target.value)})} /></div>
            </div>
          </CardContent>
        </Card>

        {/* Toggles */}
        <Card>
          <CardHeader><CardTitle>Options</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between"><Label>Use NSSF Tier 1 Only</Label><Switch checked={settings.use_nssf_tier1_only || false} onCheckedChange={v => setSettings({...settings, use_nssf_tier1_only: v})} /></div>
            <div className="flex items-center justify-between"><Label>Manual NSSF</Label><Switch checked={settings.manual_nssf || false} onCheckedChange={v => setSettings({...settings, manual_nssf: v})} /></div>
            <div className="flex items-center justify-between"><Label>Include Employer Pension in Taxable Pay</Label><Switch checked={settings.include_employer_pension_in_taxable || false} onCheckedChange={v => setSettings({...settings, include_employer_pension_in_taxable: v})} /></div>
            <div className="flex items-center justify-between"><Label>Require Payroll Approval</Label><Switch checked={settings.require_payroll_approval || false} onCheckedChange={v => setSettings({...settings, require_payroll_approval: v})} /></div>
            <div className="flex items-center justify-between"><Label>Show Loan Balance on Payroll</Label><Switch checked={settings.show_loan_balance_on_payroll || false} onCheckedChange={v => setSettings({...settings, show_loan_balance_on_payroll: v})} /></div>
            <div className="flex items-center justify-between"><Label>Auto Finance Posting</Label><Switch checked={settings.auto_finance_posting || false} onCheckedChange={v => setSettings({...settings, auto_finance_posting: v})} /></div>
          </CardContent>
        </Card>
      </div>

      {/* Signatories */}
      <Card>
        <CardHeader><CardTitle>Signatories</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label>Signatory 1</Label><Input value={settings.signatory_1 || ''} onChange={e => setSettings({...settings, signatory_1: e.target.value})} /></div>
            <div><Label>Signatory 2</Label><Input value={settings.signatory_2 || ''} onChange={e => setSettings({...settings, signatory_2: e.target.value})} /></div>
            <div><Label>Signatory 3</Label><Input value={settings.signatory_3 || ''} onChange={e => setSettings({...settings, signatory_3: e.target.value})} /></div>
          </div>
        </CardContent>
      </Card>

      {/* Email Template */}
      <Card>
        <CardHeader><CardTitle>Payslip Email Template</CardTitle></CardHeader>
        <CardContent>
          <Textarea rows={6} value={settings.payslip_email_template || ''} onChange={e => setSettings({...settings, payslip_email_template: e.target.value})} />
          <p className="text-sm text-muted-foreground mt-2">Placeholders: {'{employee_name}'}, {'{period}'}, {'{net_pay}'}, {'{gross_pay}'}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollSettings;
