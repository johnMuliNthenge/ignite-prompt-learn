import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Loader2, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Course {
  id: string;
  title: string;
  short_description: string | null;
  status: string;
  created_at: string;
  enrollments_count: number;
}

export default function InstructorCourses() {
  const { user, isAdmin, isTeacher } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin && !isTeacher) {
      navigate('/lms/dashboard');
      return;
    }
    fetchCourses();
  }, [isAdmin, isTeacher, navigate]);

  const fetchCourses = async () => {
    try {
      let query = supabase
        .from('lms_courses')
        .select('*')
        .order('created_at', { ascending: false });

      // If not admin, only show their own courses
      if (!isAdmin) {
        query = query.eq('created_by', user?.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get enrollment counts
      const coursesWithCounts = await Promise.all(
        (data || []).map(async (course) => {
          const { count } = await supabase
            .from('lms_enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', course.id);

          return { ...course, enrollments_count: count || 0 };
        })
      );

      setCourses(coursesWithCounts);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteCourse = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase.from('lms_courses').delete().eq('id', id);

      if (error) throw error;

      toast({ title: 'Course deleted' });
      fetchCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete course',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'published':
        return 'default';
      case 'archived':
        return 'secondary';
      default:
        return 'outline';
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Created Courses</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your courses and content
          </p>
        </div>
        <Button asChild>
          <Link to="/lms/courses/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Course
          </Link>
        </Button>
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No courses yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your first course to start teaching
            </p>
            <Button asChild className="mt-4">
              <Link to="/lms/courses/create">
                <Plus className="mr-2 h-4 w-4" />
                Create Course
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {courses.map((course) => (
            <Card key={course.id}>
              <CardContent className="flex items-center gap-6 p-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
                  <BookOpen className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{course.title}</h3>
                    <Badge variant={getStatusBadgeVariant(course.status)}>
                      {course.status}
                    </Badge>
                  </div>
                  {course.short_description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {course.short_description}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {course.enrollments_count} students
                    </span>
                    <span>
                      Created {new Date(course.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/lms/courses/${course.id}/edit`}>
                      <Pencil className="mr-1 h-4 w-4" />
                      Edit
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/lms/courses/${course.id}`}>View</Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteCourse(course.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
