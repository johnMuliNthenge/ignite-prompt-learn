import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedPage } from "@/components/auth/ProtectedPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ExamsManagement() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    class_id: "",
    academic_year_id: "",
    session_id: "",
    exam_date: "",
    total_marks: "100",
    passing_marks: "40",
    exam_type: "",
    description: "",
  });

  // Available subjects from registration for the selected class+session
  const [registeredSubjects, setRegisteredSubjects] = useState<{ id: string; name: string; code: string }[]>([]);

  const { data: exams, isLoading } = useQuery({
    queryKey: ["academic-exams"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("academic_exams")
        .select(`
          *,
          classes:class_id(name),
          academic_years:academic_year_id(name),
          sessions:session_id(name),
          subjects:subject_id(name, code)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("id, name").eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: academicYears } = useQuery({
    queryKey: ["academic-years"],
    queryFn: async () => {
      const { data, error } = await supabase.from("academic_years").select("id, name");
      if (error) throw error;
      return data;
    },
  });

  const { data: sessions } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sessions").select("id, name").eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  // Fetch registered subjects when class+session change
  useEffect(() => {
    const fetchRegisteredSubjects = async () => {
      if (!formData.class_id || !formData.session_id) {
        setRegisteredSubjects([]);
        return;
      }
      const { data } = await (supabase as any)
        .from("class_subject_registrations")
        .select("subject_id, subjects:subject_id(id, name, code)")
        .eq("class_id", formData.class_id)
        .eq("session_id", formData.session_id);

      const subjects = (data || [])
        .filter((d: any) => d.subjects)
        .map((d: any) => ({
          id: d.subjects.id,
          name: d.subjects.name,
          code: d.subjects.code,
        }));
      setRegisteredSubjects(subjects);
    };
    fetchRegisteredSubjects();
  }, [formData.class_id, formData.session_id]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingExam) {
        const { error } = await supabase
          .from("academic_exams")
          .update(data)
          .eq("id", editingExam.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("academic_exams").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-exams"] });
      toast.success(editingExam ? "Exam updated" : "Exam created successfully");
      resetForm();
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("academic_exams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-exams"] });
      toast.success("Exam deleted");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase
        .from("academic_exams")
        .update({ is_published })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-exams"] });
      toast.success("Exam status updated");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const resetForm = () => {
    setFormData({
      name: "",
      class_id: "",
      academic_year_id: "",
      session_id: "",
      exam_date: "",
      total_marks: "100",
      passing_marks: "40",
      exam_type: "",
      description: "",
    });
    setEditingExam(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (exam: any) => {
    setEditingExam(exam);
    setFormData({
      name: exam.name,
      class_id: exam.class_id || "",
      academic_year_id: exam.academic_year_id || "",
      session_id: exam.session_id || "",
      exam_date: exam.exam_date || "",
      total_marks: exam.total_marks?.toString() || "100",
      passing_marks: exam.passing_marks?.toString() || "40",
      exam_type: exam.exam_type || "",
      description: exam.description || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      name: formData.name,
      class_id: formData.class_id || null,
      academic_year_id: formData.academic_year_id || null,
      session_id: formData.session_id || null,
      exam_date: formData.exam_date || null,
      total_marks: parseFloat(formData.total_marks),
      passing_marks: parseFloat(formData.passing_marks),
      exam_type: formData.exam_type || null,
      description: formData.description || null,
    });
  };

  const examTypes = [
    { value: "midterm", label: "Midterm" },
    { value: "final", label: "Final" },
    { value: "quiz", label: "Quiz" },
    { value: "assignment", label: "Assignment" },
    { value: "practical", label: "Practical" },
  ];

  return (
    <ProtectedPage moduleCode="academics.exams">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Exams Management</h1>
            <p className="text-muted-foreground">Create and manage academic exams linked to registered subjects</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" /> Add Exam
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingExam ? "Edit Exam" : "Create Exam"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Exam Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Exam Type</Label>
                    <Select value={formData.exam_type} onValueChange={(v) => setFormData({ ...formData, exam_type: v })}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {examTypes.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Class *</Label>
                    <Select value={formData.class_id} onValueChange={(v) => setFormData({ ...formData, class_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                      <SelectContent>
                        {classes?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Session *</Label>
                    <Select value={formData.session_id} onValueChange={(v) => setFormData({ ...formData, session_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select session" /></SelectTrigger>
                      <SelectContent>
                        {sessions?.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {!editingExam && formData.class_id && formData.session_id && (
                    <div className="col-span-2 space-y-2">
                      <Label>Registered Subjects ({registeredSubjects.length})</Label>
                      {registeredSubjects.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {registeredSubjects.map((s) => (
                            <Badge key={s.id} variant="secondary">{s.code} - {s.name}</Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No subjects registered for this class and session</p>
                      )}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Academic Year</Label>
                    <Select value={formData.academic_year_id} onValueChange={(v) => setFormData({ ...formData, academic_year_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                      <SelectContent>
                        {academicYears?.map((y) => (
                          <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Exam Date</Label>
                    <Input
                      type="date"
                      value={formData.exam_date}
                      onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Total Marks</Label>
                    <Input
                      type="number"
                      value={formData.total_marks}
                      onChange={(e) => setFormData({ ...formData, total_marks: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Passing Marks</Label>
                    <Input
                      type="number"
                      value={formData.passing_marks}
                      onChange={(e) => setFormData({ ...formData, passing_marks: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Exams List</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>Loading...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Total/Pass</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams?.map((exam: any) => (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium">{exam.name}</TableCell>
                      <TableCell>
                        {exam.subjects ? `${exam.subjects.code} - ${exam.subjects.name}` : exam.subject || "-"}
                      </TableCell>
                      <TableCell>{exam.classes?.name || "-"}</TableCell>
                      <TableCell>{exam.sessions?.name || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{exam.exam_type || "-"}</Badge>
                      </TableCell>
                      <TableCell>{exam.exam_date ? format(new Date(exam.exam_date), "PP") : "-"}</TableCell>
                      <TableCell>{exam.total_marks}/{exam.passing_marks}</TableCell>
                      <TableCell>
                        <Badge variant={exam.is_published ? "default" : "secondary"}>
                          {exam.is_published ? "Published" : "Draft"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => togglePublishMutation.mutate({ id: exam.id, is_published: !exam.is_published })}
                          >
                            {exam.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(exam)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(exam.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!exams || exams.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
                        No exams found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedPage>
  );
}
