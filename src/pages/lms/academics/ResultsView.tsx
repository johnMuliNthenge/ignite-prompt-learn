import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedPage } from "@/components/auth/ProtectedPage";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Printer, Loader2, Eye, TrendingUp, Award, BookOpen, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

interface StudentRow {
  id: string;
  student_no: string;
  surname: string;
  other_name: string;
}

interface SubjectResult {
  subject_code: string;
  subject_name: string;
  exam_name: string;
  marks_obtained: number;
  total_marks: number;
  percentage: number;
  grade: string;
  is_absent: boolean;
  passed: boolean;
  remarks: string;
}

const GRADE_COLORS: Record<string, string> = {
  A: "#16a34a",
  B: "#2563eb",
  C: "#ca8a04",
  D: "#ea580c",
  E: "#c2410c",
  F: "#dc2626",
};

const PIE_COLORS = ["#16a34a", "#dc2626", "#94a3b8"];

export default function ResultsView() {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);

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

  const { data: students, isLoading: loadingStudents } = useQuery({
    queryKey: ["students-results-list", selectedClass],
    queryFn: async () => {
      if (!selectedClass) return [];
      const { data, error } = await supabase
        .from("students")
        .select("id, student_no, surname, other_name")
        .eq("class_id", selectedClass)
        .eq("status", "Active")
        .order("surname");
      if (error) throw error;
      return data as StudentRow[];
    },
    enabled: !!selectedClass,
  });

  // Fetch all results for the class+session to compute summary stats per student
  const { data: allResults, isLoading: loadingResults } = useQuery({
    queryKey: ["all-results-summary", selectedClass, selectedSession],
    queryFn: async () => {
      if (!selectedClass || !selectedSession) return [];
      const { data: exams, error: examError } = await (supabase as any)
        .from("academic_exams")
        .select("id, name, total_marks, passing_marks, subject_id, subjects:subject_id(name, code)")
        .eq("class_id", selectedClass)
        .eq("session_id", selectedSession);
      if (examError) throw examError;
      if (!exams || exams.length === 0) return [];

      const examIds = exams.map((e: any) => e.id);
      const { data: marks, error: marksError } = await supabase
        .from("academic_marks")
        .select("*")
        .in("exam_id", examIds);
      if (marksError) throw marksError;

      return (marks || []).map((m: any) => {
        const exam = exams.find((e: any) => e.id === m.exam_id);
        return { ...m, exam };
      });
    },
    enabled: !!selectedClass && !!selectedSession,
  });

  // Summary per student
  const studentSummaries = useMemo(() => {
    if (!students || !allResults) return new Map();
    const map = new Map<string, { subjects: number; avgPercentage: number; passed: number; failed: number; absent: number }>();
    students.forEach((s) => {
      const marks = allResults.filter((r: any) => r.student_id === s.id);
      const subjects = marks.length;
      const passed = marks.filter((m: any) => !m.is_absent && (m.marks_obtained ?? 0) >= (m.exam?.passing_marks ?? 0)).length;
      const absent = marks.filter((m: any) => m.is_absent).length;
      const failed = subjects - passed - absent;
      const scored = marks.filter((m: any) => !m.is_absent);
      const avgPercentage = scored.length > 0
        ? scored.reduce((sum: number, m: any) => sum + ((m.marks_obtained || 0) / (m.exam?.total_marks || 100)) * 100, 0) / scored.length
        : 0;
      map.set(s.id, { subjects, avgPercentage: Math.round(avgPercentage * 10) / 10, passed, failed, absent });
    });
    return map;
  }, [students, allResults]);

  // Detail results for selected student
  const studentResults: SubjectResult[] = useMemo(() => {
    if (!selectedStudent || !allResults) return [];
    return allResults
      .filter((r: any) => r.student_id === selectedStudent.id)
      .map((r: any) => {
        const total = r.exam?.total_marks || 100;
        const pct = r.is_absent ? 0 : ((r.marks_obtained || 0) / total) * 100;
        return {
          subject_code: r.exam?.subjects?.code || "",
          subject_name: r.exam?.subjects?.name || r.exam?.name || "Unknown",
          exam_name: r.exam?.name || "",
          marks_obtained: r.marks_obtained || 0,
          total_marks: total,
          percentage: Math.round(pct * 10) / 10,
          grade: r.grade || "F",
          is_absent: r.is_absent || false,
          passed: !r.is_absent && (r.marks_obtained ?? 0) >= (r.exam?.passing_marks ?? 0),
          remarks: r.remarks || "",
        } as SubjectResult;
      })
      .sort((a, b) => a.subject_code.localeCompare(b.subject_code));
  }, [selectedStudent, allResults]);

  const detailStats = useMemo(() => {
    if (!studentResults.length) return null;
    const scored = studentResults.filter((r) => !r.is_absent);
    const totalObtained = scored.reduce((s, r) => s + r.marks_obtained, 0);
    const totalMax = scored.reduce((s, r) => s + r.total_marks, 0);
    const avgPct = scored.length > 0 ? (totalObtained / totalMax) * 100 : 0;
    const passed = scored.filter((r) => r.passed).length;
    const failed = scored.filter((r) => !r.passed).length;
    const absent = studentResults.filter((r) => r.is_absent).length;
    const best = scored.length > 0 ? scored.reduce((a, b) => (a.percentage > b.percentage ? a : b)) : null;
    const worst = scored.length > 0 ? scored.reduce((a, b) => (a.percentage < b.percentage ? a : b)) : null;
    return { totalObtained, totalMax, avgPct: Math.round(avgPct * 10) / 10, passed, failed, absent, best, worst, total: studentResults.length };
  }, [studentResults]);

  const barChartData = useMemo(() =>
    studentResults.filter((r) => !r.is_absent).map((r) => ({
      subject: r.subject_code || r.subject_name.substring(0, 8),
      percentage: r.percentage,
      grade: r.grade,
    })),
  [studentResults]);

  const pieData = useMemo(() => {
    if (!detailStats) return [];
    return [
      { name: "Passed", value: detailStats.passed },
      { name: "Failed", value: detailStats.failed },
      ...(detailStats.absent > 0 ? [{ name: "Absent", value: detailStats.absent }] : []),
    ].filter((d) => d.value > 0);
  }, [detailStats]);

  const radarData = useMemo(() =>
    studentResults.filter((r) => !r.is_absent).map((r) => ({
      subject: r.subject_code || r.subject_name.substring(0, 6),
      score: r.percentage,
      fullMark: 100,
    })),
  [studentResults]);

  const selectedClassName = classes?.find((c) => c.id === selectedClass)?.name || "";
  const selectedSessionName = sessions?.find((s) => s.id === selectedSession)?.name || "";

  const handlePrint = () => window.print();

  const getGradeBadgeClass = (grade: string) => {
    switch (grade) {
      case "A": return "bg-emerald-500 hover:bg-emerald-600 text-white border-0";
      case "B": return "bg-blue-500 hover:bg-blue-600 text-white border-0";
      case "C": return "bg-yellow-500 hover:bg-yellow-600 text-white border-0";
      case "D": return "bg-orange-500 hover:bg-orange-600 text-white border-0";
      case "E": return "bg-orange-700 hover:bg-orange-800 text-white border-0";
      case "F": return "bg-red-500 hover:bg-red-600 text-white border-0";
      default: return "";
    }
  };

  const getOverallGrade = (pct: number) => {
    if (pct >= 90) return "A";
    if (pct >= 80) return "B";
    if (pct >= 70) return "C";
    if (pct >= 60) return "D";
    if (pct >= 50) return "E";
    return "F";
  };

  return (
    <ProtectedPage moduleCode="academics.results">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Academic Results</h1>
          <p className="text-muted-foreground">View student results per session across all registered subjects</p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Select Class & Session</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedStudent(null); }}>
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
                <Select value={selectedSession} onValueChange={(v) => { setSelectedSession(v); setSelectedStudent(null); }}>
                  <SelectTrigger><SelectValue placeholder="Select session" /></SelectTrigger>
                  <SelectContent>
                    {sessions?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Student List */}
        {selectedClass && selectedSession && (
          <Card>
            <CardHeader>
              <CardTitle>Students</CardTitle>
              <CardDescription>Click "View" to see detailed results for a student</CardDescription>
            </CardHeader>
            <CardContent>
              {(loadingStudents || loadingResults) ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : !students?.length ? (
                <p className="text-center text-muted-foreground py-6">No students found in this class</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Student No</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead className="text-center">Subjects</TableHead>
                      <TableHead className="text-center">Avg %</TableHead>
                      <TableHead className="text-center">Passed</TableHead>
                      <TableHead className="text-center">Failed</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((s, i) => {
                      const summary = studentSummaries.get(s.id);
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="font-mono text-sm">{s.student_no}</TableCell>
                          <TableCell className="font-medium">{s.surname} {s.other_name}</TableCell>
                          <TableCell className="text-center">{summary?.subjects || 0}</TableCell>
                          <TableCell className="text-center">
                            {summary?.subjects ? (
                              <Badge className={getGradeBadgeClass(getOverallGrade(summary.avgPercentage))}>
                                {summary.avgPercentage}%
                              </Badge>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {summary?.passed ? (
                              <span className="text-emerald-600 font-semibold">{summary.passed}</span>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {summary?.failed ? (
                              <span className="text-red-500 font-semibold">{summary.failed}</span>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedStudent(s)}
                              disabled={!summary?.subjects}
                            >
                              <Eye className="h-4 w-4 mr-1" /> View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Result Slip Modal */}
        <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
            {selectedStudent && detailStats && (
              <div className="print:p-0" id="result-slip">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary/90 to-primary p-6 text-primary-foreground rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">Academic Result Slip</h2>
                      <p className="text-primary-foreground/80 text-sm mt-1">
                        {selectedClassName} • {selectedSessionName}
                      </p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={handlePrint} className="print:hidden">
                      <Printer className="h-4 w-4 mr-1" /> Print
                    </Button>
                  </div>
                  <Separator className="my-4 bg-primary-foreground/20" />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-primary-foreground/60 block">Student Name</span>
                      <span className="font-semibold">{selectedStudent.surname} {selectedStudent.other_name}</span>
                    </div>
                    <div>
                      <span className="text-primary-foreground/60 block">Student No</span>
                      <span className="font-semibold font-mono">{selectedStudent.student_no}</span>
                    </div>
                    <div>
                      <span className="text-primary-foreground/60 block">Subjects Taken</span>
                      <span className="font-semibold">{detailStats.total}</span>
                    </div>
                    <div>
                      <span className="text-primary-foreground/60 block">Overall Average</span>
                      <span className="font-semibold text-lg">{detailStats.avgPct}%</span>
                    </div>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-6 pb-0">
                  <div className="rounded-xl border bg-emerald-50 dark:bg-emerald-950/30 p-4 text-center">
                    <Award className="h-5 w-5 mx-auto text-emerald-600 mb-1" />
                    <p className="text-2xl font-bold text-emerald-600">{detailStats.passed}</p>
                    <p className="text-xs text-muted-foreground">Passed</p>
                  </div>
                  <div className="rounded-xl border bg-red-50 dark:bg-red-950/30 p-4 text-center">
                    <TrendingUp className="h-5 w-5 mx-auto text-red-500 mb-1" />
                    <p className="text-2xl font-bold text-red-500">{detailStats.failed}</p>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                  <div className="rounded-xl border bg-blue-50 dark:bg-blue-950/30 p-4 text-center">
                    <BookOpen className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                    <p className="text-2xl font-bold text-blue-500">{detailStats.totalObtained}/{detailStats.totalMax}</p>
                    <p className="text-xs text-muted-foreground">Total Marks</p>
                  </div>
                  <div className="rounded-xl border bg-purple-50 dark:bg-purple-950/30 p-4 text-center">
                    <BarChart3 className="h-5 w-5 mx-auto text-purple-500 mb-1" />
                    <p className="text-2xl font-bold text-purple-500">
                      <Badge className={`${getGradeBadgeClass(getOverallGrade(detailStats.avgPct))} text-lg px-3`}>
                        {getOverallGrade(detailStats.avgPct)}
                      </Badge>
                    </p>
                    <p className="text-xs text-muted-foreground">Overall Grade</p>
                  </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 pb-0">
                  {/* Bar Chart */}
                  <div className="md:col-span-2 border rounded-xl p-4">
                    <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Performance by Subject</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={barChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(value: number) => [`${value}%`, "Score"]}
                          contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                        />
                        <Bar dataKey="percentage" radius={[6, 6, 0, 0]} maxBarSize={40}>
                          {barChartData.map((entry, idx) => (
                            <Cell key={idx} fill={GRADE_COLORS[entry.grade] || "#94a3b8"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Pie Chart */}
                  <div className="border rounded-xl p-4">
                    <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Pass / Fail</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={4}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                          labelLine={false}
                        >
                          {pieData.map((_, idx) => (
                            <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend iconSize={10} wrapperStyle={{ fontSize: "11px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Radar Chart - only show if 3+ subjects */}
                {radarData.length >= 3 && (
                  <div className="px-6">
                    <div className="border rounded-xl p-4">
                      <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Competency Radar</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <RadarChart data={radarData}>
                          <PolarGrid strokeDasharray="3 3" />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                          <Radar name="Score" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} strokeWidth={2} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Best & Worst */}
                {(detailStats.best || detailStats.worst) && (
                  <div className="grid grid-cols-2 gap-4 px-6 pt-4">
                    {detailStats.best && (
                      <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
                        <p className="text-xs text-muted-foreground mb-1">🏆 Best Subject</p>
                        <p className="font-semibold text-sm">{detailStats.best.subject_code} - {detailStats.best.subject_name}</p>
                        <p className="text-emerald-600 font-bold">{detailStats.best.percentage}% ({detailStats.best.grade})</p>
                      </div>
                    )}
                    {detailStats.worst && (
                      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 p-3">
                        <p className="text-xs text-muted-foreground mb-1">📉 Needs Improvement</p>
                        <p className="font-semibold text-sm">{detailStats.worst.subject_code} - {detailStats.worst.subject_name}</p>
                        <p className="text-red-500 font-bold">{detailStats.worst.percentage}% ({detailStats.worst.grade})</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Results Table */}
                <div className="p-6">
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Detailed Subject Results</h3>
                  <div className="border rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-semibold">#</TableHead>
                          <TableHead className="font-semibold">Subject</TableHead>
                          <TableHead className="text-center font-semibold">Marks</TableHead>
                          <TableHead className="text-center font-semibold">Percentage</TableHead>
                          <TableHead className="text-center font-semibold">Grade</TableHead>
                          <TableHead className="text-center font-semibold">Status</TableHead>
                          <TableHead className="font-semibold">Remarks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentResults.map((r, idx) => (
                          <TableRow key={idx} className={r.is_absent ? "opacity-50" : ""}>
                            <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell>
                              <span className="font-medium">{r.subject_code && `${r.subject_code} - `}{r.subject_name}</span>
                            </TableCell>
                            <TableCell className="text-center font-mono">
                              {r.is_absent ? "-" : `${r.marks_obtained}/${r.total_marks}`}
                            </TableCell>
                            <TableCell className="text-center font-semibold">
                              {r.is_absent ? "-" : `${r.percentage}%`}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={getGradeBadgeClass(r.is_absent ? "-" : r.grade)}>
                                {r.is_absent ? "-" : r.grade}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {r.is_absent ? (
                                <Badge variant="outline">Absent</Badge>
                              ) : r.passed ? (
                                <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-0">Pass</Badge>
                              ) : (
                                <Badge className="bg-red-500 hover:bg-red-600 text-white border-0">Fail</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{r.remarks || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Footer */}
                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                    <span>Generated on {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                    <span>Total: {detailStats.totalObtained}/{detailStats.totalMax} • Average: {detailStats.avgPct}% • Grade: {getOverallGrade(detailStats.avgPct)}</span>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedPage>
  );
}
