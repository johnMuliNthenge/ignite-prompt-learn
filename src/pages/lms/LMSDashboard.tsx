import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Clock,
  Trophy,
  TrendingUp,
  Users,
  GraduationCap,
  ArrowRight,
  Loader2,
} from 'lucide-react';

interface Enrollment {
  id: string;
  course_id: string;
  progress_percent: number;
  status: string;
  enrolled_at: string;
  course: {
    id: string;
    title: string;
    short_description: string | null;
    thumbnail_url: string | null;
  };
}

interface Stats {
  totalCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  totalStudents?: number;
  createdCourses?: number;
}

export default function LMSDashboard() {
  const { profile, role, appRole, isAdmin, isTeacher } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalCourses: 0,
    completedCourses: 0,
    inProgressCourses: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch enrollments with course info
      const { data: enrollmentData } = await supabase
        .from('lms_enrollments')
        .select(`
          id,
          course_id,
          progress_percent,
          status,
          enrolled_at,
          course:lms_courses (
            id,
            title,
            short_description,
            thumbnail_url
          )
        `)
        .eq('role', 'student')
        .order('enrolled_at', { ascending: false })
        .limit(5);

      if (enrollmentData) {
        // Type assertion to handle the nested course object
        const formattedEnrollments = enrollmentData.map((e: any) => ({
          ...e,
          course: e.course || { id: e.course_id, title: 'Unknown Course', short_description: null, thumbnail_url: null }
        }));
        setEnrollments(formattedEnrollments);

        // Calculate stats
        const total = enrollmentData.length;
        const completed = enrollmentData.filter((e: any) => e.status === 'completed').length;
        const inProgress = enrollmentData.filter((e: any) => e.status === 'active').length;

        setStats((prev) => ({
          ...prev,
          totalCourses: total,
          completedCourses: completed,
          inProgressCourses: inProgress,
        }));
      }

      // Admin/Teacher stats
      if (isAdmin || isTeacher) {
        const { count: studentCount } = await supabase
          .from('lms_profiles')
          .select('*', { count: 'exact', head: true });

        const { count: courseCount } = await supabase
          .from('lms_courses')
          .select('*', { count: 'exact', head: true });

        setStats((prev) => ({
          ...prev,
          totalStudents: studentCount || 0,
          createdCourses: courseCount || 0,
        }));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Welcome back, {profile?.full_name?.split(' ')[0] || 'Learner'}!
            </h1>
            <p className="mt-1 text-muted-foreground">
              {isAdmin
                ? 'Manage your learning platform'
                : isTeacher
                ? 'Create and manage your courses'
                : 'Continue your learning journey'}
            </p>
          </div>
          {appRole && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="px-3 py-1 text-sm font-medium">
                Role: {appRole.name}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Enrolled Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCourses}</div>
            <p className="text-xs text-muted-foreground">
              {stats.inProgressCourses} in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedCourses}</div>
            <p className="text-xs text-muted-foreground">courses finished</p>
          </CardContent>
        </Card>

        {(isAdmin || isTeacher) && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalStudents || 0}</div>
                <p className="text-xs text-muted-foreground">registered users</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Created Courses</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.createdCourses || 0}</div>
                <p className="text-xs text-muted-foreground">total courses</p>
              </CardContent>
            </Card>
          </>
        )}

        {!isAdmin && !isTeacher && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Learning Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0h</div>
                <p className="text-xs text-muted-foreground">this week</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Progress</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.totalCourses > 0
                    ? Math.round((stats.completedCourses / stats.totalCourses) * 100)
                    : 0}
                  %
                </div>
                <p className="text-xs text-muted-foreground">completion rate</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link to="/lms/catalog">
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-primary/10 p-3">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Browse Courses</h3>
                <p className="text-sm text-muted-foreground">
                  Explore our course catalog
                </p>
              </div>
              <ArrowRight className="ml-auto h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        {(isAdmin || isTeacher) && (
          <Link to="/lms/courses/create">
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-green-500/10 p-3">
                  <GraduationCap className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Create Course</h3>
                  <p className="text-sm text-muted-foreground">
                    Build a new learning experience
                  </p>
                </div>
                <ArrowRight className="ml-auto h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        )}

        {isAdmin && (
          <Link to="/lms/admin/users">
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-blue-500/10 p-3">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Manage Users</h3>
                  <p className="text-sm text-muted-foreground">
                    User administration
                  </p>
                </div>
                <ArrowRight className="ml-auto h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {/* Recent Enrollments */}
      <Card>
        <CardHeader>
          <CardTitle>Continue Learning</CardTitle>
          <CardDescription>Pick up where you left off</CardDescription>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <div className="py-8 text-center">
              <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No courses yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Start your learning journey by enrolling in a course
              </p>
              <Button asChild className="mt-4">
                <Link to="/lms/catalog">Browse Courses</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {enrollments.map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="flex items-center gap-4 rounded-lg border p-4"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
                    <BookOpen className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{enrollment.course?.title}</h4>
                    <div className="mt-2 flex items-center gap-4">
                      <Progress value={enrollment.progress_percent} className="h-2 flex-1" />
                      <span className="text-sm text-muted-foreground">
                        {enrollment.progress_percent}%
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant={enrollment.status === 'completed' ? 'default' : 'secondary'}
                  >
                    {enrollment.status}
                  </Badge>
                  <Button asChild size="sm">
                    <Link to={`/lms/courses/${enrollment.course_id}`}>Continue</Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
