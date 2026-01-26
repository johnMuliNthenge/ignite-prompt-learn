import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2 } from "lucide-react";

export default function LeaveTypes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    is_paid: true,
    annual_entitlement: 0,
    accrual_rate: 0,
    carry_forward_limit: 0,
    max_days_per_request: null as number | null,
    gender_restriction: '',
    requires_approval: true,
    is_active: true,
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ['hr-leave-types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hr_leave_types').select('*').order('name');
      if (error) throw error;
      return data || [];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const insertData = {
        ...data,
        gender_restriction: data.gender_restriction || null,
      };
      if (editingItem) {
        const { error } = await supabase.from('hr_leave_types').update(insertData).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('hr_leave_types').insert(insertData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: `Leave type ${editingItem ? 'updated' : 'created'} successfully` });
      queryClient.invalidateQueries({ queryKey: ['hr-leave-types'] });
      handleClose();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hr_leave_types').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Leave type deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['hr-leave-types'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handleClose = () => {
    setOpen(false);
    setEditingItem(null);
    setFormData({
      code: '', name: '', is_paid: true, annual_entitlement: 0, accrual_rate: 0,
      carry_forward_limit: 0, max_days_per_request: null, gender_restriction: '',
      requires_approval: true, is_active: true,
    });
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      is_paid: item.is_paid,
      annual_entitlement: item.annual_entitlement,
      accrual_rate: item.accrual_rate,
      carry_forward_limit: item.carry_forward_limit,
      max_days_per_request: item.max_days_per_request,
      gender_restriction: item.gender_restriction || '',
      requires_approval: item.requires_approval,
      is_active: item.is_active,
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) {
      toast({ title: "Code and name are required", variant: "destructive" });
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Leave Types</h1>
          <p className="text-muted-foreground">Configure leave types and entitlements</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleClose()}>
              <Plus className="mr-2 h-4 w-4" /> Add Leave Type
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit' : 'Add'} Leave Type</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input id="code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="e.g., AL" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Annual Leave" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="annual_entitlement">Annual Entitlement (days)</Label>
                  <Input id="annual_entitlement" type="number" value={formData.annual_entitlement} onChange={(e) => setFormData({ ...formData, annual_entitlement: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accrual_rate">Monthly Accrual Rate</Label>
                  <Input id="accrual_rate" type="number" step="0.01" value={formData.accrual_rate} onChange={(e) => setFormData({ ...formData, accrual_rate: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="carry_forward_limit">Carry Forward Limit (days)</Label>
                  <Input id="carry_forward_limit" type="number" value={formData.carry_forward_limit} onChange={(e) => setFormData({ ...formData, carry_forward_limit: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_days_per_request">Max Days Per Request</Label>
                  <Input id="max_days_per_request" type="number" value={formData.max_days_per_request || ''} onChange={(e) => setFormData({ ...formData, max_days_per_request: e.target.value ? parseInt(e.target.value) : null })} />
                </div>
                <div className="space-y-2">
                  <Label>Gender Restriction</Label>
                  <Select value={formData.gender_restriction || "none"} onValueChange={(v) => setFormData({ ...formData, gender_restriction: v === "none" ? "" : v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="No restriction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Restriction</SelectItem>
                      <SelectItem value="male">Male Only</SelectItem>
                      <SelectItem value="female">Female Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch id="is_paid" checked={formData.is_paid} onCheckedChange={(checked) => setFormData({ ...formData, is_paid: checked })} />
                    <Label htmlFor="is_paid">Paid Leave</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="requires_approval" checked={formData.requires_approval} onCheckedChange={(checked) => setFormData({ ...formData, requires_approval: checked })} />
                    <Label htmlFor="requires_approval">Requires Approval</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="is_active" checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
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
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : items?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No leave types found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Entitlement</TableHead>
                  <TableHead>Carry Forward</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items?.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.code}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.is_paid ? 'Yes' : 'No'}</TableCell>
                    <TableCell>{item.annual_entitlement} days</TableCell>
                    <TableCell>{item.carry_forward_limit} days</TableCell>
                    <TableCell>{item.gender_restriction || 'All'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${item.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {item.is_active ? 'Active' : 'Inactive'}
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
