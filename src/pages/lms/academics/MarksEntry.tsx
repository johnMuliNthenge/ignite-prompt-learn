import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedPage } from "@/components/auth/ProtectedPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Student {
  id: string;
  student_no: string;
  surname: string;
  other_name: string;
}

interface MarkComponent {
  id: string;
  name: string;
  max_marks: number;
  weight: number;
  sort_order: number;
  is_active: boolean;
}

// Per-student, per-component marks
type ComponentMarksMap = Record<string, Record<string, { marks: string; absent: boolean }>>;

export default function MarksEntry() {
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [componentMarks, setComponentMarks] = useState<ComponentMarksMap>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});

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

  const { data: exams } = useQuery({
    queryKey: ["exams-for-class-session", selectedClass, selectedSession],
    queryFn: async () => {
      if (!selectedClass || !selectedSession) return [];
      const { data, error } = await (supabase as any)
        .from("academic_exams")
        .select("id, name, total_marks, passing_marks, exam_type")
        .eq("class_id", selectedClass)
        .eq("session_id", selectedSession)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedClass && !!selectedSession,
  });

  // Fetch registered subjects for the selected class + session
  const { data: registeredSubjects } = useQuery({
    queryKey: ["registered-subjects-marks", selectedClass, selectedSession],
    queryFn: async () => {
      if (!selectedClass || !selectedSession) return [];
      const { data, error } = await (supabase as any)
        .from("class_subject_registrations")
        .select("subject_id, subjects:subject_id(id, name, code)")
        .eq("class_id", selectedClass)
        .eq("session_id", selectedSession);
      if (error) throw error;
      return (data || [])
        .filter((d: any) => d.subjects)
        .map((d: any) => ({ id: d.subjects.id, name: d.subjects.name, code: d.subjects.code }));
    },
    enabled: !!selectedClass && !!selectedSession,
  });

  const selectedExamData = exams?.find((e: any) => e.id === selectedExam);
  const subjectId = selectedSubject || null;

  // Fetch mark components for the exam's subject
  const { data: markComponents } = useQuery({
    queryKey: ["mark-components-for-subject", subjectId],
    queryFn: async () => {
      if (!subjectId) return [];
      const { data, error } = await (supabase as any)
        .from("subject_mark_components")
        .select("*")
        .eq("subject_id", subjectId)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as MarkComponent[];
    },
    enabled: !!subjectId,
  });

  const hasComponents = markComponents && markComponents.length > 0;
  const totalWeight = markComponents?.reduce((sum, c) => sum + Number(c.weight), 0) || 0;

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

  // Fetch existing component marks
  const { data: existingComponentMarks } = useQuery({
    queryKey: ["existing-component-marks", selectedExam],
    queryFn: async () => {
      if (!selectedExam) return [];
      const { data, error } = await (supabase as any)
        .from("academic_component_marks")
        .select("*")
        .eq("exam_id", selectedExam);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedExam && !!hasComponents,
  });

  // Fetch existing aggregate marks (for remarks and non-component mode)
  const { data: existingMarks } = useQuery({
    queryKey: ["existing-marks", selectedExam, selectedSubject],
    queryFn: async () => {
      if (!selectedExam || !selectedSubject) return [];
      const { data, error } = await supabase
        .from("academic_marks")
        .select("*")
        .eq("exam_id", selectedExam)
        .eq("subject_id", selectedSubject);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedExam && !!selectedSubject,
  });

  // Populate form state from existing data
  useEffect(() => {
    if (!students) return;

    const newRemarks: Record<string, string> = {};
    students.forEach((s) => {
      const existing = existingMarks?.find((m) => m.student_id === s.id);
      newRemarks[s.id] = existing?.remarks || "";
    });
    setRemarks(newRemarks);

    if (hasComponents && markComponents) {
      const newCM: ComponentMarksMap = {};
      students.forEach((s) => {
        newCM[s.id] = {};
        markComponents.forEach((comp) => {
          const existing = existingComponentMarks?.find(
            (m: any) => m.student_id === s.id && m.component_id === comp.id
          );
          newCM[s.id][comp.id] = {
            marks: existing?.marks_obtained?.toString() || "",
            absent: existing?.is_absent || false,
          };
        });
      });
      setComponentMarks(newCM);
    } else if (!hasComponents) {
      // Legacy simple mode
      const newCM: ComponentMarksMap = {};
      students.forEach((s) => {
        const existing = existingMarks?.find((m) => m.student_id === s.id);
        newCM[s.id] = {
          __simple: {
            marks: existing?.marks_obtained?.toString() || "",
            absent: existing?.is_absent || false,
          },
        };
      });
      setComponentMarks(newCM);
    }
  }, [students, existingMarks, existingComponentMarks, hasComponents, markComponents]);

  useEffect(() => {
    setSelectedExam("");
    setSelectedSubject("");
  }, [selectedClass, selectedSession]);

  useEffect(() => {
    setSelectedSubject("");
  }, [selectedExam]);

  const updateComponentMark = (studentId: string, componentId: string, field: "marks" | "absent", value: any) => {
    setComponentMarks((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [componentId]: {
          ...prev[studentId]?.[componentId],
          [field]: value,
        },
      },
    }));
  };

  // Compute final mark for a student from components
  const computeFinalMark = (studentId: string): number => {
    if (!hasComponents || !markComponents) return 0;
    const studentData = componentMarks[studentId];
    if (!studentData) return 0;

    let weightedSum = 0;
    markComponents.forEach((comp) => {
      const entry = studentData[comp.id];
      if (entry?.absent) return;
      const marks = parseFloat(entry?.marks || "0");
      const normalized = comp.max_marks > 0 ? marks / comp.max_marks : 0;
      weightedSum += normalized * (Number(comp.weight) / 100);
    });

    return Math.round(weightedSum * 100 * 100) / 100;
  };

  const isStudentAbsent = (studentId: string): boolean => {
    if (!hasComponents || !markComponents) {
      return componentMarks[studentId]?.__simple?.absent || false;
    }
    const studentData = componentMarks[studentId];
    if (!studentData) return false;
    return markComponents.every((comp) => studentData[comp.id]?.absent);
  };

  const calculateGrade = (percentage: number): string => {
    if (percentage >= 90) return "A";
    if (percentage >= 80) return "B";
    if (percentage >= 70) return "C";
    if (percentage >= 60) return "D";
    if (percentage >= 50) return "E";
    return "F";
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedExam || !students) return;

      if (hasComponents && markComponents) {
        // Save component marks
        const componentRows = students.flatMap((student) =>
          markComponents.map((comp) => {
            const entry = componentMarks[student.id]?.[comp.id] || { marks: "0", absent: false };
            return {
              exam_id: selectedExam,
              student_id: student.id,
              component_id: comp.id,
              marks_obtained: entry.absent ? 0 : parseFloat(entry.marks) || 0,
              is_absent: entry.absent,
            };
          })
        );

        const { error: compError } = await (supabase as any)
          .from("academic_component_marks")
          .upsert(componentRows, { onConflict: "exam_id,student_id,component_id" });
        if (compError) throw compError;

        // Also save computed aggregate marks
        const aggregateRows = students.map((student) => {
          const finalMark = computeFinalMark(student.id);
          const absent = isStudentAbsent(student.id);
          return {
            exam_id: selectedExam,
            student_id: student.id,
            subject_id: selectedSubject || null,
            marks_obtained: absent ? 0 : finalMark,
            is_absent: absent,
            grade: absent ? "F" : calculateGrade(finalMark),
            remarks: remarks[student.id] || null,
          };
        });

        const { error: aggError } = await supabase
          .from("academic_marks")
          .upsert(aggregateRows, { onConflict: "exam_id,student_id,subject_id" });
        if (aggError) throw aggError;
      } else {
        // Simple mode (no components)
        const marksToSave = students.map((student) => {
          const entry = componentMarks[student.id]?.__simple || { marks: "0", absent: false };
          const marksObtained = entry.absent ? 0 : parseFloat(entry.marks) || 0;
          const total = selectedExamData?.total_marks || 100;
          const percentage = (marksObtained / total) * 100;
          return {
            exam_id: selectedExam,
            student_id: student.id,
            subject_id: selectedSubject || null,
            marks_obtained: marksObtained,
            is_absent: entry.absent,
            grade: calculateGrade(percentage),
            remarks: remarks[student.id] || null,
          };
        });

        const { error } = await supabase
          .from("academic_marks")
          .upsert(marksToSave, { onConflict: "exam_id,student_id,subject_id" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["existing-marks", selectedExam] });
      queryClient.invalidateQueries({ queryKey: ["existing-component-marks", selectedExam] });
      toast.success("Marks saved successfully");
    },
    onError: (error: any) => toast.error(error.message),
  });

  return (
    <ProtectedPage moduleCode="academics.marks">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Marks Entry</h1>
          <p className="text-muted-foreground">Select class, session, exam, and subject to enter marks</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Exam</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <Label>Exam</Label>
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
                        {exam.name}
                        {exam.exam_type ? ` (${exam.exam_type})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject} disabled={!selectedExam}>
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !selectedExam
                        ? "Select exam first"
                        : "Select subject"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {registeredSubjects?.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.code} - {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {selectedExamData && (
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>Total Marks: <strong className="text-foreground">{selectedExamData.total_marks}</strong></span>
                <span>Passing Marks: <strong className="text-foreground">{selectedExamData.passing_marks}</strong></span>
                {hasComponents && (
                  <Badge variant="outline" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Component-based ({markComponents?.length} papers)
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedExam && selectedSubject && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Student Marks</CardTitle>
                {hasComponents && (
                  <CardDescription>
                    Enter marks per component. Final mark is auto-computed from weights.
                  </CardDescription>
                )}
              </div>
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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background z-10">Student No</TableHead>
                        <TableHead className="sticky left-20 bg-background z-10">Student Name</TableHead>
                        {hasComponents ? (
                          <>
                            {markComponents?.map((comp) => (
                              <TableHead key={comp.id} className="text-center min-w-[100px]">
                                <div>{comp.name}</div>
                                <div className="text-xs font-normal text-muted-foreground">
                                  /{comp.max_marks} ({comp.weight}%)
                                </div>
                              </TableHead>
                            ))}
                            <TableHead className="text-center min-w-[80px]">Final %</TableHead>
                            <TableHead className="text-center">Grade</TableHead>
                          </>
                        ) : (
                          <>
                            <TableHead className="w-24">Marks</TableHead>
                            <TableHead className="w-20">Absent</TableHead>
                          </>
                        )}
                        <TableHead>Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => {
                        const finalMark = hasComponents ? computeFinalMark(student.id) : 0;
                        const absent = isStudentAbsent(student.id);
                        const grade = hasComponents
                          ? (absent ? "F" : calculateGrade(finalMark))
                          : "";

                        return (
                          <TableRow key={student.id}>
                            <TableCell className="sticky left-0 bg-background z-10">{student.student_no}</TableCell>
                            <TableCell className="sticky left-20 bg-background z-10">
                              {student.surname} {student.other_name}
                            </TableCell>
                            {hasComponents ? (
                              <>
                                {markComponents?.map((comp) => (
                                  <TableCell key={comp.id} className="text-center">
                                    <div className="flex items-center gap-1 justify-center">
                                      <Input
                                        type="number"
                                        max={comp.max_marks}
                                        min={0}
                                        value={componentMarks[student.id]?.[comp.id]?.marks || ""}
                                        onChange={(e) =>
                                          updateComponentMark(student.id, comp.id, "marks", e.target.value)
                                        }
                                        disabled={componentMarks[student.id]?.[comp.id]?.absent}
                                        className="w-16 text-center"
                                      />
                                      <Checkbox
                                        checked={componentMarks[student.id]?.[comp.id]?.absent || false}
                                        onCheckedChange={(checked) =>
                                          updateComponentMark(student.id, comp.id, "absent", checked)
                                        }
                                        title="Absent"
                                      />
                                    </div>
                                  </TableCell>
                                ))}
                                <TableCell className="text-center font-bold">
                                  {absent ? "-" : finalMark.toFixed(1)}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant={grade === "F" ? "destructive" : "default"}>
                                    {grade}
                                  </Badge>
                                </TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell>
                                  <Input
                                    type="number"
                                    max={selectedExamData?.total_marks}
                                    min={0}
                                    value={componentMarks[student.id]?.__simple?.marks || ""}
                                    onChange={(e) =>
                                      updateComponentMark(student.id, "__simple", "marks", e.target.value)
                                    }
                                    disabled={componentMarks[student.id]?.__simple?.absent}
                                    className="w-20"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Checkbox
                                    checked={componentMarks[student.id]?.__simple?.absent || false}
                                    onCheckedChange={(checked) =>
                                      updateComponentMark(student.id, "__simple", "absent", checked)
                                    }
                                  />
                                </TableCell>
                              </>
                            )}
                            <TableCell>
                              <Input
                                value={remarks[student.id] || ""}
                                onChange={(e) =>
                                  setRemarks((prev) => ({ ...prev, [student.id]: e.target.value }))
                                }
                                placeholder="Optional"
                                className="min-w-[120px]"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedPage>
  );
}
