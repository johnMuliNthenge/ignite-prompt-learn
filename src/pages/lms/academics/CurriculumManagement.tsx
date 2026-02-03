import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, FileText, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { ProtectedPage } from "@/components/auth/ProtectedPage";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Programme {
  id: string;
  name: string;
  code: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface CurriculumSubject {
  id: string;
  curriculum_id: string;
  subject_id: string;
  is_compulsory: boolean;
  credit_hours: number;
  subjects: Subject;
}

interface Curriculum {
  id: string;
  name: string;
  programme_id: string;
  start_date: string;
  end_date: string | null;
  semester: number | null;
  year_of_study: number;
  is_active: boolean;
  programmes: Programme;
  curriculum_subjects: CurriculumSubject[];
}

const CurriculumManagement = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCurriculum, setEditingCurriculum] = useState<Curriculum | null>(null);
  const [selectedProgramme, setSelectedProgramme] = useState<string>("all");
  const [formData, setFormData] = useState({
    name: "",
    programme_id: "",
    subject_ids: [] as string[],
    subject_settings: {} as Record<string, { is_compulsory: boolean; credit_hours: number }>,
    start_date: "",
    end_date: "",
    semester: "",
    year_of_study: 1,
    is_active: true,
  });

  const { data: programmes } = useQuery({
    queryKey: ["programmes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("programmes").select("id, name, code").eq("is_active", true).order("name");
      if (error) throw error;
      return data as Programme[];
    },
  });

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("id, name, code").eq("is_active", true).order("name");
      if (error) throw error;
      return data as Subject[];
    },
  });

  const { data: curriculum, isLoading } = useQuery({
    queryKey: ["curriculum", selectedProgramme],
    queryFn: async () => {
      let query = supabase
        .from("curriculum")
        .select(`
          *,
          programmes(id, name, code),
          curriculum_subjects(id, curriculum_id, subject_id, is_compulsory, credit_hours, subjects(id, name, code))
        `)
        .order("year_of_study")
        .order("semester");
      
      if (selectedProgramme !== "all") {
        query = query.eq("programme_id", selectedProgramme);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Curriculum[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      if (data.id) {
        // Update curriculum
        const { error: updateError } = await supabase
          .from("curriculum")
          .update({
            name: data.name,
            programme_id: data.programme_id,
            start_date: data.start_date,
            end_date: data.end_date || null,
            semester: data.semester ? parseInt(data.semester) : null,
            year_of_study: data.year_of_study,
            is_active: data.is_active,
          })
          .eq("id", data.id);
        if (updateError) throw updateError;

        // Delete existing subjects and re-insert
        const { error: deleteError } = await supabase
          .from("curriculum_subjects")
          .delete()
          .eq("curriculum_id", data.id);
        if (deleteError) throw deleteError;

        // Insert updated subjects
        const subjectEntries = data.subject_ids.map((subject_id) => ({
          curriculum_id: data.id!,
          subject_id,
          is_compulsory: data.subject_settings[subject_id]?.is_compulsory ?? true,
          credit_hours: data.subject_settings[subject_id]?.credit_hours ?? 3,
        }));
        
        if (subjectEntries.length > 0) {
          const { error: insertError } = await supabase.from("curriculum_subjects").insert(subjectEntries);
          if (insertError) throw insertError;
        }
      } else {
        // Create new curriculum
        const { data: newCurriculum, error: insertError } = await supabase
          .from("curriculum")
          .insert({
            name: data.name,
            programme_id: data.programme_id,
            start_date: data.start_date,
            end_date: data.end_date || null,
            semester: data.semester ? parseInt(data.semester) : null,
            year_of_study: data.year_of_study,
            is_active: data.is_active,
          })
          .select()
          .single();
        if (insertError) throw insertError;

        // Insert subjects
        const subjectEntries = data.subject_ids.map((subject_id) => ({
          curriculum_id: newCurriculum.id,
          subject_id,
          is_compulsory: data.subject_settings[subject_id]?.is_compulsory ?? true,
          credit_hours: data.subject_settings[subject_id]?.credit_hours ?? 3,
        }));

        if (subjectEntries.length > 0) {
          const { error: subjectError } = await supabase.from("curriculum_subjects").insert(subjectEntries);
          if (subjectError) throw subjectError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["curriculum"] });
      toast.success(editingCurriculum ? "Curriculum updated successfully" : "Curriculum created successfully");
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("curriculum").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["curriculum"] });
      toast.success("Curriculum deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      programme_id: "",
      subject_ids: [],
      subject_settings: {},
      start_date: "",
      end_date: "",
      semester: "",
      year_of_study: 1,
      is_active: true,
    });
    setEditingCurriculum(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (item: Curriculum) => {
    const existingSubjectSettings: Record<string, { is_compulsory: boolean; credit_hours: number }> = {};
    item.curriculum_subjects?.forEach((cs) => {
      existingSubjectSettings[cs.subject_id] = {
        is_compulsory: cs.is_compulsory,
        credit_hours: cs.credit_hours,
      };
    });

    setEditingCurriculum(item);
    setFormData({
      name: item.name || "",
      programme_id: item.programme_id,
      subject_ids: item.curriculum_subjects?.map((cs) => cs.subject_id) || [],
      subject_settings: existingSubjectSettings,
      start_date: item.start_date,
      end_date: item.end_date || "",
      semester: item.semester?.toString() || "",
      year_of_study: item.year_of_study,
      is_active: item.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubjectToggle = (subjectId: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        subject_ids: [...formData.subject_ids, subjectId],
        subject_settings: {
          ...formData.subject_settings,
          [subjectId]: { is_compulsory: true, credit_hours: 3 },
        },
      });
    } else {
      const newSettings = { ...formData.subject_settings };
      delete newSettings[subjectId];
      setFormData({
        ...formData,
        subject_ids: formData.subject_ids.filter((id) => id !== subjectId),
        subject_settings: newSettings,
      });
    }
  };

  const handleSelectAllSubjects = () => {
    if (subjects && formData.subject_ids.length === subjects.length) {
      setFormData({ ...formData, subject_ids: [], subject_settings: {} });
    } else {
      const allSettings: Record<string, { is_compulsory: boolean; credit_hours: number }> = {};
      subjects?.forEach((s) => {
        allSettings[s.id] = formData.subject_settings[s.id] || { is_compulsory: true, credit_hours: 3 };
      });
      setFormData({
        ...formData,
        subject_ids: subjects?.map((s) => s.id) || [],
        subject_settings: allSettings,
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Please enter a curriculum name");
      return;
    }
    if (formData.subject_ids.length === 0) {
      toast.error("Please select at least one subject");
      return;
    }
    saveMutation.mutate(editingCurriculum ? { ...formData, id: editingCurriculum.id } : formData);
  };

  return (
    <ProtectedPage moduleCode="academics.curriculum">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Curriculum</h1>
              <p className="text-muted-foreground">Define programme curricula with multiple subjects</p>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Add Curriculum</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCurriculum ? "Edit Curriculum" : "Add New Curriculum"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Curriculum Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., DICT 2024 Curriculum"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Programme *</Label>
                  <Select value={formData.programme_id} onValueChange={(v) => setFormData({ ...formData, programme_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select programme" />
                    </SelectTrigger>
                    <SelectContent>
                      {programmes?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Subjects * ({formData.subject_ids.length} selected)</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={handleSelectAllSubjects}>
                      {subjects && formData.subject_ids.length === subjects.length ? "Deselect All" : "Select All"}
                    </Button>
                  </div>
                  <ScrollArea className="h-[200px] border rounded-md p-3">
                    <div className="space-y-2">
                      {subjects?.map((s) => (
                        <div key={s.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`subject-${s.id}`}
                              checked={formData.subject_ids.includes(s.id)}
                              onCheckedChange={(checked) => handleSubjectToggle(s.id, checked as boolean)}
                            />
                            <label
                              htmlFor={`subject-${s.id}`}
                              className="text-sm font-medium leading-none cursor-pointer"
                            >
                              {s.code} - {s.name}
                            </label>
                          </div>
                          {formData.subject_ids.includes(s.id) && (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min={1}
                                max={20}
                                className="w-16 h-7 text-xs"
                                placeholder="Credits"
                                value={formData.subject_settings[s.id]?.credit_hours || 3}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    subject_settings: {
                                      ...formData.subject_settings,
                                      [s.id]: {
                                        ...formData.subject_settings[s.id],
                                        credit_hours: parseInt(e.target.value) || 3,
                                      },
                                    },
                                  })
                                }
                              />
                              <Badge
                                variant={formData.subject_settings[s.id]?.is_compulsory ? "default" : "secondary"}
                                className="cursor-pointer text-xs"
                                onClick={() =>
                                  setFormData({
                                    ...formData,
                                    subject_settings: {
                                      ...formData.subject_settings,
                                      [s.id]: {
                                        ...formData.subject_settings[s.id],
                                        is_compulsory: !formData.subject_settings[s.id]?.is_compulsory,
                                      },
                                    },
                                  })
                                }
                              >
                                {formData.subject_settings[s.id]?.is_compulsory ? "Core" : "Elective"}
                              </Badge>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <p className="text-xs text-muted-foreground">Click on "Core/Elective" badge to toggle. Set credit hours for each subject.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="year_of_study">Year of Study</Label>
                    <Input
                      id="year_of_study"
                      type="number"
                      min={1}
                      max={10}
                      value={formData.year_of_study}
                      onChange={(e) => setFormData({ ...formData, year_of_study: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="semester">Semester</Label>
                    <Input
                      id="semester"
                      type="number"
                      min={1}
                      max={4}
                      value={formData.semester}
                      onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
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
                    {saveMutation.isPending ? "Saving..." : editingCurriculum ? "Update Curriculum" : "Create Curriculum"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>All Curricula</CardTitle>
            <Select value={selectedProgramme} onValueChange={setSelectedProgramme}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Filter by programme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programmes</SelectItem>
                {programmes?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-4">Loading...</p>
            ) : curriculum?.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">No curricula found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Programme</TableHead>
                    <TableHead>Subjects</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {curriculum?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name || "Unnamed"}</TableCell>
                      <TableCell>{item.programmes?.code}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <span>{item.curriculum_subjects?.length || 0} subjects</span>
                        </div>
                      </TableCell>
                      <TableCell>Year {item.year_of_study}{item.semester ? `, Sem ${item.semester}` : ""}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(item.start_date), "MMM yyyy")}
                        {item.end_date ? ` - ${format(new Date(item.end_date), "MMM yyyy")}` : " - Ongoing"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.is_active ? "default" : "secondary"}>
                          {item.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(item.id)}>
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

export default CurriculumManagement;
