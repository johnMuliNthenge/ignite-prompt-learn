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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Save, Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type AttendanceStatus = "present" | "absent" | "late" | "excused";

interface Student {
  id: string;
  student_no: string;
  surname: string;
  other_name: string;
}

export default function StudentAttendance() {
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [attendanceData, setAttendanceData] = useState<Record<string, { status: AttendanceStatus; remarks: string }>>({});

  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("id, name").eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: students, isLoading: loadingStudents } = useQuery({
    queryKey: ["students-for-attendance", selectedClass],
    queryFn: async () => {
      if (!selectedClass) return [] as Student[];
      const { data, error } = await supabase
        .from("students")
        .select("id, student_no, surname, other_name")
        .eq("class_id", selectedClass)
        .order("surname");
      if (error) throw error;
      return data as Student[];
    },
    enabled: !!selectedClass,
  });

  const { data: existingAttendance } = useQuery({
    queryKey: ["existing-attendance", selectedClass, selectedDate],
    queryFn: async () => {
      if (!selectedClass || !selectedDate) return [];
      const { data, error } = await supabase
        .from("student_attendance")
        .select("*")
        .eq("class_id", selectedClass)
        .eq("attendance_date", selectedDate);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedClass && !!selectedDate,
  });

  // Initialize attendance data when students or existing attendance change
  useEffect(() => {
    if (students) {
      const newData: Record<string, { status: AttendanceStatus; remarks: string }> = {};
      students.forEach((student) => {
        const existing = existingAttendance?.find((a) => a.student_id === student.id);
        newData[student.id] = {
          status: (existing?.status as AttendanceStatus) || "present",
          remarks: existing?.remarks || "",
        };
      });
      setAttendanceData(newData);
    }
  }, [students, existingAttendance]);

  const updateAttendance = (studentId: string, field: string, value: any) => {
    setAttendanceData((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      },
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClass || !selectedDate || !students) return;

      const records = students.map((student) => {
        const data = attendanceData[student.id] || { status: "present", remarks: "" };
        return {
          student_id: student.id,
          class_id: selectedClass,
          attendance_date: selectedDate,
          status: data.status,
          remarks: data.remarks || null,
        };
      });

      const { error } = await supabase
        .from("student_attendance")
        .upsert(records, { onConflict: "student_id,attendance_date" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["existing-attendance"] });
      toast.success("Attendance saved successfully");
    },
    onError: (error: any) => toast.error(error.message),
  });

  // Calculate summary
  const summary = students && students.length > 0 ? {
    total: students.length,
    present: Object.values(attendanceData).filter((a) => a.status === "present").length,
    absent: Object.values(attendanceData).filter((a) => a.status === "absent").length,
    late: Object.values(attendanceData).filter((a) => a.status === "late").length,
    excused: Object.values(attendanceData).filter((a) => a.status === "excused").length,
  } : null;

  return (
    <ProtectedPage moduleCode="academics.attendance">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Student Attendance</h1>
          <p className="text-muted-foreground">Mark and manage daily student attendance</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" /> Select Class & Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
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
                <Label>Date</Label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {summary && selectedClass && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{summary.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-green-600">{summary.present}</p>
                <p className="text-sm text-muted-foreground">Present</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-destructive">{summary.absent}</p>
                <p className="text-sm text-muted-foreground">Absent</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-yellow-600">{summary.late}</p>
                <p className="text-sm text-muted-foreground">Late</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{summary.excused}</p>
                <p className="text-sm text-muted-foreground">Excused</p>
              </CardContent>
            </Card>
          </div>
        )}

        {selectedClass && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Mark Attendance - {format(new Date(selectedDate), "PP")}</CardTitle>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Attendance
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
                      <TableHead>Status</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>{student.student_no}</TableCell>
                        <TableCell className="font-medium">
                          {student.surname} {student.other_name}
                        </TableCell>
                        <TableCell>
                          <RadioGroup
                            value={attendanceData[student.id]?.status || "present"}
                            onValueChange={(v) => updateAttendance(student.id, "status", v)}
                            className="flex gap-4"
                          >
                            <div className="flex items-center space-x-1">
                              <RadioGroupItem value="present" id={`present-${student.id}`} />
                              <Label htmlFor={`present-${student.id}`} className="text-green-600 cursor-pointer">P</Label>
                            </div>
                            <div className="flex items-center space-x-1">
                              <RadioGroupItem value="absent" id={`absent-${student.id}`} />
                              <Label htmlFor={`absent-${student.id}`} className="text-destructive cursor-pointer">A</Label>
                            </div>
                            <div className="flex items-center space-x-1">
                              <RadioGroupItem value="late" id={`late-${student.id}`} />
                              <Label htmlFor={`late-${student.id}`} className="text-yellow-600 cursor-pointer">L</Label>
                            </div>
                            <div className="flex items-center space-x-1">
                              <RadioGroupItem value="excused" id={`excused-${student.id}`} />
                              <Label htmlFor={`excused-${student.id}`} className="text-blue-600 cursor-pointer">E</Label>
                            </div>
                          </RadioGroup>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={attendanceData[student.id]?.remarks || ""}
                            onChange={(e) => updateAttendance(student.id, "remarks", e.target.value)}
                            placeholder="Optional remarks"
                            className="max-w-xs"
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
