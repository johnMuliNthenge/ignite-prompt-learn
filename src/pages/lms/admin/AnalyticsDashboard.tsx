import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  BookOpen,
  GraduationCap,
  TrendingUp,
  UserCheck,
  Clock,
  Loader2,
  BarChart3,
} from 'lucide-react';
import { ProtectedPage } from '@/components/auth/ProtectedPage';

const MODULE_CODE = 'admin.analytics';

interface AnalyticsData {
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  activeEnrollments: number;
  publishedCourses: number;
  adminCount: number;
  teacherCount: number;
  studentCount: number;
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch total users
      const { count: userCount } = await supabase
        .from('lms_profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch total courses
      const { count: courseCount } = await supabase
        .from('lms_courses')
        .select('*', { count: 'exact', head: true });

      // Fetch published courses
      const { count: publishedCount } = await supabase
        .from('lms_courses')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published');

      // Fetch total enrollments
      const { count: enrollmentCount } = await supabase
        .from('lms_enrollments')
        .select('*', { count: 'exact', head: true });

      // Fetch active enrollments
      const { count: activeCount } = await supabase
        .from('lms_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Fetch role counts
      const { data: roles } = await supabase.from('user_roles').select('role');

      const adminCount = roles?.filter((r) => r.role === 'admin').length || 0;
      const teacherCount = roles?.filter((r) => r.role === 'teacher').length || 0;
      const studentCount = roles?.filter((r) => r.role === 'student').length || 0;

      setData({
        totalUsers: userCount || 0,
        totalCourses: courseCount || 0,
        totalEnrollments: enrollmentCount || 0,
        activeEnrollments: activeCount || 0,
        publishedCourses: publishedCount || 0,
        adminCount,
        teacherCount,
        studentCount,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ProtectedPage moduleCode={MODULE_CODE} title="Analytics Dashboard">
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Overview of your learning platform metrics
        </p>
      </div>

      {/* Main Stats */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalUsers}</div>
            <p className="text-xs text-muted-foreground">registered accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalCourses}</div>
            <p className="text-xs text-muted-foreground">
              {data?.publishedCourses} published
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalEnrollments}</div>
            <p className="text-xs text-muted-foreground">
              {data?.activeEnrollments} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.totalEnrollments
                ? Math.round(
                    ((data.totalEnrollments - data.activeEnrollments) /
                      data.totalEnrollments) *
                      100
                  )
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">courses completed</p>
          </CardContent>
        </Card>
      </div>

      {/* User Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User Distribution</CardTitle>
            <CardDescription>Breakdown of users by role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-destructive" />
                  <span>Administrators</span>
                </div>
                <span className="font-semibold">{data?.adminCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-primary" />
                  <span>Teachers</span>
                </div>
                <span className="font-semibold">{data?.teacherCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span>Students</span>
                </div>
                <span className="font-semibold">{data?.studentCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Platform overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserCheck className="h-5 w-5 text-muted-foreground" />
                  <span>Active Students</span>
                </div>
                <span className="font-semibold">{data?.activeEnrollments}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                  <span>Published Courses</span>
                </div>
                <span className="font-semibold">{data?.publishedCourses}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <span>Avg. Enrollment per Course</span>
                </div>
                <span className="font-semibold">
                  {data?.totalCourses
                    ? (data.totalEnrollments / data.totalCourses).toFixed(1)
                    : 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </ProtectedPage>
  );
}
