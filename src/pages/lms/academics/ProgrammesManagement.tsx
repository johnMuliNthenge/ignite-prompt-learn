import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { ProtectedPage } from "@/components/auth/ProtectedPage";

interface Programme {
  id: string;
  name: string;
  code: string;
  description: string | null;
  duration_years: number;
  is_active: boolean;
  created_at: string;
}

const ProgrammesManagement = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProgramme, setEditingProgramme] = useState<Programme | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    duration_years: 1,
    is_active: true,
  });

  const { data: programmes, isLoading } = useQuery({
    queryKey: ["programmes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programmes")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Programme[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from("programmes")
          .update({ 
            name: data.name, 
            code: data.code, 
            description: data.description, 
            duration_years: data.duration_years,
            is_active: data.is_active 
          })
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("programmes").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programmes"] });
      toast.success(editingProgramme ? "Programme updated successfully" : "Programme created successfully");
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("programmes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programmes"] });
      toast.success("Programme deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({ name: "", code: "", description: "", duration_years: 1, is_active: true });
    setEditingProgramme(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (programme: Programme) => {
    setEditingProgramme(programme);
    setFormData({
      name: programme.name,
      code: programme.code,
      description: programme.description || "",
      duration_years: programme.duration_years,
      is_active: programme.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(editingProgramme ? { ...formData, id: editingProgramme.id } : formData);
  };

  return (
    <ProtectedPage moduleCode="academics.programmes">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Programmes</h1>
              <p className="text-muted-foreground">Manage academic programmes</p>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Add Programme</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingProgramme ? "Edit Programme" : "Add New Programme"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Programme Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Programme Code *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (Years)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min={1}
                    max={10}
                    value={formData.duration_years}
                    onChange={(e) => setFormData({ ...formData, duration_years: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Programmes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-4">Loading...</p>
            ) : programmes?.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">No programmes found. Add your first programme.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {programmes?.map((programme) => (
                    <TableRow key={programme.id}>
                      <TableCell className="font-mono">{programme.code}</TableCell>
                      <TableCell className="font-medium">{programme.name}</TableCell>
                      <TableCell>{programme.duration_years} year(s)</TableCell>
                      <TableCell className="text-muted-foreground">{programme.description || "-"}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${programme.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                          {programme.is_active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(programme)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(programme.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedPage>
  );
};

export default ProgrammesManagement;
