import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedPage } from "@/components/auth/ProtectedPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Settings2, GripVertical } from "lucide-react";
import { toast } from "sonner";

interface MarkComponent {
  id: string;
  subject_id: string;
  name: string;
  max_marks: number;
  weight: number;
  sort_order: number;
  is_active: boolean;
}

export default function MarksComputation() {
  const queryClient = useQueryClient();
  const [selectedSubject, setSelectedSubject] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<MarkComponent | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    max_marks: "100",
    weight: "1",
    sort_order: "0",
  });

  const { data: subjects } = useQuery({
    queryKey: ["subjects-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, name, code")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: components, isLoading } = useQuery({
    queryKey: ["mark-components", selectedSubject],
    queryFn: async () => {
      if (!selectedSubject) return [];
      const { data, error } = await (supabase as any)
        .from("subject_mark_components")
        .select("*")
        .eq("subject_id", selectedSubject)
        .order("sort_order");
      if (error) throw error;
      return data as MarkComponent[];
    },
    enabled: !!selectedSubject,
  });

  const totalWeight = components?.reduce((sum, c) => sum + Number(c.weight), 0) || 0;

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingComponent) {
        const { error } = await (supabase as any)
          .from("subject_mark_components")
          .update(data)
          .eq("id", editingComponent.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("subject_mark_components")
          .insert({ ...data, subject_id: selectedSubject });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mark-components", selectedSubject] });
      toast.success(editingComponent ? "Component updated" : "Component added");
      resetForm();
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("subject_mark_components")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mark-components", selectedSubject] });
      toast.success("Component deleted");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any)
        .from("subject_mark_components")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mark-components", selectedSubject] });
    },
    onError: (error: any) => toast.error(error.message),
  });

  const resetForm = () => {
    setFormData({ name: "", max_marks: "100", weight: "1", sort_order: "0" });
    setEditingComponent(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (component: MarkComponent) => {
    setEditingComponent(component);
    setFormData({
      name: component.name,
      max_marks: component.max_marks.toString(),
      weight: component.weight.toString(),
      sort_order: component.sort_order.toString(),
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      name: formData.name,
      max_marks: parseFloat(formData.max_marks),
      weight: parseFloat(formData.weight),
      sort_order: parseInt(formData.sort_order),
    });
  };

  const selectedSubjectData = subjects?.find((s) => s.id === selectedSubject);

  return (
    <ProtectedPage moduleCode="academics.marks_computation">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings2 className="h-6 w-6" />
            Marks Computation Setup
          </h1>
          <p className="text-muted-foreground">
            Define how marks are computed for each subject (e.g., Paper 1, Paper 2, CAT, etc.)
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Subject</CardTitle>
            <CardDescription>
              Choose a subject to configure its mark components and weights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-md">
              <Label>Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {selectedSubject && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>
                  Mark Components — {selectedSubjectData?.code} {selectedSubjectData?.name}
                </CardTitle>
                <CardDescription>
                  Each component contributes to the final computed mark based on its weight.
                  Total weight: <strong className="text-foreground">{totalWeight}</strong>
                </CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" /> Add Component
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingComponent ? "Edit Component" : "Add Mark Component"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Component Name *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Paper 1, Paper 2, CAT, Practical"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Max Marks *</Label>
                        <Input
                          type="number"
                          min="1"
                          value={formData.max_marks}
                          onChange={(e) => setFormData({ ...formData, max_marks: e.target.value })}
                          required
                        />
                        <p className="text-xs text-muted-foreground">Maximum marks for this paper</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Weight *</Label>
                        <Input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={formData.weight}
                          onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          Contribution ratio to final mark
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Sort Order</Label>
                      <Input
                        type="number"
                        value={formData.sort_order}
                        onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                      />
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
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>Loading...</p>
              ) : !components?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Settings2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No components configured</p>
                  <p className="text-sm mt-1">
                    Add components like Paper 1, Paper 2, CAT to define how marks are computed
                  </p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>Component Name</TableHead>
                        <TableHead>Max Marks</TableHead>
                        <TableHead>Weight</TableHead>
                        <TableHead>Contribution %</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {components.map((comp, idx) => (
                        <TableRow key={comp.id}>
                          <TableCell className="text-muted-foreground">
                            <GripVertical className="h-4 w-4" />
                          </TableCell>
                          <TableCell className="font-medium">{comp.name}</TableCell>
                          <TableCell>{comp.max_marks}</TableCell>
                          <TableCell>{comp.weight}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {totalWeight > 0
                                ? ((Number(comp.weight) / totalWeight) * 100).toFixed(1)
                                : 0}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={comp.is_active ? "default" : "secondary"}
                              className="cursor-pointer"
                              onClick={() =>
                                toggleActiveMutation.mutate({
                                  id: comp.id,
                                  is_active: !comp.is_active,
                                })
                              }
                            >
                              {comp.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(comp)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMutation.mutate(comp.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Preview formula */}
                  <div className="mt-4 p-4 rounded-lg border bg-muted/50">
                    <p className="text-sm font-medium mb-2">Final Mark Formula:</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      Final Mark = {components
                        .filter((c) => c.is_active)
                        .map(
                          (c) =>
                            `(${c.name} / ${c.max_marks} × ${c.weight})`
                        )
                        .join(" + ")}{" "}
                      / {totalWeight} × 100
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedPage>
  );
}
