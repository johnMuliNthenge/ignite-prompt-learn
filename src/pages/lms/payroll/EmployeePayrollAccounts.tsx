import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Edit, Users, Search, Plus, Trash2 } from 'lucide-react';

interface BankAccount {
  id?: string;
  account_number: string;
  bank_code: string;
  bank_name: string;
  branch_name: string;
  percentage: number;
  financial_institution_id: string;
  is_primary: boolean;
}

const EmployeePayrollAccounts = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [payrollAccounts, setPayrollAccounts] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [payGrades, setPayGrades] = useState<any[]>([]);
  const [disbursementModes, setDisbursementModes] = useState<any[]>([]);
  const [employeeStatuses, setEmployeeStatuses] = useState<any[]>([]);
  const [financialInstitutions, setFinancialInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isAddMode, setIsAddMode] = useState(false);

  const handleAdd = () => {
    setIsAddMode(true);
    setSelectedEmployee(null);
    setForm({
      salary_structure_id: '', basic_salary: 0, is_active: true,
      pay_grade_id: '', processing_method: 'normal',
      disbursement_mode_id: '', employee_status_id: '',
      tax_number: '', pension_number: '',
      sheltered_paye: false, sheltered_nhif: false, sheltered_nssf: false,
      sheltered_housing_levy: false, sheltered_nhlf: false,
      effective_date: '', end_date: '', notes: '',
    });
    setBankAccounts([]);
    setShowDialog(true);
  };

  const unconfiguredEmployees = employees.filter(e => !getPayrollAccount(e.id));

  const [form, setForm] = useState({
    salary_structure_id: '', basic_salary: 0, is_active: true,
    pay_grade_id: '', processing_method: 'normal',
    disbursement_mode_id: '', employee_status_id: '',
    tax_number: '', pension_number: '',
    sheltered_paye: false, sheltered_nhif: false, sheltered_nssf: false,
    sheltered_housing_levy: false, sheltered_nhlf: false,
    effective_date: '', end_date: '', notes: '',
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [empRes, paRes, strRes, pgRes, dmRes, esRes, fiRes] = await Promise.all([
      supabase.from('hr_employees').select('id, employee_no, first_name, middle_name, last_name, email, department_id, designation_id, status, hr_departments(name), hr_designations(title)').eq('status', 'active').order('first_name'),
      supabase.from('employee_payroll_accounts').select('*'),
      supabase.from('salary_structures').select('id, name').eq('is_active', true),
      supabase.from('pay_grades').select('id, name'),
      supabase.from('salary_disbursement_modes').select('id, name').eq('is_active', true),
      supabase.from('payroll_employee_statuses').select('id, name').eq('is_active', true),
      supabase.from('financial_institutions').select('id, name, bank_code, branch_code').eq('is_active', true),
    ]);
    setEmployees(empRes.data || []);
    setPayrollAccounts(paRes.data || []);
    setStructures(strRes.data || []);
    setPayGrades(pgRes.data || []);
    setDisbursementModes(dmRes.data || []);
    setEmployeeStatuses(esRes.data || []);
    setFinancialInstitutions(fiRes.data || []);
    setLoading(false);
  };

  const getPayrollAccount = (employeeId: string) => payrollAccounts.find(pa => pa.employee_id === employeeId);

  const handleEdit = async (emp: any) => {
    setIsAddMode(false);
    setSelectedEmployee(emp);
    const existing = getPayrollAccount(emp.id);
    if (existing) {
      setForm({
        salary_structure_id: existing.salary_structure_id || '',
        basic_salary: existing.basic_salary || 0,
        is_active: existing.is_active,
        pay_grade_id: existing.pay_grade_id || '',
        processing_method: existing.processing_method || 'normal',
        disbursement_mode_id: existing.disbursement_mode_id || '',
        employee_status_id: existing.employee_status_id || '',
        tax_number: existing.tax_number || '',
        pension_number: existing.pension_number || '',
        sheltered_paye: existing.sheltered_paye || false,
        sheltered_nhif: existing.sheltered_nhif || false,
        sheltered_nssf: existing.sheltered_nssf || false,
        sheltered_housing_levy: existing.sheltered_housing_levy || false,
        sheltered_nhlf: existing.sheltered_nhlf || false,
        effective_date: existing.effective_date || '',
        end_date: existing.end_date || '',
        notes: existing.notes || '',
      });
    } else {
      setForm({
        salary_structure_id: '', basic_salary: 0, is_active: true,
        pay_grade_id: '', processing_method: 'normal',
        disbursement_mode_id: '', employee_status_id: '',
        tax_number: '', pension_number: '',
        sheltered_paye: false, sheltered_nhif: false, sheltered_nssf: false,
        sheltered_housing_levy: false, sheltered_nhlf: false,
        effective_date: '', end_date: '', notes: '',
      });
    }
    // Fetch bank accounts
    const { data: banks } = await supabase.from('employee_bank_accounts').select('*').eq('employee_id', emp.id).eq('is_active', true);
    setBankAccounts((banks || []).map(b => ({
      id: b.id, account_number: b.account_number, bank_code: b.bank_code || '',
      bank_name: b.bank_name || '', branch_name: b.branch_name || '',
      percentage: b.percentage || 100, financial_institution_id: b.financial_institution_id || '',
      is_primary: b.is_primary || false,
    })));
    setShowDialog(true);
  };

  const addBankRow = () => {
    setBankAccounts([...bankAccounts, { account_number: '', bank_code: '', bank_name: '', branch_name: '', percentage: 0, financial_institution_id: '', is_primary: bankAccounts.length === 0 }]);
  };

  const removeBankRow = (idx: number) => {
    setBankAccounts(bankAccounts.filter((_, i) => i !== idx));
  };

  const updateBankRow = (idx: number, field: string, value: any) => {
    const updated = [...bankAccounts];
    (updated[idx] as any)[field] = value;
    // Auto-fill bank name from financial institution
    if (field === 'financial_institution_id') {
      const fi = financialInstitutions.find(f => f.id === value);
      if (fi) {
        updated[idx].bank_name = fi.name;
        updated[idx].bank_code = fi.bank_code || '';
        updated[idx].branch_name = fi.branch_code || '';
      }
    }
    setBankAccounts(updated);
  };

  const totalBankPercentage = bankAccounts.reduce((s, b) => s + (b.percentage || 0), 0);

  const handleSave = async () => {
    if (!selectedEmployee) {
      toast.error('Please select an employee');
      return;
    }
    if (bankAccounts.length > 0 && totalBankPercentage !== 100) {
      toast.error('Bank account percentages must total 100%');
      return;
    }
    try {
      const existing = getPayrollAccount(selectedEmployee.id);
      const payload: any = {
        employee_id: selectedEmployee.id,
        salary_structure_id: form.salary_structure_id || null,
        basic_salary: Number(form.basic_salary),
        is_active: form.is_active,
        pay_grade_id: form.pay_grade_id || null,
        processing_method: form.processing_method || 'normal',
        disbursement_mode_id: form.disbursement_mode_id || null,
        employee_status_id: form.employee_status_id || null,
        tax_number: form.tax_number || null,
        pension_number: form.pension_number || null,
        sheltered_paye: form.sheltered_paye,
        sheltered_nhif: form.sheltered_nhif,
        sheltered_nssf: form.sheltered_nssf,
        sheltered_housing_levy: form.sheltered_housing_levy,
        sheltered_nhlf: form.sheltered_nhlf,
        effective_date: form.effective_date || null,
        end_date: form.end_date || null,
        notes: form.notes || null,
      };

      if (existing) {
        const { error } = await supabase.from('employee_payroll_accounts').update(payload).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('employee_payroll_accounts').insert(payload);
        if (error) throw error;
      }

      // Save bank accounts
      // Deactivate existing
      await supabase.from('employee_bank_accounts').update({ is_active: false }).eq('employee_id', selectedEmployee.id);
      // Insert/update new
      for (const bank of bankAccounts) {
        const bankPayload = {
          employee_id: selectedEmployee.id,
          account_number: bank.account_number,
          bank_code: bank.bank_code || null,
          bank_name: bank.bank_name || null,
          branch_name: bank.branch_name || null,
          percentage: bank.percentage,
          financial_institution_id: bank.financial_institution_id || null,
          is_primary: bank.is_primary,
          is_active: true,
        };
        if (bank.id) {
          await supabase.from('employee_bank_accounts').update(bankPayload).eq('id', bank.id);
        } else {
          await supabase.from('employee_bank_accounts').insert(bankPayload);
        }
      }

      toast.success('Payroll account saved');
      setShowDialog(false);
      fetchData();
    } catch (err: any) { toast.error(err.message); }
  };

  const filtered = employees.filter(e => {
    const name = `${e.first_name} ${e.middle_name || ''} ${e.last_name}`.toLowerCase();
    return name.includes(search.toLowerCase()) || (e.employee_no || '').toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Users className="h-6 w-6" /><h1 className="text-2xl font-bold">Employee Payroll Accounts</h1></div>
        <Button onClick={handleAdd}><Plus className="mr-2 h-4 w-4" />Add Account</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-10" placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Badge variant="outline">{payrollAccounts.length} / {employees.length} configured</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <p>Loading...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Basic Salary</TableHead>
                  <TableHead>Sheltered</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No employees found</TableCell></TableRow> :
                  filtered.map(emp => {
                    const pa = getPayrollAccount(emp.id);
                    const sheltered = pa ? [pa.sheltered_paye && 'PAYE', pa.sheltered_nhif && 'NHIF', pa.sheltered_nssf && 'NSSF', pa.sheltered_housing_levy && 'H.Levy', pa.sheltered_nhlf && 'NHLF'].filter(Boolean) : [];
                    return (
                      <TableRow key={emp.id}>
                        <TableCell className="font-mono">{emp.employee_no}</TableCell>
                        <TableCell className="font-medium">{emp.first_name} {emp.middle_name || ''} {emp.last_name}</TableCell>
                        <TableCell>{emp.hr_departments?.name || '-'}</TableCell>
                        <TableCell>{emp.hr_designations?.title || '-'}</TableCell>
                        <TableCell>{pa?.basic_salary ? pa.basic_salary.toLocaleString() : '-'}</TableCell>
                        <TableCell>
                          {sheltered.length > 0 ? sheltered.map(s => <Badge key={s as string} variant="outline" className="mr-1 text-xs">{s}</Badge>) : '-'}
                        </TableCell>
                        <TableCell><Badge variant={pa ? 'default' : 'secondary'}>{pa ? 'Configured' : 'Pending'}</Badge></TableCell>
                        <TableCell><Button size="icon" variant="ghost" onClick={() => handleEdit(emp)}><Edit className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    );
                  })
                }
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isAddMode ? 'Add Employee Payroll Account' : `Employee Service Profile: ${selectedEmployee?.first_name} ${selectedEmployee?.last_name}`}</DialogTitle></DialogHeader>
          <div className="space-y-6">
            {/* Employee Selection (Add mode) or Basic Info (Edit mode) */}
            {isAddMode ? (
              <div>
                <Label>Select Employee</Label>
                <Select value={selectedEmployee?.id || ''} onValueChange={v => {
                  const emp = employees.find(e => e.id === v);
                  setSelectedEmployee(emp || null);
                }}>
                  <SelectTrigger><SelectValue placeholder="Select an employee" /></SelectTrigger>
                  <SelectContent>
                    {unconfiguredEmployees.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.employee_no} - {e.first_name} {e.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Employee Code</Label><Input disabled value={selectedEmployee?.employee_no || ''} /></div>
                <div><Label>Department</Label><Input disabled value={selectedEmployee?.hr_departments?.name || ''} /></div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div><Label>Salary Structure</Label>
                <Select value={form.salary_structure_id} onValueChange={v => setForm({...form, salary_structure_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Please Select" /></SelectTrigger>
                  <SelectContent>{structures.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Processing Method</Label>
                <Select value={form.processing_method} onValueChange={v => setForm({...form, processing_method: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label>Pay Grade</Label>
                <Select value={form.pay_grade_id} onValueChange={v => setForm({...form, pay_grade_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Please Select" /></SelectTrigger>
                  <SelectContent>{payGrades.map(pg => <SelectItem key={pg.id} value={pg.id}>{pg.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Basic Salary</Label><Input type="number" value={form.basic_salary} onChange={e => setForm({...form, basic_salary: Number(e.target.value)})} /></div>
            </div>

            <Separator />

            {/* Sheltered from Paying */}
            <div>
              <Label className="text-base font-semibold">Sheltered from Paying</Label>
              <div className="flex flex-wrap gap-6 mt-2">
                {[
                  { field: 'sheltered_paye', label: 'PAYE' },
                  { field: 'sheltered_nhif', label: 'NHIF' },
                  { field: 'sheltered_nssf', label: 'NSSF' },
                  { field: 'sheltered_housing_levy', label: 'Housing Levy' },
                  { field: 'sheltered_nhlf', label: 'NHLF' },
                ].map(item => (
                  <div key={item.field} className="flex items-center gap-2">
                    <Checkbox checked={(form as any)[item.field]} onCheckedChange={v => setForm({...form, [item.field]: v})} />
                    <Label>{item.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div><Label>Employee Status</Label>
                <Select value={form.employee_status_id} onValueChange={v => setForm({...form, employee_status_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Please Select" /></SelectTrigger>
                  <SelectContent>{employeeStatuses.map(es => <SelectItem key={es.id} value={es.id}>{es.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Salary Disbursement Mode</Label>
                <Select value={form.disbursement_mode_id} onValueChange={v => setForm({...form, disbursement_mode_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Please Select" /></SelectTrigger>
                  <SelectContent>{disbursementModes.map(dm => <SelectItem key={dm.id} value={dm.id}>{dm.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label>Effective Date</Label><Input type="date" value={form.effective_date} onChange={e => setForm({...form, effective_date: e.target.value})} /></div>
              <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} /></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label>Tax Number (KRA PIN)</Label><Input value={form.tax_number} onChange={e => setForm({...form, tax_number: e.target.value})} /></div>
              <div><Label>Pension Number</Label><Input value={form.pension_number} onChange={e => setForm({...form, pension_number: e.target.value})} /></div>
            </div>

            <Separator />

            {/* Bank Accounts */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">Bank Accounts</Label>
                <Button size="sm" variant="outline" onClick={addBankRow}><Plus className="h-3 w-3 mr-1" />Add Bank</Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account No.</TableHead>
                    <TableHead>Bank Code</TableHead>
                    <TableHead>Bank & Branch</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bankAccounts.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-sm">No bank accounts added</TableCell></TableRow>
                  ) : bankAccounts.map((bank, idx) => (
                    <TableRow key={idx}>
                      <TableCell><Input value={bank.account_number} onChange={e => updateBankRow(idx, 'account_number', e.target.value)} className="h-8" /></TableCell>
                      <TableCell><Input value={bank.bank_code} onChange={e => updateBankRow(idx, 'bank_code', e.target.value)} className="h-8 w-20" /></TableCell>
                      <TableCell>
                        <Select value={bank.financial_institution_id} onValueChange={v => updateBankRow(idx, 'financial_institution_id', v)}>
                          <SelectTrigger className="h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>{financialInstitutions.map(fi => <SelectItem key={fi.id} value={fi.id}>{fi.name} - {fi.branch || 'Main'}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Input type="number" value={bank.percentage} onChange={e => updateBankRow(idx, 'percentage', Number(e.target.value))} className="h-8 w-20" /></TableCell>
                      <TableCell><Button size="icon" variant="ghost" onClick={() => removeBankRow(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                    </TableRow>
                  ))}
                  {bankAccounts.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-medium text-sm">Total Percentage (should be 100%)</TableCell>
                      <TableCell className={`font-bold ${totalBankPercentage === 100 ? 'text-green-600' : 'text-destructive'}`}>{totalBankPercentage}%</TableCell>
                      <TableCell />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <Separator />

            <div><Label>Notes/Details</Label><Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={3} /></div>
          </div>
          <DialogFooter><Button onClick={handleSave}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeePayrollAccounts;
