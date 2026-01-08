import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, GraduationCap, Loader2 } from 'lucide-react';

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

export default function MyCourses() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchEnrollments();
    }
  }, [user]);

  const fetchEnrollments = async () => {
    try {
      const { data, error } = await supabase
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
        .eq('user_id', user?.id)
        .eq('role', 'student')
        .order('enrolled_at', { ascending: false });

      if (error) throw error;

      // Type assertion
      const formattedEnrollments = (data || []).map((e: any) => ({
        ...e,
        course: e.course || { id: e.course_id, title: 'Unknown Course', short_description: null, thumbnail_url: null }
      }));

      setEnrollments(formattedEnrollments);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeEnrollments = enrollments.filter((e) => e.status === 'active');
  const completedEnrollments = enrollments.filter((e) => e.status === 'completed');

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Courses</h1>
        <p className="mt-1 text-muted-foreground">
          View and continue your enrolled courses
        </p>
      </div>

      <Tabs defaultValue="active">
        <TabsList className="mb-6">
          <TabsTrigger value="active">
            In Progress ({activeEnrollments.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedEnrollments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {activeEnrollments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <GraduationCap className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No courses in progress</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Enroll in a course to start learning
                </p>
                <Button asChild className="mt-4">
                  <Link to="/lms/catalog">Browse Courses</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {activeEnrollments.map((enrollment) => (
                <Card key={enrollment.id} className="overflow-hidden">
                  <div className="aspect-video bg-muted">
                    {enrollment.course?.thumbnail_url ? (
                      <img
                        src={enrollment.course.thumbnail_url}
                        alt={enrollment.course.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <BookOpen className="h-12 w-12 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  <CardHeader>
                    <CardTitle className="line-clamp-2">
                      {enrollment.course?.title}
                    </CardTitle>
                    {enrollment.course?.short_description && (
                      <CardDescription className="line-clamp-2">
                        {enrollment.course.short_description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{enrollment.progress_percent}%</span>
                      </div>
                      <Progress value={enrollment.progress_percent} />
                    </div>
                    <Button asChild className="w-full">
                      <Link to={`/lms/courses/${enrollment.course_id}`}>
                        Continue Learning
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed">
          {completedEnrollments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <GraduationCap className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No completed courses</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Complete your first course to see it here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {completedEnrollments.map((enrollment) => (
                <Card key={enrollment.id} className="overflow-hidden">
                  <div className="aspect-video bg-muted">
                    {enrollment.course?.thumbnail_url ? (
                      <img
                        src={enrollment.course.thumbnail_url}
                        alt={enrollment.course.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <BookOpen className="h-12 w-12 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="line-clamp-2">
                        {enrollment.course?.title}
                      </CardTitle>
                      <Badge className="bg-green-500">Completed</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button asChild variant="outline" className="w-full">
                      <Link to={`/lms/courses/${enrollment.course_id}`}>
                        Review Course
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
