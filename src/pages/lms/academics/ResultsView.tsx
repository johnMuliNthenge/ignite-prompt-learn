import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedPage } from "@/components/auth/ProtectedPage";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface StudentResult {
  id: string;
  marks_obtained: number | null;
  grade: string | null;
  is_absent: boolean | null;
  remarks: string | null;
  students: {
    id: string;
    student_no: string;
    surname: string;
    other_name: string;
  } | null;
  academic_exams: {
    name: string;
    total_marks: number;
    passing_marks: number;
  } | null;
}

export default function ResultsView() {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedExam, setSelectedExam] = useState("");

  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("id, name").eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: exams } = useQuery({
    queryKey: ["exams-for-class", selectedClass],
    queryFn: async () => {
      if (!selectedClass) return [];
      const { data, error } = await supabase
        .from("academic_exams")
        .select("id, name, total_marks, passing_marks, subject")
        .eq("class_id", selectedClass)
        .eq("is_published", true);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedClass,
  });

  const { data: results, isLoading } = useQuery({
    queryKey: ["exam-results", selectedExam],
    queryFn: async () => {
      if (!selectedExam) return [] as StudentResult[];
      const { data, error } = await supabase
        .from("academic_marks")
        .select(`
          id,
          marks_obtained,
          grade,
          is_absent,
          remarks,
          students:student_id(id, student_no, surname, other_name),
          academic_exams:exam_id(name, total_marks, passing_marks)
        `)
        .eq("exam_id", selectedExam)
        .order("marks_obtained", { ascending: false });
      if (error) throw error;
      return data as StudentResult[];
    },
    enabled: !!selectedExam,
  });

  const selectedExamData = exams?.find((e) => e.id === selectedExam);

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

  const handlePrint = () => {
    window.print();
  };

  // Calculate statistics
  const stats = results && results.length > 0 ? {
    total: results.length,
    passed: results.filter((r) => !r.is_absent && (r.marks_obtained ?? 0) >= (selectedExamData?.passing_marks ?? 0)).length,
    failed: results.filter((r) => !r.is_absent && (r.marks_obtained ?? 0) < (selectedExamData?.passing_marks ?? 0)).length,
    absent: results.filter((r) => r.is_absent).length,
    highest: Math.max(...results.filter((r) => !r.is_absent).map((r) => r.marks_obtained ?? 0), 0),
    lowest: Math.min(...results.filter((r) => !r.is_absent).map((r) => r.marks_obtained ?? Infinity), 0),
    average: results.filter((r) => !r.is_absent).length > 0
      ? (results.filter((r) => !r.is_absent).reduce((sum, r) => sum + (r.marks_obtained ?? 0), 0) /
          results.filter((r) => !r.is_absent).length).toFixed(2)
      : 0,
  } : null;

  return (
    <ProtectedPage moduleCode="academics.results">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Results View</h1>
            <p className="text-muted-foreground">View and analyze student exam results</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedExam(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Exam</Label>
                <Select value={selectedExam} onValueChange={setSelectedExam} disabled={!selectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select exam" />
                  </SelectTrigger>
                  <SelectContent>
                    {exams?.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.name} - {e.subject}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Students</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-green-600">{stats.passed}</p>
                <p className="text-sm text-muted-foreground">Passed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-orange-600">{stats.absent}</p>
                <p className="text-sm text-muted-foreground">Absent</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{stats.highest}</p>
                <p className="text-sm text-muted-foreground">Highest</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{stats.lowest === Infinity ? 0 : stats.lowest}</p>
                <p className="text-sm text-muted-foreground">Lowest</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{stats.average}</p>
                <p className="text-sm text-muted-foreground">Average</p>
              </CardContent>
            </Card>
          </div>
        )}

        {selectedExam && (
          <Card className="print:shadow-none">
            <CardHeader>
              <CardTitle>
                {selectedExamData?.name} Results
                {selectedExamData?.subject && ` - ${selectedExamData.subject}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>Loading results...</p>
              ) : !results?.length ? (
                <p className="text-muted-foreground">No results found for this exam</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Student No</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Marks</TableHead>
                      <TableHead>Percentage</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result, index) => {
                      const percentage = ((result.marks_obtained ?? 0) / (selectedExamData?.total_marks ?? 100) * 100).toFixed(1);
                      const passed = (result.marks_obtained ?? 0) >= (selectedExamData?.passing_marks ?? 0);
                      return (
                        <TableRow key={result.id}>
                          <TableCell>{result.is_absent ? "-" : index + 1}</TableCell>
                          <TableCell>{result.students?.student_no}</TableCell>
                          <TableCell className="font-medium">
                            {result.students?.surname} {result.students?.other_name}
                          </TableCell>
                          <TableCell>
                            {result.is_absent ? "-" : `${result.marks_obtained}/${selectedExamData?.total_marks}`}
                          </TableCell>
                          <TableCell>{result.is_absent ? "-" : `${percentage}%`}</TableCell>
                          <TableCell>
                            {result.is_absent ? (
                              <Badge variant="outline">-</Badge>
                            ) : (
                              <Badge className={getGradeColor(result.grade || "F")}>{result.grade}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {result.is_absent ? (
                              <Badge variant="outline">Absent</Badge>
                            ) : passed ? (
                              <Badge variant="default" className="bg-green-600">Passed</Badge>
                            ) : (
                              <Badge variant="destructive">Failed</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{result.remarks || "-"}</TableCell>
                        </TableRow>
                      );
                    })}
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
