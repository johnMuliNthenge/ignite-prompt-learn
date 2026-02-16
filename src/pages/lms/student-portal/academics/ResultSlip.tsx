import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Loader2, Printer, Award, TrendingUp, BookOpen, BarChart3, Eye, Download, ArrowLeft } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import html2canvas from 'html2canvas';

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

interface SessionSummary {
  session_id: string;
  session_name: string;
  subjects: number;
  passed: number;
  failed: number;
  absent: number;
  avgPct: number;
  totalObtained: number;
  totalMax: number;
  overallGrade: string;
}

const GRADE_COLORS: Record<string, string> = {
  A: "#16a34a", B: "#2563eb", C: "#ca8a04", D: "#ea580c", E: "#c2410c", F: "#dc2626",
};
const PIE_COLORS = ["#16a34a", "#dc2626", "#94a3b8"];

const getOverallGrade = (pct: number) => {
  if (pct >= 90) return "A";
  if (pct >= 80) return "B";
  if (pct >= 70) return "C";
  if (pct >= 60) return "D";
  if (pct >= 50) return "E";
  return "F";
};

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

export default function ResultSlip() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<{ id: string; name: string }[]>([]);
  const [student, setStudent] = useState<{ id: string; student_no: string; other_name: string; surname: string; class_id: string | null } | null>(null);
  const [className, setClassName] = useState('');
  const [loading, setLoading] = useState(true);
  const [sessionSummaries, setSessionSummaries] = useState<SessionSummary[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionSummary | null>(null);
  const [detailResults, setDetailResults] = useState<SubjectResult[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const resultSlipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.id) fetchInitialData();
  }, [user?.id]);

  const fetchInitialData = async () => {
    try {
      const { data: studentData } = await supabase
        .from('students')
        .select('id, student_no, other_name, surname, class_id')
        .eq('user_id', user?.id)
        .single();

      if (!studentData) { setLoading(false); return; }
      setStudent(studentData);

      if (studentData.class_id) {
        const { data: classData } = await supabase.from('classes').select('name').eq('id', studentData.class_id).single();
        if (classData) setClassName(classData.name);
      }

      const { data: sessionData } = await supabase
        .from('sessions')
        .select('id, name')
        .order('start_date', { ascending: false });
      setSessions(sessionData || []);

      // Build summaries for all sessions
      if (sessionData && sessionData.length > 0 && studentData) {
        await buildSessionSummaries(studentData, sessionData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildSessionSummaries = async (
    stu: { id: string; class_id: string | null },
    allSessions: { id: string; name: string }[]
  ) => {
    const summaries: SessionSummary[] = [];

    for (const session of allSessions) {
      const { data: exams } = await (supabase as any)
        .from('academic_exams')
        .select('id, total_marks, passing_marks')
        .eq('class_id', stu.class_id)
        .eq('session_id', session.id);

      if (!exams || exams.length === 0) continue;

      const examIds = exams.map((e: any) => e.id);
      const { data: marks } = await (supabase as any)
        .from('academic_marks')
        .select('marks_obtained, is_absent, exam_id')
        .eq('student_id', stu.id)
        .in('exam_id', examIds);

      if (!marks || marks.length === 0) continue;

      let totalObtained = 0, totalMax = 0, passed = 0, failed = 0, absent = 0;
      for (const m of marks) {
        const exam = exams.find((e: any) => e.id === m.exam_id);
        const total = exam?.total_marks || 100;
        if (m.is_absent) { absent++; continue; }
        totalObtained += m.marks_obtained || 0;
        totalMax += total;
        if ((m.marks_obtained ?? 0) >= (exam?.passing_marks ?? 0)) passed++;
        else failed++;
      }

      const avgPct = totalMax > 0 ? Math.round(((totalObtained / totalMax) * 100) * 10) / 10 : 0;
      summaries.push({
        session_id: session.id,
        session_name: session.name,
        subjects: marks.length,
        passed,
        failed,
        absent,
        avgPct,
        totalObtained,
        totalMax,
        overallGrade: getOverallGrade(avgPct),
      });
    }

    setSessionSummaries(summaries);
  };

  const handleViewDetail = async (summary: SessionSummary) => {
    if (!student) return;
    setLoadingDetail(true);
    setSelectedSession(summary);

    try {
      const { data: exams } = await (supabase as any)
        .from('academic_exams')
        .select('id, name, total_marks, passing_marks')
        .eq('class_id', student.class_id)
        .eq('session_id', summary.session_id);

      if (!exams || exams.length === 0) { setDetailResults([]); return; }

      const examIds = exams.map((e: any) => e.id);
      const { data: marks } = await (supabase as any)
        .from('academic_marks')
        .select('*, subjects:subject_id(id, name, code)')
        .eq('student_id', student.id)
        .in('exam_id', examIds);

      const results: SubjectResult[] = (marks || []).map((r: any) => {
        const exam = exams.find((e: any) => e.id === r.exam_id);
        const total = exam?.total_marks || 100;
        const pct = r.is_absent ? 0 : ((r.marks_obtained || 0) / total) * 100;
        return {
          subject_code: r.subjects?.code || "",
          subject_name: r.subjects?.name || "Unknown Subject",
          marks_obtained: r.marks_obtained || 0,
          total_marks: total,
          percentage: Math.round(pct * 10) / 10,
          grade: r.grade || "F",
          is_absent: r.is_absent || false,
          passed: !r.is_absent && (r.marks_obtained ?? 0) >= (exam?.passing_marks ?? 0),
          remarks: r.remarks || "",
        };
      }).sort((a: SubjectResult, b: SubjectResult) => a.subject_code.localeCompare(b.subject_code));

      setDetailResults(results);
    } catch (error) {
      console.error('Error fetching detail results:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const detailStats = useMemo(() => {
    if (!detailResults.length) return null;
    const scored = detailResults.filter((r) => !r.is_absent);
    const totalObtained = scored.reduce((s, r) => s + r.marks_obtained, 0);
    const totalMax = scored.reduce((s, r) => s + r.total_marks, 0);
    const avgPct = scored.length > 0 ? (totalObtained / totalMax) * 100 : 0;
    const passed = scored.filter((r) => r.passed).length;
    const failed = scored.filter((r) => !r.passed).length;
    const absent = detailResults.filter((r) => r.is_absent).length;
    const best = scored.length > 0 ? scored.reduce((a, b) => (a.percentage > b.percentage ? a : b)) : null;
    const worst = scored.length > 0 ? scored.reduce((a, b) => (a.percentage < b.percentage ? a : b)) : null;
    return { totalObtained, totalMax, avgPct: Math.round(avgPct * 10) / 10, passed, failed, absent, best, worst, total: detailResults.length };
  }, [detailResults]);

  const barChartData = useMemo(() =>
    detailResults.filter((r) => !r.is_absent).map((r) => ({
      subject: r.subject_code || r.subject_name.substring(0, 8),
      percentage: r.percentage,
      grade: r.grade,
    })),
  [detailResults]);

  const pieData = useMemo(() => {
    if (!detailStats) return [];
    return [
      { name: "Passed", value: detailStats.passed },
      { name: "Failed", value: detailStats.failed },
      ...(detailStats.absent > 0 ? [{ name: "Absent", value: detailStats.absent }] : []),
    ].filter((d) => d.value > 0);
  }, [detailStats]);

  const handlePrint = () => window.print();

  const handleDownload = async () => {
    if (!resultSlipRef.current) return;
    try {
      const canvas = await html2canvas(resultSlipRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      link.download = `ResultSlip_${student?.student_no}_${selectedSession?.session_name || 'session'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Detail view (when a session is selected)
  if (selectedSession && student && detailStats) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-3 print:hidden">
          <Button variant="outline" size="sm" onClick={() => { setSelectedSession(null); setDetailResults([]); }}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h1 className="text-xl font-bold">Result Slip</h1>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" /> Download
            </Button>
            <Button size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
          </div>
        </div>

        {loadingDetail ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div id="student-result-slip" ref={resultSlipRef}>
            {/* Header */}
            <div className="bg-gradient-to-r from-primary/90 to-primary p-4 sm:p-6 text-primary-foreground rounded-t-lg">
              <h2 className="text-lg sm:text-2xl font-bold tracking-tight">Academic Result Slip</h2>
              <p className="text-primary-foreground/80 text-xs sm:text-sm mt-1">{selectedSession.session_name}</p>
              <Separator className="my-3 sm:my-4 bg-primary-foreground/20" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs sm:text-sm">
                <div>
                  <span className="text-primary-foreground/60 block">Student Name</span>
                  <span className="font-semibold">{student.surname} {student.other_name}</span>
                </div>
                <div>
                  <span className="text-primary-foreground/60 block">Student No</span>
                  <span className="font-semibold font-mono">{student.student_no}</span>
                </div>
                <div>
                  <span className="text-primary-foreground/60 block">Class</span>
                  <span className="font-semibold">{className || '-'}</span>
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

            {/* Subject Results Table */}
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
                    {detailResults.map((r, idx) => (
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

            {/* Charts */}
            <div className="p-4 sm:p-6 space-y-4">
              <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">Performance Analytics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 border rounded-xl p-3 sm:p-4">
                  <h4 className="text-[10px] sm:text-xs font-semibold mb-2 text-muted-foreground uppercase">Performance by Subject</h4>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={barChartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }} barCategoryGap="15%" barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="subject" tick={{ fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={50} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                      <Tooltip formatter={(value: number) => [`${value}%`, "Score"]} contentStyle={{ borderRadius: "8px", fontSize: "11px" }} />
                      <Bar dataKey="percentage" radius={[4, 4, 0, 0]} maxBarSize={28}>
                        {barChartData.map((entry, idx) => (
                          <Cell key={idx} fill={GRADE_COLORS[entry.grade] || "#94a3b8"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="border rounded-xl p-3 sm:p-4 flex flex-col items-center">
                  <h4 className="text-[10px] sm:text-xs font-semibold mb-2 text-muted-foreground uppercase self-start">Pass / Fail</h4>
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="45%"
                        innerRadius={30}
                        outerRadius={50}
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

        {/* Print styles */}
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #student-result-slip, #student-result-slip * { visibility: visible; }
            #student-result-slip {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 0;
              margin: 0;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            .print\\:hidden { display: none !important; }
            table { font-size: 11px; }
            .recharts-responsive-container { page-break-inside: avoid; }
          }
        `}</style>
      </div>
    );
  }

  // List view (default)
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Result Slip</h1>
        <p className="text-muted-foreground">View and print your academic results per session</p>
      </div>

      {sessionSummaries.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">No results found for any session</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>My Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-xl overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold text-xs">#</TableHead>
                    <TableHead className="font-semibold text-xs">Session</TableHead>
                    <TableHead className="text-center font-semibold text-xs">Subjects</TableHead>
                    <TableHead className="text-center font-semibold text-xs">Passed</TableHead>
                    <TableHead className="text-center font-semibold text-xs">Failed</TableHead>
                    <TableHead className="text-center font-semibold text-xs">Average</TableHead>
                    <TableHead className="text-center font-semibold text-xs">Grade</TableHead>
                    <TableHead className="text-center font-semibold text-xs">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessionSummaries.map((s, idx) => (
                    <TableRow key={s.session_id}>
                      <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                      <TableCell className="font-medium text-sm">{s.session_name}</TableCell>
                      <TableCell className="text-center text-sm">{s.subjects}</TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 text-xs">{s.passed}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-red-500 hover:bg-red-600 text-white border-0 text-xs">{s.failed}</Badge>
                      </TableCell>
                      <TableCell className="text-center font-semibold text-sm">{s.avgPct}%</TableCell>
                      <TableCell className="text-center">
                        <Badge className={`${getGradeBadgeClass(s.overallGrade)} text-xs`}>{s.overallGrade}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" variant="outline" onClick={() => handleViewDetail(s)}>
                          <Eye className="h-4 w-4 mr-1" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
