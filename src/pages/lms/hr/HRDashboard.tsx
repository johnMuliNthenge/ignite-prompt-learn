import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserCheck, CalendarDays, Clock, AlertTriangle, TrendingUp } from "lucide-react";

export default function HRDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['hr-dashboard-stats'],
    queryFn: async () => {
      const [employeesRes, activeRes, leaveRes, attendanceRes] = await Promise.all([
        supabase.from('hr_employees').select('id', { count: 'exact', head: true }),
        supabase.from('hr_employees').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('hr_leave_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('hr_attendance').select('id', { count: 'exact', head: true }).eq('attendance_date', new Date().toISOString().split('T')[0]),
      ]);
      
      return {
        totalEmployees: employeesRes.count || 0,
        activeEmployees: activeRes.count || 0,
        pendingLeaves: leaveRes.count || 0,
        todayAttendance: attendanceRes.count || 0,
      };
    }
  });

  const { data: recentEmployees } = useQuery({
    queryKey: ['recent-employees'],
    queryFn: async () => {
      const { data } = await supabase
        .from('hr_employees')
        .select('id, employee_no, first_name, last_name, date_of_hire, status')
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    }
  });

  const { data: pendingLeaves } = useQuery({
    queryKey: ['pending-leaves-dashboard'],
    queryFn: async () => {
      const { data } = await supabase
        .from('hr_leave_applications')
        .select(`
          id,
          start_date,
          end_date,
          days_requested,
          status,
          hr_employees!hr_leave_applications_employee_id_fkey(first_name, last_name),
          hr_leave_types(name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    }
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">HR Dashboard</h1>
        <p className="text-muted-foreground">Human Resource Management Overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalEmployees || 0}</div>
            <p className="text-xs text-muted-foreground">All registered employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeEmployees || 0}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Leaves</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingLeaves || 0}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's Attendance</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.todayAttendance || 0}</div>
            <p className="text-xs text-muted-foreground">Marked today</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Employees */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Employees</CardTitle>
            <CardDescription>Newly added employees</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentEmployees?.length === 0 ? (
                <p className="text-muted-foreground text-sm">No employees yet</p>
              ) : (
                recentEmployees?.map((emp: any) => (
                  <div key={emp.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{emp.first_name} {emp.last_name}</p>
                      <p className="text-sm text-muted-foreground">{emp.employee_no}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      emp.status === 'active' ? 'bg-green-100 text-green-800' :
                      emp.status === 'probation' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {emp.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Leave Applications */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Leave Requests</CardTitle>
            <CardDescription>Awaiting approval</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingLeaves?.length === 0 ? (
                <p className="text-muted-foreground text-sm">No pending requests</p>
              ) : (
                pendingLeaves?.map((leave: any) => (
                  <div key={leave.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {leave.hr_employees?.first_name} {leave.hr_employees?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {leave.hr_leave_types?.name} - {leave.days_requested} day(s)
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {leave.start_date}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
