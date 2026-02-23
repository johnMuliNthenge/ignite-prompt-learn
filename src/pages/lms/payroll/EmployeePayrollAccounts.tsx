import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Edit, Users, Search } from 'lucide-react';

const EmployeePayrollAccounts = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [payrollAccounts, setPayrollAccounts] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [paymentModes, setPaymentModes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    salary_structure_id: '', payment_mode_id: '', bank_name: '', bank_branch: '',
    bank_account_number: '', tax_number: '', pension_number: '', basic_salary: 0, is_active: true,
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [empRes, paRes, strRes, pmRes] = await Promise.all([
      supabase.from('hr_employees').select('id, employee_no, first_name, middle_name, last_name, email, department_id, designation_id, status, hr_departments(name), hr_designations(title)').eq('status', 'active').order('first_name'),
      supabase.from('employee_payroll_accounts').select('*'),
      supabase.from('salary_structures').select('id, name').eq('is_active', true),
      supabase.from('payment_modes').select('id, name').eq('is_active', true).eq('can_pay', true),
    ]);
    setEmployees(empRes.data || []);
    setPayrollAccounts(paRes.data || []);
    setStructures(strRes.data || []);
    setPaymentModes(pmRes.data || []);
    setLoading(false);
  };

  const getPayrollAccount = (employeeId: string) => payrollAccounts.find(pa => pa.employee_id === employeeId);

  const handleEdit = (emp: any) => {
    setSelectedEmployee(emp);
    const existing = getPayrollAccount(emp.id);
    if (existing) {
      setForm({
        salary_structure_id: existing.salary_structure_id || '',
        payment_mode_id: existing.payment_mode_id || '',
        bank_name: existing.bank_name || '',
        bank_branch: existing.bank_branch || '',
        bank_account_number: existing.bank_account_number || '',
        tax_number: existing.tax_number || '',
        pension_number: existing.pension_number || '',
        basic_salary: existing.basic_salary || 0,
        is_active: existing.is_active,
      });
    } else {
      setForm({ salary_structure_id: '', payment_mode_id: '', bank_name: '', bank_branch: '', bank_account_number: '', tax_number: '', pension_number: '', basic_salary: 0, is_active: true });
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    try {
      const existing = getPayrollAccount(selectedEmployee.id);
      const payload = {
        employee_id: selectedEmployee.id,
        salary_structure_id: form.salary_structure_id || null,
        payment_mode_id: form.payment_mode_id || null,
        bank_name: form.bank_name || null,
        bank_branch: form.bank_branch || null,
        bank_account_number: form.bank_account_number || null,
        tax_number: form.tax_number || null,
        pension_number: form.pension_number || null,
        basic_salary: Number(form.basic_salary),
        is_active: form.is_active,
      };
      if (existing) {
        const { error } = await supabase.from('employee_payroll_accounts').update(payload).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('employee_payroll_accounts').insert(payload);
        if (error) throw error;
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
                  <TableHead>Salary Structure</TableHead>
                  <TableHead>Basic Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No employees found</TableCell></TableRow> :
                  filtered.map(emp => {
                    const pa = getPayrollAccount(emp.id);
                    const structureName = pa?.salary_structure_id ? structures.find(s => s.id === pa.salary_structure_id)?.name : null;
                    return (
                      <TableRow key={emp.id}>
                        <TableCell className="font-mono">{emp.employee_no}</TableCell>
                        <TableCell className="font-medium">{emp.first_name} {emp.middle_name || ''} {emp.last_name}</TableCell>
                        <TableCell>{emp.hr_departments?.name || '-'}</TableCell>
                        <TableCell>{emp.hr_designations?.title || '-'}</TableCell>
                        <TableCell>{structureName || <span className="text-muted-foreground">Not assigned</span>}</TableCell>
                        <TableCell>{pa?.basic_salary ? pa.basic_salary.toLocaleString() : '-'}</TableCell>
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
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Payroll Account: {selectedEmployee?.first_name} {selectedEmployee?.last_name}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div><Label>Salary Structure</Label>
              <Select value={form.salary_structure_id} onValueChange={v => setForm({...form, salary_structure_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select structure" /></SelectTrigger>
                <SelectContent>{structures.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Basic Salary</Label><Input type="number" value={form.basic_salary} onChange={e => setForm({...form, basic_salary: Number(e.target.value)})} /></div>
            <div><Label>Payment Mode</Label>
              <Select value={form.payment_mode_id} onValueChange={v => setForm({...form, payment_mode_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
                <SelectContent>{paymentModes.map(pm => <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Bank Name</Label><Input value={form.bank_name} onChange={e => setForm({...form, bank_name: e.target.value})} /></div>
              <div><Label>Branch</Label><Input value={form.bank_branch} onChange={e => setForm({...form, bank_branch: e.target.value})} /></div>
            </div>
            <div><Label>Bank Account Number</Label><Input value={form.bank_account_number} onChange={e => setForm({...form, bank_account_number: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Tax Number (KRA PIN)</Label><Input value={form.tax_number} onChange={e => setForm({...form, tax_number: e.target.value})} /></div>
              <div><Label>Pension Number</Label><Input value={form.pension_number} onChange={e => setForm({...form, pension_number: e.target.value})} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSave}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeePayrollAccounts;
