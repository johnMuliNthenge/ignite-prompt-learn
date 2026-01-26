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
import { Plus, Edit, Star } from "lucide-react";
import { format } from "date-fns";

export default function PerformanceReviews() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    period_id: '',
    reviewer_id: '',
    overall_rating: '',
    strengths: '',
    improvements: '',
    goals: '',
    comments: '',
    status: 'draft',
  });

  const { data: employees } = useQuery({
    queryKey: ['hr-employees-simple'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hr_employees').select('id, first_name, last_name, employee_no').order('first_name');
      if (error) throw error;
      return data || [];
    }
  });

  const periods: any[] = [];

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['hr-performance-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_performance_reviews')
        .select(`
          *,
          employee:hr_employees!hr_performance_reviews_employee_id_fkey(first_name, last_name),
          period:hr_evaluation_periods(name)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        employee_id: data.employee_id,
        period_id: data.period_id || null,
        reviewer_id: data.reviewer_id || null,
        overall_rating: data.overall_rating ? parseFloat(data.overall_rating) : null,
        strengths: data.strengths,
        improvements: data.improvements,
        goals: data.goals,
        comments: data.comments,
        status: data.status,
      };
      if (editingItem) {
        const { error } = await supabase.from('hr_performance_reviews').update(payload).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('hr_performance_reviews').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: `Review ${editingItem ? 'updated' : 'created'} successfully` });
      queryClient.invalidateQueries({ queryKey: ['hr-performance-reviews'] });
      handleClose();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handleClose = () => {
    setOpen(false);
    setEditingItem(null);
    setFormData({ employee_id: '', period_id: '', reviewer_id: '', overall_rating: '', strengths: '', improvements: '', goals: '', comments: '', status: 'draft' });
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      employee_id: item.employee_id,
      period_id: item.period_id || '',
      reviewer_id: item.reviewer_id || '',
      overall_rating: item.overall_rating?.toString() || '',
      strengths: item.strengths || '',
      improvements: item.improvements || '',
      goals: item.goals || '',
      comments: item.comments || '',
      status: item.status,
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employee_id) {
      toast({ title: "Employee is required", variant: "destructive" });
      return;
    }
    saveMutation.mutate(formData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Performance Reviews</h1>
          <p className="text-muted-foreground">Conduct and manage employee performance evaluations</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleClose()}>
              <Plus className="mr-2 h-4 w-4" /> New Review
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit' : 'Create'} Performance Review</DialogTitle>
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
                    <Label>Review Period</Label>
                    <Select value={formData.period_id} onValueChange={(v) => setFormData({ ...formData, period_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select period" /></SelectTrigger>
                      <SelectContent>
                        {periods?.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Reviewer</Label>
                    <Select value={formData.reviewer_id} onValueChange={(v) => setFormData({ ...formData, reviewer_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select reviewer" /></SelectTrigger>
                      <SelectContent>
                        {employees?.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Overall Rating (1-5)</Label>
                    <Input type="number" min="1" max="5" step="0.1" value={formData.overall_rating} onChange={(e) => setFormData({ ...formData, overall_rating: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Strengths</Label>
                  <Textarea value={formData.strengths} onChange={(e) => setFormData({ ...formData, strengths: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Areas for Improvement</Label>
                  <Textarea value={formData.improvements} onChange={(e) => setFormData({ ...formData, improvements: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Goals for Next Period</Label>
                  <Textarea value={formData.goals} onChange={(e) => setFormData({ ...formData, goals: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Additional Comments</Label>
                  <Textarea value={formData.comments} onChange={(e) => setFormData({ ...formData, comments: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
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
            <Star className="h-5 w-5" />
            All Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : reviews?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No reviews found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews?.map((review: any) => (
                  <TableRow key={review.id}>
                    <TableCell className="font-medium">{review.employee?.first_name} {review.employee?.last_name}</TableCell>
                    <TableCell>{review.period?.name || '-'}</TableCell>
                    <TableCell>
                      {review.overall_rating ? (
                        <span className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-primary text-primary" />
                          {review.overall_rating.toFixed(1)}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs capitalize ${getStatusColor(review.status)}`}>
                        {review.status.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell>{format(new Date(review.created_at), 'PP')}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(review)}><Edit className="h-4 w-4" /></Button>
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