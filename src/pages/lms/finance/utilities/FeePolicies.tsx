import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface FeePolicy {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  due_date: string | null;
  is_active: boolean;
  academic_year_id: string | null;
  fee_account_id: string | null;
  session_type_id: string | null;
  student_type_id: string | null;
}

export default function FeePolicies() {
  const { isAdmin } = useAuth();
  const [policies, setPolicies] = useState<FeePolicy[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [feeAccounts, setFeeAccounts] = useState<any[]>([]);
  const [sessionTypes, setSessionTypes] = useState<any[]>([]);
  const [studentTypes, setStudentTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FeePolicy | null>(null);
  const [formData, setFormData] = useState({
    name: '', description: '', amount: '', due_date: '', is_active: true,
    academic_year_id: '', fee_account_id: '', session_type_id: '', student_type_id: '',
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [pRes, ayRes, faRes, stRes, studRes] = await Promise.all([
      supabase.from('fee_policies').select('*').order('name'),
      supabase.from('academic_years').select('id, name').order('name'),
      supabase.from('fee_accounts').select('id, name').eq('is_active', true),
      supabase.from('session_types').select('id, name').eq('is_active', true),
      supabase.from('student_types').select('id, name').eq('is_active', true),
    ]);
    if (pRes.data) setPolicies(pRes.data);
    if (ayRes.data) setAcademicYears(ayRes.data);
    if (faRes.data) setFeeAccounts(faRes.data);
    if (stRes.data) setSessionTypes(stRes.data);
    if (studRes.data) setStudentTypes(studRes.data);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.amount) {
      toast.error('Name and Amount are required');
      return;
    }

    const payload = {
      name: formData.name,
      description: formData.description || null,
      amount: parseFloat(formData.amount),
      due_date: formData.due_date || null,
      is_active: formData.is_active,
      academic_year_id: formData.academic_year_id || null,
      fee_account_id: formData.fee_account_id || null,
      session_type_id: formData.session_type_id || null,
      student_type_id: formData.student_type_id || null,
    };

    if (editingItem) {
      const { error } = await supabase.from('fee_policies').update(payload).eq('id', editingItem.id);
      if (error) { toast.error('Failed to update'); return; }
      toast.success('Fee policy updated');
    } else {
      const { error } = await supabase.from('fee_policies').insert(payload);
      if (error) { toast.error('Failed to create'); return; }
      toast.success('Fee policy created');
    }
    
    setDialogOpen(false);
    setEditingItem(null);
    resetForm();
    fetchData();
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', amount: '', due_date: '', is_active: true, academic_year_id: '', fee_account_id: '', session_type_id: '', student_type_id: '' });
  };

  const handleEdit = (item: FeePolicy) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      amount: String(item.amount),
      due_date: item.due_date || '',
      is_active: item.is_active !== false,
      academic_year_id: item.academic_year_id || '',
      fee_account_id: item.fee_account_id || '',
      session_type_id: item.session_type_id || '',
      student_type_id: item.student_type_id || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this fee policy?')) return;
    const { error } = await supabase.from('fee_policies').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Fee policy deleted');
    fetchData();
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);

  if (!isAdmin) {
    return <div className="p-6"><p className="text-muted-foreground">Access denied.</p></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Fee Policies</h1>
          <p className="text-muted-foreground">Define fee structures for different student types and sessions</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingItem(null); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Fee Policy</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit' : 'Add'} Fee Policy</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Tuition Fee" />
                </div>
                <div className="space-y-2">
                  <Label>Amount (KES) *</Label>
                  <Input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="50000" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Academic Year</Label>
                  <Select value={formData.academic_year_id} onValueChange={(v) => setFormData({ ...formData, academic_year_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{academicYears.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fee Account</Label>
                  <Select value={formData.fee_account_id} onValueChange={(v) => setFormData({ ...formData, fee_account_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{feeAccounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Session Type</Label>
                  <Select value={formData.session_type_id} onValueChange={(v) => setFormData({ ...formData, session_type_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{sessionTypes.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Student Type</Label>
                <Select value={formData.student_type_id} onValueChange={(v) => setFormData({ ...formData, student_type_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{studentTypes.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
                <Label>Active</Label>
              </div>
              <Button onClick={handleSubmit} className="w-full">{editingItem ? 'Update' : 'Create'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Fee Policies</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No fee policies found</TableCell></TableRow>
                ) : (
                  policies.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                      <TableCell>{item.description || '-'}</TableCell>
                      <TableCell>
                        {item.is_active ? <Badge className="bg-green-500">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
