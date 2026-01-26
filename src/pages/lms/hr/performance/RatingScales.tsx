import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2 } from "lucide-react";

export default function RatingScales() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    min_value: '1',
    max_value: '5',
    is_default: false,
    is_active: true,
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ['hr-rating-scales'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hr_rating_scales').select('*').order('name');
      if (error) throw error;
      return data || [];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        min_value: parseInt(data.min_value),
        max_value: parseInt(data.max_value),
      };
      if (editingItem) {
        const { error } = await supabase.from('hr_rating_scales').update(payload).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('hr_rating_scales').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: `Rating scale ${editingItem ? 'updated' : 'created'} successfully` });
      queryClient.invalidateQueries({ queryKey: ['hr-rating-scales'] });
      handleClose();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hr_rating_scales').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Rating scale deleted" });
      queryClient.invalidateQueries({ queryKey: ['hr-rating-scales'] });
    }
  });

  const handleClose = () => {
    setOpen(false);
    setEditingItem(null);
    setFormData({ name: '', description: '', min_value: '1', max_value: '5', is_default: false, is_active: true });
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      min_value: item.min_value?.toString() || '1',
      max_value: item.max_value?.toString() || '5',
      is_default: item.is_default,
      is_active: item.is_active,
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Rating Scales</h1>
          <p className="text-muted-foreground">Define performance rating scales</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleClose()}>
              <Plus className="mr-2 h-4 w-4" /> Add Scale
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit' : 'Add'} Rating Scale</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Standard 5-Point Scale" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min_value">Min Value</Label>
                    <Input id="min_value" type="number" value={formData.min_value} onChange={(e) => setFormData({ ...formData, min_value: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_value">Max Value</Label>
                    <Input id="max_value" type="number" value={formData.max_value} onChange={(e) => setFormData({ ...formData, max_value: e.target.value })} />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="is_default" checked={formData.is_default} onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })} />
                  <Label htmlFor="is_default">Default Scale</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="is_active" checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
                  <Label htmlFor="is_active">Active</Label>
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
            <div className="text-center py-8 text-muted-foreground">No rating scales found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Range</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items?.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.min_value} - {item.max_value}</TableCell>
                    <TableCell>{item.is_default ? 'Yes' : 'No'}</TableCell>
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
