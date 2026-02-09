import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedPage } from "@/components/auth/ProtectedPage";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Printer, Loader2 } from "lucide-react";

export default function ResultsView() {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");

  const { data: classes } = useQuery({
    queryKey: ["classes"],
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

  const { data: students } = useQuery({
    queryKey: ["students-in-class", selectedClass],
    queryFn: async () => {
      if (!selectedClass) return [];
      const { data, error } = await supabase
        .from("students")
        .select("id, student_no, surname, other_name")
        .eq("class_id", selectedClass)
        .eq("status", "Active")
        .order("surname");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedClass,
  });

  // Get all exams for this class+session, then get marks for selected student
  const { data: results, isLoading } = useQuery({
    queryKey: ["session-results", selectedClass, selectedSession, selectedStudent],
    queryFn: async () => {
      if (!selectedClass || !selectedSession) return [];

      // Get all exams for this class+session
      const { data: exams, error: examError } = await (supabase as any)
        .from("academic_exams")
        .select("id, name, subject, total_marks, passing_marks, exam_type, subject_id, subjects:subject_id(name, code)")
        .eq("class_id", selectedClass)
        .eq("session_id", selectedSession)
        .order("name");
      if (examError) throw examError;
      if (!exams || exams.length === 0) return [];

      const examIds = exams.map((e: any) => e.id);

      // Get marks - optionally filtered by student
      let marksQuery = supabase
        .from("academic_marks")
        .select("id, exam_id, student_id, marks_obtained, grade, is_absent, remarks, students:student_id(id, student_no, surname, other_name)")
        .in("exam_id", examIds);

      if (selectedStudent) {
        marksQuery = marksQuery.eq("student_id", selectedStudent);
      }

      const { data: marks, error: marksError } = await marksQuery;
      if (marksError) throw marksError;

      // Combine exams with marks
      return (marks || []).map((m: any) => ({
        ...m,
        exam: exams.find((e: any) => e.id === m.exam_id),
      }));
    },
    enabled: !!selectedClass && !!selectedSession,
  });

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A": return "bg-green-600";
      case "B": return "bg-blue-600";
      case "C": return "bg-yellow-600";
      case "D": return "bg-orange-600";
      case "E": return "bg-orange-700";
      case "F": return "bg-destructive";
      default: return "bg-muted";
    }
  };

  // Group by student for consolidated view
  const studentResultsMap = new Map<string, { student: any; marks: any[] }>();
  results?.forEach((r: any) => {
    const sid = r.student_id;
    if (!studentResultsMap.has(sid)) {
      studentResultsMap.set(sid, { student: r.students, marks: [] });
    }
    studentResultsMap.get(sid)!.marks.push(r);
  });

  const handlePrint = () => window.print();

  return (
    <ProtectedPage moduleCode="academics.results">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Results View</h1>
            <p className="text-muted-foreground">View consolidated results per session across all subjects</p>
          </div>
          {results && results.length > 0 && (
            <Button onClick={handlePrint} variant="outline">
              <Printer className="h-4 w-4 mr-2" /> Print Results
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filter Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedStudent(""); }}>
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
                <Label>Student (optional)</Label>
                <Select value={selectedStudent} onValueChange={setSelectedStudent} disabled={!selectedClass}>
                  <SelectTrigger><SelectValue placeholder="All students" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Students</SelectItem>
                    {students?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.surname} {s.other_name} ({s.student_no})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          Array.from(studentResultsMap.entries()).map(([sid, { student, marks }]) => {
            const totalMarks = marks.reduce((sum, m) => sum + (m.exam?.total_marks || 0), 0);
            const obtained = marks.reduce((sum, m) => sum + (m.marks_obtained || 0), 0);
            const percentage = totalMarks > 0 ? ((obtained / totalMarks) * 100).toFixed(1) : "0";

            return (
              <Card key={sid} className="print:break-inside-avoid">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-lg">
                        {student?.surname} {student?.other_name}
                      </CardTitle>
                      <CardDescription>{student?.student_no}</CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-lg font-bold">{obtained}/{totalMarks} ({percentage}%)</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Exam</TableHead>
                        <TableHead className="text-center">Marks</TableHead>
                        <TableHead className="text-center">Grade</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead>Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {marks.map((m) => {
                        const passed = (m.marks_obtained ?? 0) >= (m.exam?.passing_marks ?? 0);
                        return (
                          <TableRow key={m.id}>
                            <TableCell className="font-medium">
                              {m.exam?.subjects ? `${m.exam.subjects.code} - ${m.exam.subjects.name}` : m.exam?.subject || "-"}
                            </TableCell>
                            <TableCell>{m.exam?.name || "-"}</TableCell>
                            <TableCell className="text-center">
                              {m.is_absent ? "-" : `${m.marks_obtained}/${m.exam?.total_marks}`}
                            </TableCell>
                            <TableCell className="text-center">
                              {m.is_absent ? (
                                <Badge variant="outline">-</Badge>
                              ) : (
                                <Badge className={getGradeColor(m.grade || "F")}>{m.grade}</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {m.is_absent ? (
                                <Badge variant="outline">Absent</Badge>
                              ) : passed ? (
                                <Badge variant="default" className="bg-green-600">Pass</Badge>
                              ) : (
                                <Badge variant="destructive">Fail</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{m.remarks || "-"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })
        )}

        {!isLoading && studentResultsMap.size === 0 && selectedClass && selectedSession && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No results found for the selected filters
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedPage>
  );
}
