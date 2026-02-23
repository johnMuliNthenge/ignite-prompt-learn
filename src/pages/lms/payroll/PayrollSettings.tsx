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
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [paymentModes, setPaymentModes] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [settingsRes, currRes, pmRes, accRes] = await Promise.all([
      supabase.from('payroll_settings').select('*').limit(1).single(),
      supabase.from('currencies').select('id, name, code').eq('is_active', true),
      supabase.from('payment_modes').select('id, name').eq('is_active', true),
      supabase.from('chart_of_accounts').select('id, account_code, account_name, account_type').eq('is_active', true).order('account_code'),
    ]);
    setCurrencies(currRes.data || []);
    setPaymentModes(pmRes.data || []);
    setAccounts(accRes.data || []);
    if (settingsRes.data) {
      setSettings(settingsRes.data);
    } else {
      setSettings({
        payroll_frequency: 'Monthly',
        auto_finance_posting: false,
        payslip_email_template: 'Dear {employee_name},\n\nPlease find attached your payslip for {period}.\n\nRegards,\nHR Department',
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (settings.id) {
        const { error } = await supabase.from('payroll_settings').update({
          payroll_frequency: settings.payroll_frequency,
          currency_id: settings.currency_id || null,
          default_payment_mode_id: settings.default_payment_mode_id || null,
          salary_expense_account_id: settings.salary_expense_account_id || null,
          payroll_liability_account_id: settings.payroll_liability_account_id || null,
          auto_finance_posting: settings.auto_finance_posting,
          payslip_email_template: settings.payslip_email_template,
        }).eq('id', settings.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('payroll_settings').insert({
          payroll_frequency: settings.payroll_frequency,
          currency_id: settings.currency_id || null,
          default_payment_mode_id: settings.default_payment_mode_id || null,
          salary_expense_account_id: settings.salary_expense_account_id || null,
          payroll_liability_account_id: settings.payroll_liability_account_id || null,
          auto_finance_posting: settings.auto_finance_posting,
          payslip_email_template: settings.payslip_email_template,
        }).select().single();
        if (error) throw error;
        setSettings(data);
      }
      toast.success('Payroll settings saved successfully');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  const expenseAccounts = accounts.filter(a => a.account_type === 'Expense');
  const liabilityAccounts = accounts.filter(a => a.account_type === 'Liability');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Payroll Settings</h1>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />{saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>General Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Payroll Frequency</Label>
              <Select value={settings.payroll_frequency} onValueChange={v => setSettings({...settings, payroll_frequency: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Bi-Weekly">Bi-Weekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={settings.currency_id || ''} onValueChange={v => setSettings({...settings, currency_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger>
                <SelectContent>
                  {currencies.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Default Payment Mode</Label>
              <Select value={settings.default_payment_mode_id || ''} onValueChange={v => setSettings({...settings, default_payment_mode_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select payment mode" /></SelectTrigger>
                <SelectContent>
                  {paymentModes.map(pm => <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Auto Finance Posting</Label>
              <Switch checked={settings.auto_finance_posting} onCheckedChange={v => setSettings({...settings, auto_finance_posting: v})} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Account Mapping</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Default Salary Expense Account</Label>
              <Select value={settings.salary_expense_account_id || ''} onValueChange={v => setSettings({...settings, salary_expense_account_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select expense account" /></SelectTrigger>
                <SelectContent>
                  {expenseAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.account_code} - {a.account_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Default Payroll Liability Account</Label>
              <Select value={settings.payroll_liability_account_id || ''} onValueChange={v => setSettings({...settings, payroll_liability_account_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select liability account" /></SelectTrigger>
                <SelectContent>
                  {liabilityAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.account_code} - {a.account_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Payslip Email Template</CardTitle></CardHeader>
        <CardContent>
          <Textarea 
            rows={6}
            value={settings.payslip_email_template || ''} 
            onChange={e => setSettings({...settings, payslip_email_template: e.target.value})}
            placeholder="Use {employee_name}, {period}, {net_pay} as placeholders"
          />
          <p className="text-sm text-muted-foreground mt-2">Available placeholders: {'{employee_name}'}, {'{period}'}, {'{net_pay}'}, {'{gross_pay}'}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollSettings;
