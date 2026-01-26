import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function TOIL() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    earned_date: '',
    hours_earned: '',
    hours_used: '0',
    reason: '',
    status: 'available',
  });

  const { data: employees } = useQuery({
    queryKey: ['hr-employees-simple'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hr_employees').select('id, first_name, last_name, employee_no').eq('employment_status', 'active').order('first_name');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ['hr-toil'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_toil')
        .select(`*, employee:hr_employees(first_name, last_name, employee_no)`)
        .order('earned_date', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = { 
        ...data, 
        hours_earned: parseFloat(data.hours_earned),
        hours_used: parseFloat(data.hours_used) || 0,
      };
      if (editingItem) {
        const { error } = await supabase.from('hr_toil').update(payload).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('hr_toil').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: `TOIL ${editingItem ? 'updated' : 'recorded'} successfully` });
      queryClient.invalidateQueries({ queryKey: ['hr-toil'] });
      handleClose();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hr_toil').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "TOIL record deleted" });
      queryClient.invalidateQueries({ queryKey: ['hr-toil'] });
    }
  });

  const handleClose = () => {
    setOpen(false);
    setEditingItem(null);
    setFormData({ employee_id: '', earned_date: '', hours_earned: '', hours_used: '0', reason: '', status: 'available' });
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      employee_id: item.employee_id,
      earned_date: item.earned_date,
      hours_earned: item.hours_earned.toString(),
      hours_used: item.hours_used?.toString() || '0',
      reason: item.reason || '',
      status: item.status,
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employee_id || !formData.hours_earned || !formData.earned_date) {
      toast({ title: "Employee, date and hours are required", variant: "destructive" });
      return;
    }
    saveMutation.mutate(formData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'used': return 'bg-blue-100 text-blue-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Time Off In Lieu (TOIL)</h1>
          <p className="text-muted-foreground">Manage compensatory time off for overtime worked</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleClose()}>
              <Plus className="mr-2 h-4 w-4" /> Record TOIL
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit' : 'Record'} TOIL</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Employee *</Label>
                  <Select value={formData.employee_id} onValueChange={(v) => setFormData({ ...formData, employee_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>
                      {employees?.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date Earned *</Label>
                  <Input type="date" value={formData.earned_date} onChange={(e) => setFormData({ ...formData, earned_date: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hours Earned *</Label>
                    <Input type="number" step="0.5" min="0.5" value={formData.hours_earned} onChange={(e) => setFormData({ ...formData, hours_earned: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Hours Used</Label>
                    <Input type="number" step="0.5" min="0" value={formData.hours_used} onChange={(e) => setFormData({ ...formData, hours_used: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Textarea value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} placeholder="Reason for TOIL" />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="used">Used</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
                <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving...' : 'Save'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            TOIL Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : items?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No TOIL records found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date Earned</TableHead>
                  <TableHead>Earned</TableHead>
                  <TableHead>Used</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items?.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.employee?.first_name} {item.employee?.last_name}</TableCell>
                    <TableCell>{format(new Date(item.earned_date), 'PP')}</TableCell>
                    <TableCell>{item.hours_earned} hrs</TableCell>
                    <TableCell>{item.hours_used || 0} hrs</TableCell>
                    <TableCell className="font-medium">{(item.hours_earned - (item.hours_used || 0)).toFixed(1)} hrs</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs capitalize ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(item.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
