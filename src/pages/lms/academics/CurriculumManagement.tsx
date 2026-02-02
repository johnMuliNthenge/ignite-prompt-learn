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
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
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

interface Curriculum {
  id: string;
  programme_id: string;
  subject_id: string;
  start_date: string;
  end_date: string | null;
  semester: number | null;
  year_of_study: number;
  is_compulsory: boolean;
  credit_hours: number;
  is_active: boolean;
  programmes: Programme;
  subjects: Subject;
}

const CurriculumManagement = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCurriculum, setEditingCurriculum] = useState<Curriculum | null>(null);
  const [selectedProgramme, setSelectedProgramme] = useState<string>("all");
  const [formData, setFormData] = useState({
    programme_id: "",
    subject_ids: [] as string[],
    start_date: "",
    end_date: "",
    semester: "",
    year_of_study: 1,
    is_compulsory: true,
    credit_hours: 3,
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
        .select("*, programmes(id, name, code), subjects(id, name, code)")
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
        // Editing single entry
        const payload = {
          programme_id: data.programme_id,
          subject_id: data.subject_ids[0],
          start_date: data.start_date,
          end_date: data.end_date || null,
          semester: data.semester ? parseInt(data.semester) : null,
          year_of_study: data.year_of_study,
          is_compulsory: data.is_compulsory,
          credit_hours: data.credit_hours,
          is_active: data.is_active,
        };
        const { error } = await supabase.from("curriculum").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        // Creating multiple entries (one per subject)
        const entries = data.subject_ids.map((subject_id) => ({
          programme_id: data.programme_id,
          subject_id,
          start_date: data.start_date,
          end_date: data.end_date || null,
          semester: data.semester ? parseInt(data.semester) : null,
          year_of_study: data.year_of_study,
          is_compulsory: data.is_compulsory,
          credit_hours: data.credit_hours,
          is_active: data.is_active,
        }));
        const { error } = await supabase.from("curriculum").insert(entries);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["curriculum"] });
      toast.success(editingCurriculum ? "Curriculum updated successfully" : "Curriculum entries created successfully");
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
      toast.success("Curriculum entry deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      programme_id: "",
      subject_ids: [],
      start_date: "",
      end_date: "",
      semester: "",
      year_of_study: 1,
      is_compulsory: true,
      credit_hours: 3,
      is_active: true,
    });
    setEditingCurriculum(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (item: Curriculum) => {
    setEditingCurriculum(item);
    setFormData({
      programme_id: item.programme_id,
      subject_ids: [item.subject_id],
      start_date: item.start_date,
      end_date: item.end_date || "",
      semester: item.semester?.toString() || "",
      year_of_study: item.year_of_study,
      is_compulsory: item.is_compulsory,
      credit_hours: item.credit_hours,
      is_active: item.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubjectToggle = (subjectId: string, checked: boolean) => {
    if (checked) {
      setFormData({ ...formData, subject_ids: [...formData.subject_ids, subjectId] });
    } else {
      setFormData({ ...formData, subject_ids: formData.subject_ids.filter((id) => id !== subjectId) });
    }
  };

  const handleSelectAllSubjects = () => {
    if (subjects && formData.subject_ids.length === subjects.length) {
      setFormData({ ...formData, subject_ids: [] });
    } else {
      setFormData({ ...formData, subject_ids: subjects?.map((s) => s.id) || [] });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
              <p className="text-muted-foreground">Map subjects to programmes with date ranges</p>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Add Curriculum Entry</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingCurriculum ? "Edit Curriculum Entry" : "Add New Curriculum Entry"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                    {!editingCurriculum && (
                      <Button type="button" variant="ghost" size="sm" onClick={handleSelectAllSubjects}>
                        {subjects && formData.subject_ids.length === subjects.length ? "Deselect All" : "Select All"}
                      </Button>
                    )}
                  </div>
                  <ScrollArea className="h-[180px] border rounded-md p-3">
                    <div className="grid grid-cols-2 gap-2">
                      {subjects?.map((s) => (
                        <div key={s.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`subject-${s.id}`}
                            checked={formData.subject_ids.includes(s.id)}
                            onCheckedChange={(checked) => handleSubjectToggle(s.id, checked as boolean)}
                            disabled={editingCurriculum !== null && formData.subject_ids[0] !== s.id}
                          />
                          <label
                            htmlFor={`subject-${s.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {s.code} - {s.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  {!editingCurriculum && (
                    <p className="text-xs text-muted-foreground">Select multiple subjects to add them all to this curriculum</p>
                  )}
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
                <div className="grid grid-cols-3 gap-4">
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
                  <div className="space-y-2">
                    <Label htmlFor="credit_hours">Credit Hours</Label>
                    <Input
                      id="credit_hours"
                      type="number"
                      min={1}
                      max={20}
                      value={formData.credit_hours}
                      onChange={(e) => setFormData({ ...formData, credit_hours: parseInt(e.target.value) || 3 })}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_compulsory"
                      checked={formData.is_compulsory}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_compulsory: checked })}
                    />
                    <Label htmlFor="is_compulsory">Compulsory</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? "Saving..." : editingCurriculum ? "Save" : `Add ${formData.subject_ids.length} Subject(s)`}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Curriculum Entries</CardTitle>
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
              <p className="text-center py-4 text-muted-foreground">No curriculum entries found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Programme</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {curriculum?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.programmes?.code}</TableCell>
                      <TableCell>{item.subjects?.code} - {item.subjects?.name}</TableCell>
                      <TableCell>Year {item.year_of_study}</TableCell>
                      <TableCell>{item.semester ? `Sem ${item.semester}` : "-"}</TableCell>
                      <TableCell>{item.credit_hours}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(item.start_date), "MMM yyyy")}
                        {item.end_date ? ` - ${format(new Date(item.end_date), "MMM yyyy")}` : " - Ongoing"}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${item.is_compulsory ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}>
                          {item.is_compulsory ? "Compulsory" : "Elective"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${item.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                          {item.is_active ? "Active" : "Inactive"}
                        </span>
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
