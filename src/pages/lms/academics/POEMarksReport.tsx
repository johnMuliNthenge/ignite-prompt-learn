import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedPage } from "@/components/auth/ProtectedPage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Search, FileText, Download, Printer } from "lucide-react";

interface POERecord {
  id: string;
  student_id: string;
  student_name: string;
  student_no: string;
  class_name: string;
  subject_name: string;
  title: string;
  status: string;
  score: number | null;
  max_score: number | null;
  submitted_at: string;
  reviewed_at: string | null;
  feedback: string | null;
}

export default function POEMarksReport() {
  const [sessionId, setSessionId] = useState<string>("all");
  const [studentSearch, setStudentSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: sessions } = useQuery({
    queryKey: ["sessions-for-poe"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, name, start_date, end_date, is_active")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: subjects } = useQuery({
    queryKey: ["subjects-for-poe"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: poeRecords, isLoading } = useQuery({
    queryKey: ["poe-marks-report", sessionId, subjectFilter, statusFilter],
    queryFn: async () => {
      // Get session date range if filtering
      let startDate: string | null = null;
      let endDate: string | null = null;
      if (sessionId !== "all" && sessions) {
        const session = sessions.find((s) => s.id === sessionId);
        if (session) {
          startDate = session.start_date;
          endDate = session.end_date;
        }
      }

      let query = supabase
        .from("student_poe_submissions")
        .select(`
          id, student_id, title, status, score, max_score, submitted_at, reviewed_at, feedback,
          students!student_poe_submissions_student_id_fkey(id, student_no, other_name, surname, class_id, classes!students_class_id_fkey(name)),
          subjects!student_poe_submissions_subject_id_fkey(id, name)
        `)
        .order("submitted_at", { ascending: false });

      if (startDate) {
        query = query.gte("submitted_at", startDate);
      }
      if (endDate) {
        query = query.lte("submitted_at", endDate + "T23:59:59");
      }
      if (subjectFilter !== "all") {
        query = query.eq("subject_id", subjectFilter);
      }
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((r: any) => ({
        id: r.id,
        student_id: r.student_id,
        student_name: r.students ? `${r.students.other_name || ""} ${r.students.surname || ""}`.trim() : "Unknown",
        student_no: r.students?.student_no || "-",
        class_name: r.students?.classes?.name || "-",
        subject_name: r.subjects?.name || "-",
        title: r.title,
        status: r.status,
        score: r.score,
        max_score: r.max_score,
        submitted_at: r.submitted_at,
        reviewed_at: r.reviewed_at,
        feedback: r.feedback,
      })) as POERecord[];
    },
  });

  const filteredRecords = (poeRecords || []).filter((r) => {
    if (!studentSearch) return true;
    const search = studentSearch.toLowerCase();
    return (
      r.student_name.toLowerCase().includes(search) ||
      r.student_no.toLowerCase().includes(search)
    );
  });

  const totalSubmissions = filteredRecords.length;
  const reviewedCount = filteredRecords.filter((r) => r.status === "reviewed").length;
  const pendingCount = filteredRecords.filter((r) => r.status === "pending").length;
  const avgScore = filteredRecords.filter((r) => r.score != null && r.max_score).length > 0
    ? (
        filteredRecords
          .filter((r) => r.score != null && r.max_score)
          .reduce((sum, r) => sum + ((r.score! / r.max_score!) * 100), 0) /
        filteredRecords.filter((r) => r.score != null && r.max_score).length
      ).toFixed(1)
    : "-";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "reviewed":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Reviewed</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getScoreDisplay = (score: number | null, maxScore: number | null) => {
    if (score == null || !maxScore) return "-";
    const pct = ((score / maxScore) * 100).toFixed(1);
    return (
      <span className={Number(pct) >= 50 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
        {score}/{maxScore} ({pct}%)
      </span>
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <ProtectedPage moduleCode="academics.poe_review" title="POE Marks Report">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">POE Marks Report</h1>
            <p className="text-muted-foreground mt-1">
              View and filter Portfolio of Evidence scores by session and student
            </p>
          </div>
          <Button variant="outline" onClick={handlePrint} className="print:hidden">
            <Printer className="mr-2 h-4 w-4" />
            Print Report
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4 print:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Submissions</p>
              <p className="text-2xl font-bold">{totalSubmissions}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Reviewed</p>
              <p className="text-2xl font-bold text-green-600">{reviewedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Avg Score (%)</p>
              <p className="text-2xl font-bold">{avgScore}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="print:hidden">
          <CardContent className="p-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Session</label>
                <Select value={sessionId} onValueChange={setSessionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Sessions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sessions</SelectItem>
                    {(sessions || []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} {s.is_active ? "(Active)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Subject</label>
                <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Subjects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {(subjects || []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Search Student</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Name or student no..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              POE Submissions & Marks
            </CardTitle>
            <CardDescription>
              {filteredRecords.length} record{filteredRecords.length !== 1 ? "s" : ""} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No POE submissions found for the selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student No</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead>Feedback</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-sm">{r.student_no}</TableCell>
                        <TableCell className="font-medium">{r.student_name}</TableCell>
                        <TableCell>{r.class_name}</TableCell>
                        <TableCell>{r.subject_name}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{r.title}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(r.submitted_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(r.status)}</TableCell>
                        <TableCell className="text-right">
                          {getScoreDisplay(r.score, r.max_score)}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                          {r.feedback || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedPage>
  );
}
