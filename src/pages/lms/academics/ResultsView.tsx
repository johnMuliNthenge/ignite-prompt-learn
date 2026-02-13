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
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Printer, Loader2, Eye, TrendingUp, Award, BookOpen, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";

interface StudentRow {
  id: string;
  student_no: string;
  surname: string;
  other_name: string;
}

interface SubjectResult {
  subject_code: string;
  subject_name: string;
  marks_obtained: number;
  total_marks: number;
  percentage: number;
  grade: string;
  is_absent: boolean;
  passed: boolean;
  remarks: string;
}

const GRADE_COLORS: Record<string, string> = {
  A: "#16a34a", B: "#2563eb", C: "#ca8a04", D: "#ea580c", E: "#c2410c", F: "#dc2626",
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

  const { data: allResults, isLoading: loadingResults } = useQuery({
    queryKey: ["all-results-summary", selectedClass, selectedSession],
    queryFn: async () => {
      if (!selectedClass || !selectedSession) return [];
      // Get exams for this class+session
      const { data: exams, error: examError } = await (supabase as any)
        .from("academic_exams")
        .select("id, name, total_marks, passing_marks")
        .eq("class_id", selectedClass)
        .eq("session_id", selectedSession);
      if (examError) throw examError;
      if (!exams || exams.length === 0) return [];

      const examIds = exams.map((e: any) => e.id);
      // Fetch marks with subject info via subject_id
      const { data: marks, error: marksError } = await (supabase as any)
        .from("academic_marks")
        .select("*, subjects:subject_id(id, name, code)")
        .in("exam_id", examIds);
      if (marksError) throw marksError;

      return (marks || []).map((m: any) => {
        const exam = exams.find((e: any) => e.id === m.exam_id);
        return { ...m, exam };
      });
    },
    enabled: !!selectedClass && !!selectedSession,
  });

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

  const studentResults: SubjectResult[] = useMemo(() => {
    if (!selectedStudent || !allResults) return [];
    return allResults
      .filter((r: any) => r.student_id === selectedStudent.id)
      .map((r: any) => {
        const total = r.exam?.total_marks || 100;
        const pct = r.is_absent ? 0 : ((r.marks_obtained || 0) / total) * 100;
        return {
          subject_code: r.subjects?.code || "",
          subject_name: r.subjects?.name || "Unknown Subject",
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
                <div className="overflow-x-auto">
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
                              {summary?.passed ? <span className="text-emerald-600 font-semibold">{summary.passed}</span> : "-"}
                            </TableCell>
                            <TableCell className="text-center">
                              {summary?.failed ? <span className="text-red-500 font-semibold">{summary.failed}</span> : "-"}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button size="sm" variant="outline" onClick={() => setSelectedStudent(s)} disabled={!summary?.subjects}>
                                <Eye className="h-4 w-4 mr-1" /> View
                              </Button>
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

        {/* Result Slip Modal */}
        <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
          <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0 w-[95vw] sm:w-full">
            {selectedStudent && detailStats && (
              <div id="result-slip">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary/90 to-primary p-4 sm:p-6 text-primary-foreground rounded-t-lg">
                  <div className="flex items-start sm:items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="text-lg sm:text-2xl font-bold tracking-tight">Academic Result Slip</h2>
                      <p className="text-primary-foreground/80 text-xs sm:text-sm mt-1 truncate">
                        {selectedClassName} • {selectedSessionName}
                      </p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={handlePrint} className="print:hidden shrink-0">
                      <Printer className="h-4 w-4 mr-1" /> Print
                    </Button>
                  </div>
                  <Separator className="my-3 sm:my-4 bg-primary-foreground/20" />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs sm:text-sm">
                    <div>
                      <span className="text-primary-foreground/60 block">Student Name</span>
                      <span className="font-semibold">{selectedStudent.surname} {selectedStudent.other_name}</span>
                    </div>
                    <div>
                      <span className="text-primary-foreground/60 block">Student No</span>
                      <span className="font-semibold font-mono">{selectedStudent.student_no}</span>
                    </div>
                    <div>
                      <span className="text-primary-foreground/60 block">Subjects</span>
                      <span className="font-semibold">{detailStats.total}</span>
                    </div>
                    <div>
                      <span className="text-primary-foreground/60 block">Overall Average</span>
                      <span className="font-semibold text-base sm:text-lg">{detailStats.avgPct}%</span>
                    </div>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-4 sm:p-6 pb-0">
                  <div className="rounded-xl border bg-emerald-50 dark:bg-emerald-950/30 p-3 text-center">
                    <Award className="h-4 w-4 sm:h-5 sm:w-5 mx-auto text-emerald-600 mb-1" />
                    <p className="text-xl sm:text-2xl font-bold text-emerald-600">{detailStats.passed}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Passed</p>
                  </div>
                  <div className="rounded-xl border bg-red-50 dark:bg-red-950/30 p-3 text-center">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 mx-auto text-red-500 mb-1" />
                    <p className="text-xl sm:text-2xl font-bold text-red-500">{detailStats.failed}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Failed</p>
                  </div>
                  <div className="rounded-xl border bg-blue-50 dark:bg-blue-950/30 p-3 text-center">
                    <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 mx-auto text-blue-500 mb-1" />
                    <p className="text-lg sm:text-2xl font-bold text-blue-500">{detailStats.totalObtained}/{detailStats.totalMax}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Total Marks</p>
                  </div>
                  <div className="rounded-xl border bg-purple-50 dark:bg-purple-950/30 p-3 text-center">
                    <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 mx-auto text-purple-500 mb-1" />
                    <Badge className={`${getGradeBadgeClass(getOverallGrade(detailStats.avgPct))} text-base sm:text-lg px-2 sm:px-3`}>
                      {getOverallGrade(detailStats.avgPct)}
                    </Badge>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Overall Grade</p>
                  </div>
                </div>

                {/* Subject Results Table - FIRST */}
                <div className="p-4 sm:p-6">
                  <h3 className="text-xs sm:text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Subject Results</h3>
                  <div className="border rounded-xl overflow-hidden overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-semibold text-xs">#</TableHead>
                          <TableHead className="font-semibold text-xs">Subject</TableHead>
                          <TableHead className="text-center font-semibold text-xs">Marks</TableHead>
                          <TableHead className="text-center font-semibold text-xs">%</TableHead>
                          <TableHead className="text-center font-semibold text-xs">Grade</TableHead>
                          <TableHead className="text-center font-semibold text-xs">Status</TableHead>
                          <TableHead className="font-semibold text-xs hidden sm:table-cell">Remarks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentResults.map((r, idx) => (
                          <TableRow key={idx} className={r.is_absent ? "opacity-50" : ""}>
                            <TableCell className="text-muted-foreground text-xs py-2">{idx + 1}</TableCell>
                            <TableCell className="py-2">
                              <span className="font-medium text-xs sm:text-sm">{r.subject_code && `${r.subject_code} - `}{r.subject_name}</span>
                            </TableCell>
                            <TableCell className="text-center font-mono text-xs py-2">
                              {r.is_absent ? "-" : `${r.marks_obtained}/${r.total_marks}`}
                            </TableCell>
                            <TableCell className="text-center font-semibold text-xs py-2">
                              {r.is_absent ? "-" : `${r.percentage}%`}
                            </TableCell>
                            <TableCell className="text-center py-2">
                              <Badge className={`${getGradeBadgeClass(r.is_absent ? "-" : r.grade)} text-[10px] sm:text-xs`}>
                                {r.is_absent ? "-" : r.grade}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center py-2">
                              {r.is_absent ? (
                                <Badge variant="outline" className="text-[10px] sm:text-xs">Absent</Badge>
                              ) : r.passed ? (
                                <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 text-[10px] sm:text-xs">Pass</Badge>
                              ) : (
                                <Badge className="bg-red-500 hover:bg-red-600 text-white border-0 text-[10px] sm:text-xs">Fail</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground py-2 hidden sm:table-cell">{r.remarks || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Best & Worst */}
                {(detailStats.best || detailStats.worst) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-4 sm:px-6">
                    {detailStats.best && (
                      <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
                        <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">🏆 Best Subject</p>
                        <p className="font-semibold text-xs sm:text-sm">{detailStats.best.subject_code} - {detailStats.best.subject_name}</p>
                        <p className="text-emerald-600 font-bold text-sm">{detailStats.best.percentage}% ({detailStats.best.grade})</p>
                      </div>
                    )}
                    {detailStats.worst && (
                      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 p-3">
                        <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">📉 Needs Improvement</p>
                        <p className="font-semibold text-xs sm:text-sm">{detailStats.worst.subject_code} - {detailStats.worst.subject_name}</p>
                        <p className="text-red-500 font-bold text-sm">{detailStats.worst.percentage}% ({detailStats.worst.grade})</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Charts - BELOW subjects */}
                <div className="p-4 sm:p-6 space-y-4">
                  <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">Performance Analytics</h3>
                  
                  {/* Bar + Pie side by side on desktop, stacked on mobile */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 border rounded-xl p-3 sm:p-4">
                      <h4 className="text-[10px] sm:text-xs font-semibold mb-2 text-muted-foreground uppercase">Performance by Subject</h4>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={barChartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="subject" tick={{ fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={50} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                          <Tooltip formatter={(value: number) => [`${value}%`, "Score"]} contentStyle={{ borderRadius: "8px", fontSize: "11px" }} />
                          <Bar dataKey="percentage" radius={[4, 4, 0, 0]} maxBarSize={36}>
                            {barChartData.map((entry, idx) => (
                              <Cell key={idx} fill={GRADE_COLORS[entry.grade] || "#94a3b8"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="border rounded-xl p-3 sm:p-4">
                      <h4 className="text-[10px] sm:text-xs font-semibold mb-2 text-muted-foreground uppercase">Pass / Fail</h4>
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={35}
                            outerRadius={60}
                            paddingAngle={4}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                            labelLine={false}
                          >
                            {pieData.map((_, idx) => (
                              <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Legend iconSize={8} wrapperStyle={{ fontSize: "10px" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>

                {/* Footer */}
                <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[10px] sm:text-xs text-muted-foreground border-t pt-3 gap-1">
                    <span>Generated on {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                    <span>Total: {detailStats.totalObtained}/{detailStats.totalMax} • Average: {detailStats.avgPct}% • Grade: {getOverallGrade(detailStats.avgPct)}</span>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #result-slip, #result-slip * { visibility: visible; }
          #result-slip {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .print\\:hidden { display: none !important; }
          [data-radix-dialog-overlay] { display: none !important; }
          [role="dialog"] {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            transform: none !important;
            max-width: 100% !important;
            width: 100% !important;
            max-height: none !important;
            overflow: visible !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          table { font-size: 11px; }
          .recharts-responsive-container { page-break-inside: avoid; }
          .bg-emerald-50, .bg-red-50, .bg-blue-50, .bg-purple-50,
          .bg-emerald-500, .bg-red-500, .bg-blue-500, .bg-yellow-500, .bg-orange-500, .bg-orange-700,
          .bg-emerald-50\\/50, .bg-red-50\\/50 {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </ProtectedPage>
  );
}
