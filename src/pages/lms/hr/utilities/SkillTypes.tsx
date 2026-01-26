import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2 } from "lucide-react";

export default function SkillTypes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', code: '', description: '', is_active: true });

  const { data: items, isLoading } = useQuery({
    queryKey: ['hr-skill-types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hr_skill_types').select('*').order('name');
      if (error) throw error;
      return data || [];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editingItem) {
        const { error } = await supabase.from('hr_skill_types').update(data).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('hr_skill_types').insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: `Skill type ${editingItem ? 'updated' : 'created'} successfully` });
      queryClient.invalidateQueries({ queryKey: ['hr-skill-types'] });
      handleClose();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hr_skill_types').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Skill type deleted" });
      queryClient.invalidateQueries({ queryKey: ['hr-skill-types'] });
    }
  });

  const handleClose = () => { setOpen(false); setEditingItem(null); setFormData({ name: '', code: '', description: '', is_active: true }); };
  const handleEdit = (item: any) => { setEditingItem(item); setFormData({ name: item.name, code: item.code || '', description: item.description || '', is_active: item.is_active }); setOpen(true); };
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!formData.name || !formData.code) { toast({ title: "Name and code required", variant: "destructive" }); return; } saveMutation.mutate(formData); };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Skill Types</h1><p className="text-muted-foreground">Manage skill type categories</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={() => handleClose()}><Plus className="mr-2 h-4 w-4" /> Add Skill Type</Button></DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader><DialogTitle>{editingItem ? 'Edit' : 'Add'} Skill Type</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2"><Label>Code *</Label><Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="e.g., ST001" /></div>
                <div className="space-y-2"><Label>Name *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Description</Label><Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
                <div className="flex items-center space-x-2"><Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} /><Label>Active</Label></div>
              </div>
              <DialogFooter><Button type="button" variant="outline" onClick={handleClose}>Cancel</Button><Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving...' : 'Save'}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card><CardContent className="pt-6">
        {isLoading ? <div className="text-center py-8 text-muted-foreground">Loading...</div> : items?.length === 0 ? <div className="text-center py-8 text-muted-foreground">No skill types found</div> : (
          <Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>{items?.map((item: any) => (<TableRow key={item.id}><TableCell>{item.code || '-'}</TableCell><TableCell className="font-medium">{item.name}</TableCell><TableCell>{item.description || '-'}</TableCell><TableCell><span className={`px-2 py-1 rounded-full text-xs ${item.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{item.is_active ? 'Active' : 'Inactive'}</span></TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => handleEdit(item)}><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(item.id)}><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>))}</TableBody>
          </Table>
        )}
      </CardContent></Card>
    </div>
  );
}