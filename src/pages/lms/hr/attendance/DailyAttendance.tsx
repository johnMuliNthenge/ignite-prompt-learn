import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Save } from "lucide-react";

export default function DailyAttendance() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState<Record<string, { status: string; check_in: string; check_out: string; remarks: string }>>({});

  const { data: employees } = useQuery({
    queryKey: ['hr-employees-attendance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_employees')
        .select('id, employee_no, first_name, last_name, hr_departments(name)')
        .eq('status', 'active')
        .order('first_name');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: existingAttendance } = useQuery({
    queryKey: ['hr-attendance', selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_attendance')
        .select('*')
        .eq('attendance_date', selectedDate);
      if (error) throw error;
      
      const attendanceMap: Record<string, any> = {};
      data?.forEach((att: any) => {
        attendanceMap[att.employee_id] = att;
      });
      return attendanceMap;
    },
    enabled: !!selectedDate
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(attendanceData).map(([employeeId, data]) => ({
        employee_id: employeeId,
        attendance_date: selectedDate,
        status: data.status,
        check_in: data.check_in ? `${selectedDate}T${data.check_in}:00` : null,
        check_out: data.check_out ? `${selectedDate}T${data.check_out}:00` : null,
        remarks: data.remarks || null,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('hr_attendance')
          .upsert(update, { onConflict: 'employee_id,attendance_date' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Attendance saved successfully" });
      queryClient.invalidateQueries({ queryKey: ['hr-attendance'] });
    },
    onError: (error: any) => {
      toast({ title: "Error saving attendance", description: error.message, variant: "destructive" });
    }
  });

  const updateAttendance = (employeeId: string, field: string, value: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [field]: value,
      }
    }));
  };

  const getStatus = (employeeId: string) => {
    return attendanceData[employeeId]?.status || 
           existingAttendance?.[employeeId]?.status || 
           'present';
  };

  const getCheckIn = (employeeId: string) => {
    return attendanceData[employeeId]?.check_in ||
           (existingAttendance?.[employeeId]?.check_in ? 
             new Date(existingAttendance[employeeId].check_in).toTimeString().slice(0, 5) : '');
  };

  const getCheckOut = (employeeId: string) => {
    return attendanceData[employeeId]?.check_out ||
           (existingAttendance?.[employeeId]?.check_out ? 
             new Date(existingAttendance[employeeId].check_out).toTimeString().slice(0, 5) : '');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Daily Attendance</h1>
          <p className="text-muted-foreground">Mark employee attendance for a specific date</p>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="mr-2 h-4 w-4" />
          {saveMutation.isPending ? 'Saving...' : 'Save Attendance'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-[200px]"
            />
          </div>
        </CardHeader>
        <CardContent>
          {employees?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No active employees found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees?.map((emp: any) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.employee_no}</TableCell>
                    <TableCell>{emp.first_name} {emp.last_name}</TableCell>
                    <TableCell>{emp.hr_departments?.name || '-'}</TableCell>
                    <TableCell>
                      <Select
                        value={getStatus(emp.id)}
                        onValueChange={(v) => updateAttendance(emp.id, 'status', v)}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="present">Present</SelectItem>
                          <SelectItem value="absent">Absent</SelectItem>
                          <SelectItem value="late">Late</SelectItem>
                          <SelectItem value="half_day">Half Day</SelectItem>
                          <SelectItem value="on_leave">On Leave</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="time"
                        value={getCheckIn(emp.id)}
                        onChange={(e) => updateAttendance(emp.id, 'check_in', e.target.value)}
                        className="w-[120px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="time"
                        value={getCheckOut(emp.id)}
                        onChange={(e) => updateAttendance(emp.id, 'check_out', e.target.value)}
                        className="w-[120px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={attendanceData[emp.id]?.remarks || existingAttendance?.[emp.id]?.remarks || ''}
                        onChange={(e) => updateAttendance(emp.id, 'remarks', e.target.value)}
                        placeholder="Notes..."
                        className="w-[150px]"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
