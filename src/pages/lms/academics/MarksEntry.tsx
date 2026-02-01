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
  const [selectedExam, setSelectedExam] = useState("");
  const [marksData, setMarksData] = useState<Record<string, { marks: string; absent: boolean; remarks: string }>>({});

  const { data: exams } = useQuery({
    queryKey: ["academic-exams-for-marks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academic_exams")
        .select("id, name, class_id, total_marks, passing_marks, classes:class_id(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const selectedExamData = exams?.find((e) => e.id === selectedExam);

  const { data: students, isLoading: loadingStudents } = useQuery({
    queryKey: ["students-for-marks", selectedExamData?.class_id],
    queryFn: async () => {
      if (!selectedExamData?.class_id) return [] as Student[];
      const { data, error } = await supabase
        .from("students")
        .select("id, student_no, surname, other_name")
        .eq("class_id", selectedExamData.class_id)
        .order("surname");
      if (error) throw error;
      return data as Student[];
    },
    enabled: !!selectedExamData?.class_id,
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

  // Initialize marks data when students or existing marks change
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

  const updateMarkField = (studentId: string, field: string, value: any) => {
    setMarksData((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      },
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
          <p className="text-muted-foreground">Enter and manage student marks for exams</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Exam</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Exam</Label>
                <Select value={selectedExam} onValueChange={setSelectedExam}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an exam" />
                  </SelectTrigger>
                  <SelectContent>
                    {exams?.map((exam) => (
                      <SelectItem key={exam.id} value={exam.id}>
                        {exam.name} ({exam.classes?.name || "No class"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedExamData && (
                <>
                  <div className="space-y-2">
                    <Label>Total Marks</Label>
                    <Input value={selectedExamData.total_marks} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Passing Marks</Label>
                    <Input value={selectedExamData.passing_marks} disabled />
                  </div>
                </>
              )}
            </div>
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
