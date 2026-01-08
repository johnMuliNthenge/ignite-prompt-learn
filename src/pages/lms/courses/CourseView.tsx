import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  Lock,
  Play,
  Users,
  Video,
  Link as LinkIcon,
  File,
  ExternalLink,
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  short_description: string | null;
  description: string | null;
  thumbnail_url: string | null;
  enrollment_type: string;
  enrollment_key: string | null;
  created_by: string;
  status: string;
  category: { id: string; name: string } | null;
}

interface Section {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_visible: boolean;
  resources: Resource[];
}

interface Resource {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  content_url: string | null;
  content_text: string | null;
  sort_order: number;
  is_visible: boolean;
  is_completed?: boolean;
}

interface Enrollment {
  id: string;
  status: string;
  progress_percent: number;
  role: string;
}

export default function CourseView() {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin, isTeacher } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [activeResource, setActiveResource] = useState<Resource | null>(null);
  const [enrollmentCount, setEnrollmentCount] = useState(0);

  useEffect(() => {
    if (id) {
      fetchCourseData();
    }
  }, [id, user]);

  const fetchCourseData = async () => {
    try {
      // Fetch course
      const { data: courseData, error: courseError } = await supabase
        .from('lms_courses')
        .select(`
          *,
          category:course_categories (id, name)
        `)
        .eq('id', id)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      // Fetch enrollment count
      const { count } = await supabase
        .from('lms_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', id);
      
      setEnrollmentCount(count || 0);

      // Check user enrollment
      if (user) {
        const { data: enrollmentData } = await supabase
          .from('lms_enrollments')
          .select('*')
          .eq('course_id', id)
          .eq('user_id', user.id)
          .single();

        setEnrollment(enrollmentData);
      }

      // Fetch sections with resources
      const { data: sectionsData } = await supabase
        .from('course_sections')
        .select('*')
        .eq('course_id', id)
        .eq('is_visible', true)
        .order('sort_order');

      const sectionsWithResources: Section[] = await Promise.all(
        (sectionsData || []).map(async (section) => {
          const { data: resources } = await supabase
            .from('course_resources')
            .select('*')
            .eq('section_id', section.id)
            .eq('is_visible', true)
            .order('sort_order');

          // Get progress for each resource
          let resourcesWithProgress = resources || [];
          if (user) {
            const { data: progressData } = await supabase
              .from('resource_progress')
              .select('*')
              .eq('user_id', user.id)
              .in('resource_id', (resources || []).map((r) => r.id));

            resourcesWithProgress = (resources || []).map((r) => ({
              ...r,
              is_completed: progressData?.some(
                (p) => p.resource_id === r.id && p.is_completed
              ),
            }));
          }

          return { ...section, resources: resourcesWithProgress };
        })
      );

      setSections(sectionsWithResources);
    } catch (error) {
      console.error('Error fetching course:', error);
      toast({
        title: 'Error',
        description: 'Failed to load course',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!user) {
      navigate('/lms/auth');
      return;
    }

    setEnrolling(true);

    try {
      const { data, error } = await supabase.from('lms_enrollments').insert({
        course_id: id,
        user_id: user.id,
        role: 'student',
        status: 'active',
      }).select().single();

      if (error) throw error;

      setEnrollment(data);
      toast({ title: 'Enrolled successfully!' });
    } catch (error) {
      console.error('Error enrolling:', error);
      toast({
        title: 'Error',
        description: 'Failed to enroll in course',
        variant: 'destructive',
      });
    } finally {
      setEnrolling(false);
    }
  };

  const markResourceComplete = async (resourceId: string) => {
    if (!user) return;

    try {
      // Upsert progress
      const { error } = await supabase.from('resource_progress').upsert(
        {
          user_id: user.id,
          resource_id: resourceId,
          is_completed: true,
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,resource_id' }
      );

      if (error) throw error;

      // Refresh data
      fetchCourseData();
      toast({ title: 'Progress saved!' });
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'link':
        return <LinkIcon className="h-4 w-4" />;
      case 'file':
        return <File className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const isEnrolled = !!enrollment;
  const canEdit =
    isAdmin || (isTeacher && course?.created_by === user?.id);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <BookOpen className="h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-lg">Course not found</p>
        <Button asChild className="mt-4">
          <Link to="/lms/catalog">Browse Courses</Link>
        </Button>
      </div>
    );
  }

  // Show resource content view
  if (activeResource && isEnrolled) {
    return (
      <div className="p-6">
        <Button variant="ghost" className="mb-4" onClick={() => setActiveResource(null)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Course
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{activeResource.title}</CardTitle>
                {activeResource.description && (
                  <CardDescription>{activeResource.description}</CardDescription>
                )}
              </div>
              {!activeResource.is_completed && (
                <Button onClick={() => markResourceComplete(activeResource.id)}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark Complete
                </Button>
              )}
              {activeResource.is_completed && (
                <Badge className="bg-green-500">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Completed
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {activeResource.resource_type === 'text' && (
              <div className="prose max-w-none">
                <p className="whitespace-pre-wrap">{activeResource.content_text}</p>
              </div>
            )}

            {activeResource.resource_type === 'video' && activeResource.content_url && (
              <div className="aspect-video">
                <video
                  src={activeResource.content_url}
                  controls
                  className="h-full w-full rounded-lg"
                />
              </div>
            )}

            {activeResource.resource_type === 'embed' && activeResource.content_url && (
              <div className="aspect-video">
                <iframe
                  src={activeResource.content_url}
                  className="h-full w-full rounded-lg"
                  allowFullScreen
                />
              </div>
            )}

            {activeResource.resource_type === 'link' && activeResource.content_url && (
              <Button asChild>
                <a
                  href={activeResource.content_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Link
                </a>
              </Button>
            )}

            {activeResource.resource_type === 'file' && activeResource.content_url && (
              <Button asChild>
                <a href={activeResource.content_url} download>
                  <File className="mr-2 h-4 w-4" />
                  Download File
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Course Header */}
          <Card>
            <div className="aspect-video bg-muted">
              {course.thumbnail_url ? (
                <img
                  src={course.thumbnail_url}
                  alt={course.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <BookOpen className="h-16 w-16 text-muted-foreground/50" />
                </div>
              )}
            </div>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  {course.category && (
                    <Badge variant="secondary" className="mb-2">
                      {course.category.name}
                    </Badge>
                  )}
                  <CardTitle className="text-2xl">{course.title}</CardTitle>
                </div>
                {canEdit && (
                  <Button asChild variant="outline">
                    <Link to={`/lms/courses/${course.id}/edit`}>Edit Course</Link>
                  </Button>
                )}
              </div>
              {course.short_description && (
                <CardDescription className="text-base">
                  {course.short_description}
                </CardDescription>
              )}
            </CardHeader>
            {course.description && (
              <CardContent>
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {course.description}
                </p>
              </CardContent>
            )}
          </Card>

          {/* Course Content */}
          <Card>
            <CardHeader>
              <CardTitle>Course Content</CardTitle>
              <CardDescription>
                {sections.length} sections •{' '}
                {sections.reduce((acc, s) => acc + s.resources.length, 0)} lessons
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sections.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No content available yet
                </p>
              ) : (
                <Accordion type="multiple" className="space-y-2">
                  {sections.map((section, index) => (
                    <AccordionItem
                      key={section.id}
                      value={section.id}
                      className="rounded-lg border px-4"
                    >
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex flex-1 items-center gap-3">
                          <span className="font-semibold">
                            {index + 1}. {section.title}
                          </span>
                          <span className="ml-auto mr-4 text-sm text-muted-foreground">
                            {section.resources.length} lessons
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="space-y-2">
                          {section.resources.map((resource) => (
                            <div
                              key={resource.id}
                              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                                isEnrolled
                                  ? 'hover:bg-muted'
                                  : 'cursor-not-allowed opacity-60'
                              }`}
                              onClick={() =>
                                isEnrolled && setActiveResource(resource)
                              }
                            >
                              <div className="rounded bg-primary/10 p-2">
                                {isEnrolled ? (
                                  getResourceIcon(resource.resource_type)
                                ) : (
                                  <Lock className="h-4 w-4" />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">{resource.title}</p>
                                <p className="text-xs capitalize text-muted-foreground">
                                  {resource.resource_type}
                                </p>
                              </div>
                              {resource.is_completed && (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              )}
                              {isEnrolled && !resource.is_completed && (
                                <Play className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              {isEnrolled ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Your Progress
                    </span>
                    <span className="font-semibold">
                      {enrollment?.progress_percent || 0}%
                    </span>
                  </div>
                  <Progress value={enrollment?.progress_percent || 0} />
                  <Button asChild className="w-full">
                    <Link to={`/lms/courses/${course.id}`}>
                      Continue Learning
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Button
                    className="w-full"
                    onClick={handleEnroll}
                    disabled={enrolling || course.enrollment_type !== 'open'}
                  >
                    {enrolling ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {course.enrollment_type === 'open'
                      ? 'Enroll Now'
                      : 'Enrollment Restricted'}
                  </Button>
                  {course.enrollment_type !== 'open' && (
                    <p className="text-center text-sm text-muted-foreground">
                      This course requires{' '}
                      {course.enrollment_type === 'approval'
                        ? 'instructor approval'
                        : 'an enrollment key'}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-6 space-y-3 border-t pt-6">
                <div className="flex items-center gap-3 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{enrollmentCount} students enrolled</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span>{sections.length} sections</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {sections.reduce((acc, s) => acc + s.resources.length, 0)} lessons
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
