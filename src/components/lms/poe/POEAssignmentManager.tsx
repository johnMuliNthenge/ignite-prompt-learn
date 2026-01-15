import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, FileText, Users } from 'lucide-react';
import { format } from 'date-fns';

interface POEAssignmentManagerProps {
  courseId: string;
}

interface POEAssignment {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  due_date: string | null;
  max_score: number;
  grading_scale_id: string | null;
  is_published: boolean;
  created_at: string;
}

interface GradingScale {
  id: string;
  name: string;
  scale_type: string;
}

export const POEAssignmentManager = ({ courseId }: POEAssignmentManagerProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<POEAssignment | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    due_date: '',
    max_score: 100,
    grading_scale_id: '',
    is_published: false,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['poe-assignments', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('poe_assignments')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as POEAssignment[];
    },
  });

  const { data: gradingScales } = useQuery({
    queryKey: ['grading-scales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grading_scales')
        .select('id, name, scale_type')
        .order('name');
      if (error) throw error;
      return data as GradingScale[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from('poe_assignments').insert({
        course_id: courseId,
        title: data.title,
        description: data.description || null,
        instructions: data.instructions || null,
        due_date: data.due_date || null,
        max_score: data.max_score,
        grading_scale_id: data.grading_scale_id || null,
        is_published: data.is_published,
        created_by: user.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poe-assignments', courseId] });
      toast({ title: 'POE assignment created successfully' });
      resetForm();
    },
    onError: () => {
      toast({ title: 'Failed to create assignment', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('poe_assignments')
        .update({
          title: data.title,
          description: data.description || null,
          instructions: data.instructions || null,
          due_date: data.due_date || null,
          max_score: data.max_score,
          grading_scale_id: data.grading_scale_id || null,
          is_published: data.is_published,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poe-assignments', courseId] });
      toast({ title: 'Assignment updated successfully' });
      resetForm();
    },
    onError: () => {
      toast({ title: 'Failed to update assignment', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('poe_assignments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poe-assignments', courseId] });
      toast({ title: 'Assignment deleted' });
    },
    onError: () => {
      toast({ title: 'Failed to delete assignment', variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      instructions: '',
      due_date: '',
      max_score: 100,
      grading_scale_id: '',
      is_published: false,
    });
    setEditingAssignment(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (assignment: POEAssignment) => {
    setEditingAssignment(assignment);
    setFormData({
      title: assignment.title,
      description: assignment.description || '',
      instructions: assignment.instructions || '',
      due_date: assignment.due_date ? format(new Date(assignment.due_date), "yyyy-MM-dd'T'HH:mm") : '',
      max_score: assignment.max_score,
      grading_scale_id: assignment.grading_scale_id || '',
      is_published: assignment.is_published,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAssignment) {
      updateMutation.mutate({ id: editingAssignment.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading POE assignments...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">POE Assignments</h3>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Assignment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAssignment ? 'Edit' : 'Create'} POE Assignment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <Label>Instructions</Label>
                <Textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  rows={4}
                  placeholder="Detailed instructions for students..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Due Date</Label>
                  <Input
                    type="datetime-local"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Max Score</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.max_score}
                    onChange={(e) => setFormData({ ...formData, max_score: parseInt(e.target.value) || 100 })}
                  />
                </div>
              </div>
              <div>
                <Label>Grading Scale</Label>
                <Select
                  value={formData.grading_scale_id}
                  onValueChange={(value) => setFormData({ ...formData, grading_scale_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select grading scale" />
                  </SelectTrigger>
                  <SelectContent>
                    {gradingScales?.map((scale) => (
                      <SelectItem key={scale.id} value={scale.id}>
                        {scale.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_published}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                />
                <Label>Publish to students</Label>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingAssignment ? 'Update' : 'Create'} Assignment
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {assignments?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mb-4" />
            <p>No POE assignments yet</p>
            <p className="text-sm">Create your first portfolio of evidence assignment</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {assignments?.map((assignment) => (
            <Card key={assignment.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">{assignment.title}</CardTitle>
                    {assignment.description && (
                      <p className="text-sm text-muted-foreground mt-1">{assignment.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={assignment.is_published ? 'default' : 'secondary'}>
                      {assignment.is_published ? 'Published' : 'Draft'}
                    </Badge>
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(assignment)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(assignment.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  {assignment.due_date && (
                    <span>Due: {format(new Date(assignment.due_date), 'PPp')}</span>
                  )}
                  <span>Max Score: {assignment.max_score}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
