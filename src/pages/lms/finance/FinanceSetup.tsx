import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
}

interface FinanceSettings {
  student_prepayment_account: string;
  student_debtors_account: string;
  accommodation_account: string;
  caution_money_account: string;
  customer_prepayment_account: string;
  supplier_prepayment_account: string;
  opening_balance_account: string;
  revenue_reserves_account: string;
  transport_fee_account: string;
  capitation_gl_account: string;
  petty_cash_control_account: string;
  salary_advance_debtors_account: string;
  allow_invoice_adjustment_approval: boolean;
  show_balance_with_future_invoices: boolean;
  allow_jiunge_applicant_payment: boolean;
}

const defaultSettings: FinanceSettings = {
  student_prepayment_account: '',
  student_debtors_account: '',
  accommodation_account: '',
  caution_money_account: '',
  customer_prepayment_account: '',
  supplier_prepayment_account: '',
  opening_balance_account: '',
  revenue_reserves_account: '',
  transport_fee_account: '',
  capitation_gl_account: '',
  petty_cash_control_account: '',
  salary_advance_debtors_account: '',
  allow_invoice_adjustment_approval: false,
  show_balance_with_future_invoices: false,
  allow_jiunge_applicant_payment: false,
};

const settingsFields = [
  { key: 'student_prepayment_account', label: 'Student Prepayment Account', type: 'Liability', required: true },
  { key: 'student_debtors_account', label: 'Student Debtors Account', type: 'Asset', required: true },
  { key: 'accommodation_account', label: 'Accommodation Account', type: 'Income', required: false },
  { key: 'caution_money_account', label: 'Caution Money Account', type: 'Liability', required: false },
  { key: 'customer_prepayment_account', label: 'Customer Prepayment Account', type: 'Liability', required: false },
  { key: 'supplier_prepayment_account', label: 'Supplier Prepayment Account', type: 'Asset', required: false },
  { key: 'opening_balance_account', label: 'Opening Balance Account', type: 'Equity', required: true },
  { key: 'revenue_reserves_account', label: 'Revenue Reserves', type: 'Equity', required: true },
  { key: 'transport_fee_account', label: 'Transport Fee Account', type: 'Income', required: false },
  { key: 'capitation_gl_account', label: 'Capitation GL Account', type: 'Liability', required: false },
  { key: 'petty_cash_control_account', label: 'Petty Cash Control Account', type: 'Liability', required: false },
  { key: 'salary_advance_debtors_account', label: 'Salary Advance Debtors Account', type: 'Asset', required: false },
];

export default function FinanceSetup() {
  const { isAdmin } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [settings, setSettings] = useState<FinanceSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch all active accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name, account_type')
        .eq('is_active', true)
        .order('account_code');

      if (accountsError) throw accountsError;
      setAccounts(accountsData || []);

      // TODO: Fetch saved settings from a settings table if available
      // For now, we'll use localStorage as a temporary store
      const savedSettings = localStorage.getItem('finance_setup_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Validate required fields
      const missingRequired = settingsFields
        .filter(f => f.required && !settings[f.key as keyof FinanceSettings])
        .map(f => f.label);

      if (missingRequired.length > 0) {
        toast.error(`Please select: ${missingRequired.join(', ')}`);
        setSaving(false);
        return;
      }

      // Save to localStorage (in production, save to database)
      localStorage.setItem('finance_setup_settings', JSON.stringify(settings));
      
      toast.success('Finance settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const getAccountsByType = (type: string) => {
    return accounts.filter(a => a.account_type === type);
  };

  const getAccountDisplay = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    return account ? `${account.account_code} (${account.account_name})` : 'Not selected';
  };

  if (!isAdmin) {
    return <div className="p-6"><p className="text-muted-foreground">Access denied</p></div>;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings2 className="h-8 w-8" />
            Finance Setup
          </h1>
          <p className="text-muted-foreground">Configure default accounts for financial transactions</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Settings
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Main Settings</CardTitle>
          <CardDescription>
            Pre-configure the most used vote heads/chart of accounts for automatic transaction posting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {settingsFields.map((field) => {
              const relevantAccounts = getAccountsByType(field.type);
              return (
                <div key={field.key} className="space-y-2">
                  <Label className="flex items-center gap-1">
                    {field.label}
                    {field.required && <span className="text-destructive">*</span>}
                  </Label>
                  <Select
                    value={settings[field.key as keyof FinanceSettings] as string}
                    onValueChange={(value) => setSettings({ ...settings, [field.key]: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${field.type} account`} />
                    </SelectTrigger>
                    <SelectContent>
                      {relevantAccounts.length === 0 ? (
                        <SelectItem value="" disabled>
                          No {field.type} accounts found
                        </SelectItem>
                      ) : (
                        relevantAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.account_code} ({account.account_name})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Type: {field.type}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Options</CardTitle>
          <CardDescription>Configure workflow and display options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Approval for Student Invoice Adjustment?</Label>
              <p className="text-sm text-muted-foreground">
                Require approval workflow for invoice adjustments
              </p>
            </div>
            <Switch
              checked={settings.allow_invoice_adjustment_approval}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, allow_invoice_adjustment_approval: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Balance Inclusive of Future Invoices</Label>
              <p className="text-sm text-muted-foreground">
                Include future-dated invoices in balance calculations
              </p>
            </div>
            <Switch
              checked={settings.show_balance_with_future_invoices}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, show_balance_with_future_invoices: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Jiunge Applicant Fees Payment?</Label>
              <p className="text-sm text-muted-foreground">
                Enable fee payment for applicants during admission
              </p>
            </div>
            <Switch
              checked={settings.allow_jiunge_applicant_payment}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, allow_jiunge_applicant_payment: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Double-Entry Quick Reference</CardTitle>
          <CardDescription>Standard debit/credit rules for each account type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <h4 className="font-semibold text-blue-600">Assets</h4>
              <p className="text-sm">Debit to increase</p>
              <p className="text-sm">Credit to decrease</p>
            </div>
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <h4 className="font-semibold text-red-600">Liabilities</h4>
              <p className="text-sm">Credit to increase</p>
              <p className="text-sm">Debit to decrease</p>
            </div>
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <h4 className="font-semibold text-purple-600">Equity</h4>
              <p className="text-sm">Credit to increase</p>
              <p className="text-sm">Debit to decrease</p>
            </div>
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <h4 className="font-semibold text-green-600">Income</h4>
              <p className="text-sm">Credit to increase</p>
              <p className="text-sm">Debit to decrease</p>
            </div>
            <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <h4 className="font-semibold text-orange-600">Expenses</h4>
              <p className="text-sm">Debit to increase</p>
              <p className="text-sm">Credit to decrease</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
