import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedPage } from "@/components/auth/ProtectedPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Student {
  id: string;
  student_no: string;
  surname: string;
  other_name: string;
}

export default function MarksEntry() {
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [marksData, setMarksData] = useState<Record<string, { marks: string; absent: boolean; remarks: string }>>({});

  const { data: classes } = useQuery({
    queryKey: ["classes-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("id, name").eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: sessions } = useQuery({
    queryKey: ["sessions-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sessions").select("id, name").eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  // Fetch exams for the selected class+session (each exam = one subject)
  const { data: exams } = useQuery({
    queryKey: ["exams-for-class-session", selectedClass, selectedSession],
    queryFn: async () => {
      if (!selectedClass || !selectedSession) return [];
      const { data, error } = await (supabase as any)
        .from("academic_exams")
        .select("id, name, subject_id, total_marks, passing_marks, exam_type, subjects:subject_id(name, code)")
        .eq("class_id", selectedClass)
        .eq("session_id", selectedSession)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedClass && !!selectedSession,
  });

  const selectedExamData = exams?.find((e: any) => e.id === selectedExam);

  const { data: students, isLoading: loadingStudents } = useQuery({
    queryKey: ["students-for-marks", selectedClass],
    queryFn: async () => {
      if (!selectedClass) return [] as Student[];
      const { data, error } = await supabase
        .from("students")
        .select("id, student_no, surname, other_name")
        .eq("class_id", selectedClass)
        .eq("status", "Active")
        .order("surname");
      if (error) throw error;
      return data as Student[];
    },
    enabled: !!selectedClass,
  });

  const { data: existingMarks } = useQuery({
    queryKey: ["existing-marks", selectedExam],
    queryFn: async () => {
      if (!selectedExam) return [];
      const { data, error } = await supabase
        .from("academic_marks")
        .select("*")
        .eq("exam_id", selectedExam);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedExam,
  });

  useEffect(() => {
    if (students && existingMarks) {
      const newMarksData: Record<string, { marks: string; absent: boolean; remarks: string }> = {};
      students.forEach((student) => {
        const existing = existingMarks.find((m) => m.student_id === student.id);
        newMarksData[student.id] = {
          marks: existing?.marks_obtained?.toString() || "",
          absent: existing?.is_absent || false,
          remarks: existing?.remarks || "",
        };
      });
      setMarksData(newMarksData);
    }
  }, [students, existingMarks]);

  // Reset exam when class/session changes
  useEffect(() => {
    setSelectedExam("");
  }, [selectedClass, selectedSession]);

  const updateMarkField = (studentId: string, field: string, value: any) => {
    setMarksData((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }));
  };

  const calculateGrade = (marks: number, total: number, passing: number): string => {
    if (marks < passing) return "F";
    const percentage = (marks / total) * 100;
    if (percentage >= 90) return "A";
    if (percentage >= 80) return "B";
    if (percentage >= 70) return "C";
    if (percentage >= 60) return "D";
    return "E";
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedExam || !students) return;
      const marksToSave = students.map((student) => {
        const data = marksData[student.id] || { marks: "", absent: false, remarks: "" };
        const marksObtained = data.absent ? 0 : (parseFloat(data.marks) || 0);
        return {
          exam_id: selectedExam,
          student_id: student.id,
          marks_obtained: marksObtained,
          is_absent: data.absent,
          remarks: data.remarks || null,
          grade: calculateGrade(marksObtained, selectedExamData?.total_marks || 100, selectedExamData?.passing_marks || 40),
        };
      });
      const { error } = await supabase
        .from("academic_marks")
        .upsert(marksToSave, { onConflict: "exam_id,student_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["existing-marks", selectedExam] });
      toast.success("Marks saved successfully");
    },
    onError: (error: any) => toast.error(error.message),
  });

  return (
    <ProtectedPage moduleCode="academics.marks">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Marks Entry</h1>
          <p className="text-muted-foreground">Select class, session, and subject exam to enter marks</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Exam</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {classes?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Session</Label>
                <Select value={selectedSession} onValueChange={setSelectedSession}>
                  <SelectTrigger><SelectValue placeholder="Select session" /></SelectTrigger>
                  <SelectContent>
                    {sessions?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subject Exam</Label>
                <Select value={selectedExam} onValueChange={setSelectedExam} disabled={!selectedClass || !selectedSession}>
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !selectedClass || !selectedSession
                        ? "Select class & session first"
                        : "Select exam"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {exams?.map((exam: any) => (
                      <SelectItem key={exam.id} value={exam.id}>
                        {exam.subjects ? `${exam.subjects.code} - ${exam.subjects.name}` : exam.name}
                        {exam.exam_type ? ` (${exam.exam_type})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {selectedExamData && (
              <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
                <span>Total Marks: <strong className="text-foreground">{selectedExamData.total_marks}</strong></span>
                <span>Passing Marks: <strong className="text-foreground">{selectedExamData.passing_marks}</strong></span>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedExam && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Student Marks</CardTitle>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save All Marks
              </Button>
            </CardHeader>
            <CardContent>
              {loadingStudents ? (
                <p>Loading students...</p>
              ) : !students?.length ? (
                <p className="text-muted-foreground">No students found for this class</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student No</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead className="w-24">Marks</TableHead>
                      <TableHead className="w-20">Absent</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>{student.student_no}</TableCell>
                        <TableCell>{student.surname} {student.other_name}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            max={selectedExamData?.total_marks}
                            min={0}
                            value={marksData[student.id]?.marks || ""}
                            onChange={(e) => updateMarkField(student.id, "marks", e.target.value)}
                            disabled={marksData[student.id]?.absent}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            checked={marksData[student.id]?.absent || false}
                            onCheckedChange={(checked) => updateMarkField(student.id, "absent", checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={marksData[student.id]?.remarks || ""}
                            onChange={(e) => updateMarkField(student.id, "remarks", e.target.value)}
                            placeholder="Optional remarks"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedPage>
  );
}
