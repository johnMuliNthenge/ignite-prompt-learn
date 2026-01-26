import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

export default function DisciplinaryRecords() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    incident_date: '',
    type: 'warning',
    description: '',
    action_taken: '',
    outcome: '',
  });

  const { data: employees } = useQuery({
    queryKey: ['hr-employees-simple'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hr_employees').select('id, first_name, last_name, employee_no').order('first_name');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: records, isLoading } = useQuery({
    queryKey: ['hr-disciplinary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_disciplinary_records')
        .select(`*, employee:hr_employees(first_name, last_name, employee_no)`)
        .order('incident_date', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editingItem) {
        const { error } = await supabase.from('hr_disciplinary_records').update(data).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('hr_disciplinary_records').insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: `Record ${editingItem ? 'updated' : 'created'} successfully` });
      queryClient.invalidateQueries({ queryKey: ['hr-disciplinary'] });
      handleClose();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handleClose = () => {
    setOpen(false);
    setEditingItem(null);
    setFormData({ employee_id: '', incident_date: '', type: 'warning', description: '', action_taken: '', outcome: '' });
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      employee_id: item.employee_id,
      incident_date: item.incident_date,
      type: item.type,
      description: item.description || '',
      action_taken: item.action_taken || '',
      outcome: item.outcome || '',
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employee_id || !formData.incident_date || !formData.type || !formData.description) {
      toast({ title: "Employee, date, type and description are required", variant: "destructive" });
      return;
    }
    saveMutation.mutate(formData);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'termination': return 'bg-red-100 text-red-800';
      case 'suspension': return 'bg-orange-100 text-orange-800';
      case 'final_warning': return 'bg-yellow-100 text-yellow-800';
      case 'written_warning': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Disciplinary Records</h1>
          <p className="text-muted-foreground">Manage employee disciplinary actions</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleClose()}>
              <Plus className="mr-2 h-4 w-4" /> New Record
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit' : 'Create'} Disciplinary Record</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
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
                    <Label>Incident Date *</Label>
                    <Input type="date" value={formData.incident_date} onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="verbal_warning">Verbal Warning</SelectItem>
                      <SelectItem value="written_warning">Written Warning</SelectItem>
                      <SelectItem value="final_warning">Final Warning</SelectItem>
                      <SelectItem value="suspension">Suspension</SelectItem>
                      <SelectItem value="termination">Termination</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Describe the incident" />
                </div>
                <div className="space-y-2">
                  <Label>Action Taken</Label>
                  <Textarea value={formData.action_taken} onChange={(e) => setFormData({ ...formData, action_taken: e.target.value })} placeholder="Actions taken" />
                </div>
                <div className="space-y-2">
                  <Label>Outcome</Label>
                  <Textarea value={formData.outcome} onChange={(e) => setFormData({ ...formData, outcome: e.target.value })} placeholder="Final outcome" />
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
            <AlertTriangle className="h-5 w-5" />
            All Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : records?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No disciplinary records found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Finalized</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records?.map((record: any) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.employee?.first_name} {record.employee?.last_name}</TableCell>
                    <TableCell>{format(new Date(record.incident_date), 'PP')}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs capitalize ${getTypeColor(record.type)}`}>
                        {record.type.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{record.description || '-'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${record.is_finalized ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {record.is_finalized ? 'Yes' : 'No'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(record)} disabled={record.is_finalized}><Edit className="h-4 w-4" /></Button>
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