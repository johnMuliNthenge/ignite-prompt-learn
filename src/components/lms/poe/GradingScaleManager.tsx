import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, GraduationCap } from 'lucide-react';

interface GradingScale {
  id: string;
  name: string;
  description: string | null;
  scale_type: string;
  is_default: boolean;
  grading_scale_levels: GradingScaleLevel[];
}

interface GradingScaleLevel {
  id: string;
  label: string;
  min_value: number;
  max_value: number;
  points: number | null;
  description: string | null;
  color: string | null;
  sort_order: number;
}

export const GradingScaleManager = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingScale, setEditingScale] = useState<GradingScale | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    scale_type: 'percentage',
    levels: [{ label: '', min_value: 0, max_value: 100, points: '', description: '', color: '#22c55e' }],
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: scales, isLoading } = useQuery({
    queryKey: ['grading-scales-full'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grading_scales')
        .select(`
          *,
          grading_scale_levels(*)
        `)
        .order('name');
      if (error) throw error;
      return data as GradingScale[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: user } = await supabase.auth.getUser();
      
      // Create scale
      const { data: scale, error: scaleError } = await supabase
        .from('grading_scales')
        .insert({
          name: data.name,
          description: data.description || null,
          scale_type: data.scale_type,
          created_by: user.user?.id,
        })
        .select('id')
        .single();
      
      if (scaleError) throw scaleError;

      // Create levels
      const levels = data.levels.map((level, index) => ({
        scale_id: scale.id,
        label: level.label,
        min_value: level.min_value,
        max_value: level.max_value,
        points: level.points ? parseFloat(level.points) : null,
        description: level.description || null,
        color: level.color,
        sort_order: index,
      }));

      const { error: levelsError } = await supabase
        .from('grading_scale_levels')
        .insert(levels);
      
      if (levelsError) throw levelsError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grading-scales-full'] });
      toast({ title: 'Grading scale created' });
      resetForm();
    },
    onError: () => {
      toast({ title: 'Failed to create grading scale', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('grading_scales').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grading-scales-full'] });
      toast({ title: 'Grading scale deleted' });
    },
    onError: () => {
      toast({ title: 'Failed to delete grading scale', variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      scale_type: 'percentage',
      levels: [{ label: '', min_value: 0, max_value: 100, points: '', description: '', color: '#22c55e' }],
    });
    setEditingScale(null);
    setIsDialogOpen(false);
  };

  const addLevel = () => {
    setFormData({
      ...formData,
      levels: [...formData.levels, { label: '', min_value: 0, max_value: 100, points: '', description: '', color: '#22c55e' }],
    });
  };

  const removeLevel = (index: number) => {
    setFormData({
      ...formData,
      levels: formData.levels.filter((_, i) => i !== index),
    });
  };

  const updateLevel = (index: number, field: string, value: string | number) => {
    const newLevels = [...formData.levels];
    newLevels[index] = { ...newLevels[index], [field]: value };
    setFormData({ ...formData, levels: newLevels });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  if (isLoading) {
    return <div className="p-4">Loading grading scales...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Grading Scales</h3>
          <p className="text-sm text-muted-foreground">Configure grading systems for different curricula</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Scale
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Grading Scale</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., SAQA NQF Levels"
                    required
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select
                    value={formData.scale_type}
                    onValueChange={(value) => setFormData({ ...formData, scale_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="letter">Letter Grade</SelectItem>
                      <SelectItem value="points">Points</SelectItem>
                      <SelectItem value="competency">Competency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this grading scale"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Grade Levels</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addLevel}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Level
                  </Button>
                </div>
                
                {formData.levels.map((level, index) => (
                  <div key={index} className="grid grid-cols-6 gap-2 items-end p-3 bg-muted rounded-lg">
                    <div>
                      <Label className="text-xs">Label</Label>
                      <Input
                        value={level.label}
                        onChange={(e) => updateLevel(index, 'label', e.target.value)}
                        placeholder="A+"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Min %</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={level.min_value}
                        onChange={(e) => updateLevel(index, 'min_value', parseInt(e.target.value))}
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Max %</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={level.max_value}
                        onChange={(e) => updateLevel(index, 'max_value', parseInt(e.target.value))}
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Points</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={level.points}
                        onChange={(e) => updateLevel(index, 'points', e.target.value)}
                        placeholder="4.0"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Color</Label>
                      <Input
                        type="color"
                        value={level.color}
                        onChange={(e) => updateLevel(index, 'color', e.target.value)}
                        className="h-9 p-1"
                      />
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeLevel(index)}
                      disabled={formData.levels.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={createMutation.isPending}>
                  Create Scale
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {scales?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <GraduationCap className="h-12 w-12 mb-4" />
            <p>No custom grading scales yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {scales?.map((scale) => (
            <Card key={scale.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">{scale.name}</CardTitle>
                    {scale.description && (
                      <CardDescription>{scale.description}</CardDescription>
                    )}
                  </div>
                  {!scale.is_default && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(scale.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {scale.grading_scale_levels
                    ?.sort((a, b) => a.sort_order - b.sort_order)
                    .map((level) => (
                      <div
                        key={level.id}
                        className="px-2 py-1 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: level.color || '#6b7280' }}
                      >
                        {level.label} ({level.min_value}-{level.max_value}%)
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
