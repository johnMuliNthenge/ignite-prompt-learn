import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Download,
  UserCheck,
  UserX,
  Clock,
  AlertCircle,
  Search,
  CheckCircle,
} from 'lucide-react';
import { format } from 'date-fns';

interface EnrolledStudent {
  user_id: string;
  profile: {
    full_name: string | null;
    email: string;
  } | null;
}

interface AttendanceRecord {
  id: string;
  user_id: string;
  status: string;
  marked_at: string;
  notes: string | null;
}

interface AttendanceManagerProps {
  classId: string;
  courseId: string;
}

export default function AttendanceManager({ classId, courseId }: AttendanceManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, [classId, courseId]);

  const fetchData = async () => {
    try {
      // Fetch enrolled students
      const { data: enrollments, error: enrollError } = await supabase
        .from('lms_enrollments')
        .select('user_id')
        .eq('course_id', courseId)
        .eq('status', 'active')
        .eq('role', 'student');

      if (enrollError) throw enrollError;

      // Fetch profiles for enrolled students
      const userIds = enrollments?.map((e) => e.user_id) || [];
      const { data: profiles, error: profileError } = await supabase
        .from('lms_profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      if (profileError) throw profileError;

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]));
      const studentsWithProfiles: EnrolledStudent[] = enrollments?.map((e) => ({
        user_id: e.user_id,
        profile: profileMap.get(e.user_id) || null,
      })) || [];

      setStudents(studentsWithProfiles);

      // Fetch existing attendance
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('class_attendance')
        .select('*')
        .eq('class_id', classId);

      if (attendanceError) throw attendanceError;

      const attendanceMap: Record<string, AttendanceRecord> = {};
      attendanceData?.forEach((a) => {
        attendanceMap[a.user_id] = a;
      });
      setAttendance(attendanceMap);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load attendance data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAttendance = async (userId: string, status: string) => {
    setSaving(true);
    try {
      const existingRecord = attendance[userId];

      if (existingRecord) {
        const { error } = await supabase
          .from('class_attendance')
          .update({
            status,
            marked_at: new Date().toISOString(),
            marked_by: user?.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingRecord.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('class_attendance')
          .insert({
            class_id: classId,
            user_id: userId,
            status,
            marked_by: user?.id,
          })
          .select()
          .single();

        if (error) throw error;
        
        setAttendance((prev) => ({
          ...prev,
          [userId]: data,
        }));
        return;
      }

      setAttendance((prev) => ({
        ...prev,
        [userId]: {
          ...prev[userId],
          status,
          marked_at: new Date().toISOString(),
        },
      }));
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast({
        title: 'Error',
        description: 'Failed to update attendance',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const markAllPresent = async () => {
    setSaving(true);
    try {
      for (const student of students) {
        await updateAttendance(student.user_id, 'present');
      }
      toast({ title: 'All students marked present' });
      fetchData();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSaving(false);
    }
  };

  const downloadAttendance = () => {
    const headers = ['Student Name', 'Email', 'Status', 'Marked At'];
    const rows = students.map((student) => {
      const record = attendance[student.user_id];
      return [
        student.profile?.full_name || 'Unknown',
        student.profile?.email || 'N/A',
        record?.status || 'Not Marked',
        record?.marked_at ? format(new Date(record.marked_at), 'PPpp') : 'N/A',
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `attendance_${classId}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    toast({ title: 'Attendance downloaded' });
  };

  const getStatusIcon = (status: string | undefined) => {
    switch (status) {
      case 'present':
        return <UserCheck className="h-4 w-4 text-green-500" />;
      case 'absent':
        return <UserX className="h-4 w-4 text-red-500" />;
      case 'late':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'excused':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string | undefined) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      present: 'default',
      absent: 'destructive',
      late: 'secondary',
      excused: 'outline',
    };
    if (!status) return <Badge variant="outline">Not Marked</Badge>;
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const filteredStudents = students.filter((student) => {
    const name = student.profile?.full_name?.toLowerCase() || '';
    const email = student.profile?.email?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  const attendanceStats = {
    present: students.filter((s) => attendance[s.user_id]?.status === 'present').length,
    absent: students.filter((s) => attendance[s.user_id]?.status === 'absent').length,
    late: students.filter((s) => attendance[s.user_id]?.status === 'late').length,
    excused: students.filter((s) => attendance[s.user_id]?.status === 'excused').length,
    notMarked: students.filter((s) => !attendance[s.user_id]).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">No students enrolled in this course</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-5 gap-2">
        <div className="flex items-center gap-2 rounded-lg border bg-green-500/10 p-2">
          <UserCheck className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium">{attendanceStats.present} Present</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-red-500/10 p-2">
          <UserX className="h-4 w-4 text-red-500" />
          <span className="text-sm font-medium">{attendanceStats.absent} Absent</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-yellow-500/10 p-2">
          <Clock className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-medium">{attendanceStats.late} Late</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-blue-500/10 p-2">
          <AlertCircle className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium">{attendanceStats.excused} Excused</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border p-2">
          <span className="text-sm font-medium">{attendanceStats.notMarked} Not Marked</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={markAllPresent} disabled={saving}>
          <CheckCircle className="mr-2 h-4 w-4" />
          Mark All Present
        </Button>
        <Button variant="outline" onClick={downloadAttendance}>
          <Download className="mr-2 h-4 w-4" />
          Download CSV
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Marked At</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.map((student) => {
              const record = attendance[student.user_id];
              return (
                <TableRow key={student.user_id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(record?.status)}
                      {student.profile?.full_name || 'Unknown'}
                    </div>
                  </TableCell>
                  <TableCell>{student.profile?.email || 'N/A'}</TableCell>
                  <TableCell>{getStatusBadge(record?.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {record?.marked_at
                      ? format(new Date(record.marked_at), 'p')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={record?.status || ''}
                      onValueChange={(value) => updateAttendance(student.user_id, value)}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue placeholder="Mark" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                        <SelectItem value="late">Late</SelectItem>
                        <SelectItem value="excused">Excused</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
