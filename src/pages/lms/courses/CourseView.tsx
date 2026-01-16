import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Award,
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
  Music,
  FileType,
  HelpCircle,
  ClipboardList,
  AlertTriangle,
} from 'lucide-react';
import QuizTaker from '@/components/lms/QuizTaker';
import ExamTaker from '@/components/lms/ExamTaker';
import CourseCertificate from '@/components/lms/CourseCertificate';
import OnlineClassList from '@/components/lms/OnlineClassList';
import { POEStudentView } from '@/components/lms/poe/POEStudentView';
import StudentResults from '@/components/lms/StudentResults';
import { FolderOpen, BarChart3 } from 'lucide-react';

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
  has_quiz?: boolean;
  quiz_passed?: boolean;
}

interface Enrollment {
  id: string;
  status: string;
  progress_percent: number;
  role: string;
}

interface Exam {
  id: string;
  title: string;
  description: string | null;
  time_limit_minutes: number | null;
  passing_score: number;
  max_attempts: number | null;
  is_published: boolean;
  user_attempts?: number;
  best_score?: number;
  passed?: boolean;
}

interface Certificate {
  id: string;
  certificate_number: string;
  issued_at: string;
  completion_date: string;
  final_score: number | null;
}

export default function CourseView() {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin, isTeacher } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [generatingCertificate, setGeneratingCertificate] = useState(false);
  const [activeResource, setActiveResource] = useState<Resource | null>(null);
  const [enrollmentCount, setEnrollmentCount] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [showCertificate, setShowCertificate] = useState(false);
  const [studentName, setStudentName] = useState('');

  useEffect(() => {
    if (id) {
      fetchCourseData();
    }
  }, [id, user]);

  const fetchCourseData = async () => {
    try {
      const { data: courseData, error: courseError } = await supabase
        .from('lms_courses')
        .select(`*, category:course_categories (id, name)`)
        .eq('id', id)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      const { count } = await supabase
        .from('lms_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', id);
      
      setEnrollmentCount(count || 0);

      if (user) {
        const { data: enrollmentData } = await supabase
          .from('lms_enrollments')
          .select('*')
          .eq('course_id', id)
          .eq('user_id', user.id)
          .single();

        setEnrollment(enrollmentData);
      }

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

          let resourcesWithProgress = resources || [];
          if (user) {
            const { data: progressData } = await supabase
              .from('resource_progress')
              .select('*')
              .eq('user_id', user.id)
              .in('resource_id', (resources || []).map((r) => r.id));

            resourcesWithProgress = await Promise.all(
              (resources || []).map(async (r) => {
                const { data: quiz } = await supabase
                  .from('lesson_quizzes')
                  .select('id')
                  .eq('resource_id', r.id)
                  .single();

                let quizPassed = false;
                if (quiz) {
                  const { data: attempt } = await supabase
                    .from('quiz_attempts')
                    .select('passed')
                    .eq('quiz_id', quiz.id)
                    .eq('user_id', user.id)
                    .eq('passed', true)
                    .limit(1)
                    .single();
                  quizPassed = !!attempt;
                }

                return {
                  ...r,
                  is_completed: progressData?.some((p) => p.resource_id === r.id && p.is_completed),
                  has_quiz: !!quiz,
                  quiz_passed: quizPassed,
                };
              })
            );
          }

          return { ...section, resources: resourcesWithProgress };
        })
      );

      setSections(sectionsWithResources);

      const { data: examsData } = await supabase
        .from('course_exams')
        .select('*')
        .eq('course_id', id)
        .eq('is_published', true);

      if (user && examsData) {
        const examsWithAttempts: Exam[] = await Promise.all(
          examsData.map(async (exam) => {
            const { data: attempts } = await supabase
              .from('exam_attempts')
              .select('score, passed')
              .eq('exam_id', exam.id)
              .eq('user_id', user.id);

            const userAttempts = attempts?.length || 0;
            const bestScore = attempts?.reduce((max, a) => Math.max(max, a.score || 0), 0) || 0;
            const passed = attempts?.some((a) => a.passed) || false;

            return { ...exam, user_attempts: userAttempts, best_score: bestScore, passed };
          })
        );
        setExams(examsWithAttempts);
      } else {
        setExams(examsData || []);
      }

      // Fetch certificate if exists
      if (user) {
        const { data: certData } = await supabase
          .from('course_certificates')
          .select('*')
          .eq('course_id', id)
          .eq('user_id', user.id)
          .maybeSingle();

        setCertificate(certData);

        // Fetch student name
        const { data: profileData } = await supabase
          .from('lms_profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .maybeSingle();

        setStudentName(profileData?.full_name || user.email || 'Student');
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      toast({ title: 'Error', description: 'Failed to load course', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!user) { navigate('/lms/auth'); return; }
    setEnrolling(true);
    try {
      const { data, error } = await supabase.from('lms_enrollments').insert({
        course_id: id, user_id: user.id, role: 'student', status: 'active',
      }).select().single();
      if (error) throw error;
      setEnrollment(data);
      toast({ title: 'Enrolled successfully!' });
    } catch (error) {
      console.error('Error enrolling:', error);
      toast({ title: 'Error', description: 'Failed to enroll', variant: 'destructive' });
    } finally {
      setEnrolling(false);
    }
  };

  const markResourceComplete = async (resourceId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('resource_progress').upsert(
        { user_id: user.id, resource_id: resourceId, is_completed: true, completed_at: new Date().toISOString() },
        { onConflict: 'user_id,resource_id' }
      );
      if (error) throw error;
      fetchCourseData();
      toast({ title: 'Progress saved!' });
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'audio': return <Music className="h-4 w-4" />;
      case 'document': case 'file': return <FileType className="h-4 w-4" />;
      case 'link': return <LinkIcon className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const canTakeExam = (exam: Exam) => {
    if (!exam.max_attempts) return true;
    return (exam.user_attempts || 0) < exam.max_attempts;
  };

  const totalLessons = sections.reduce((acc, s) => acc + s.resources.length, 0);
  const completedLessons = sections.reduce((acc, s) => acc + s.resources.filter(r => r.is_completed).length, 0);
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Check if course is complete (all lessons done and all exams passed)
  const allLessonsComplete = totalLessons > 0 && completedLessons === totalLessons;
  const allExamsPassed = exams.length === 0 || exams.every(e => e.passed);
  const courseComplete = allLessonsComplete && allExamsPassed;

  // Calculate average exam score for certificate
  const avgExamScore = exams.length > 0
    ? exams.reduce((acc, e) => acc + (e.best_score || 0), 0) / exams.length
    : 100;

  const generateCertificate = async () => {
    if (!user || !course || certificate) return;
    
    setGeneratingCertificate(true);
    try {
      // Generate certificate number
      const certNumber = `CERT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

      const { data, error } = await supabase
        .from('course_certificates')
        .insert({
          course_id: course.id,
          user_id: user.id,
          certificate_number: certNumber,
          final_score: avgExamScore,
          completion_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      setCertificate(data);
      setShowCertificate(true);
      toast({ title: 'Certificate generated!', description: 'You can now download your certificate.' });
    } catch (error) {
      console.error('Error generating certificate:', error);
      toast({ title: 'Error', description: 'Failed to generate certificate', variant: 'destructive' });
    } finally {
      setGeneratingCertificate(false);
    }
  };

  const isEnrolled = !!enrollment;
  const canEdit = isAdmin || (isTeacher && course?.created_by === user?.id);

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!course) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <BookOpen className="h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-lg">Course not found</p>
        <Button asChild className="mt-4"><Link to="/lms/catalog">Browse Courses</Link></Button>
      </div>
    );
  }

  if (activeExam && isEnrolled) {
    return (
      <div className="p-6">
        <ExamTaker
          examId={activeExam.id}
          onComplete={(passed, score) => {
            toast({
              title: passed ? 'Congratulations!' : 'Exam Completed',
              description: `You scored ${score}%. ${passed ? 'You passed!' : `You need ${activeExam.passing_score}% to pass.`}`,
              variant: passed ? 'default' : 'destructive',
            });
            setActiveExam(null);
            fetchCourseData();
          }}
          onClose={() => setActiveExam(null)}
        />
      </div>
    );
  }

  if (showQuiz && activeResource) {
    return (
      <div className="p-6">
        <QuizTaker
          resourceId={activeResource.id}
          onComplete={(passed) => {
            if (passed) fetchCourseData();
          }}
          onClose={() => setShowQuiz(false)}
        />
      </div>
    );
  }

  if (showCertificate && certificate && course) {
    return (
      <div className="p-6">
        <Button variant="ghost" className="mb-4" onClick={() => setShowCertificate(false)}>
          <ArrowLeft className="mr-2 h-4 w-4" />Back to Course
        </Button>
        <CourseCertificate
          studentName={studentName}
          courseName={course.title}
          completionDate={certificate.completion_date}
          certificateNumber={certificate.certificate_number}
          finalScore={certificate.final_score ?? undefined}
        />
      </div>
    );
  }

  if (activeResource && isEnrolled) {
    return (
      <div className="p-6">
        <Button variant="ghost" className="mb-4" onClick={() => setActiveResource(null)}>
          <ArrowLeft className="mr-2 h-4 w-4" />Back to Course
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{activeResource.title}</CardTitle>
                {activeResource.description && <CardDescription>{activeResource.description}</CardDescription>}
              </div>
              <div className="flex gap-2">
                {activeResource.has_quiz && (
                  <Button variant={activeResource.quiz_passed ? "outline" : "default"} onClick={() => setShowQuiz(true)}>
                    <HelpCircle className="mr-2 h-4 w-4" />
                    {activeResource.quiz_passed ? 'Retake Quiz' : 'Take Quiz'}
                  </Button>
                )}
                {!activeResource.is_completed && (
                  <Button onClick={() => markResourceComplete(activeResource.id)}>
                    <CheckCircle className="mr-2 h-4 w-4" />Mark Complete
                  </Button>
                )}
                {activeResource.is_completed && <Badge className="bg-green-500"><CheckCircle className="mr-1 h-3 w-3" />Completed</Badge>}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {activeResource.resource_type === 'text' && <div className="prose max-w-none"><p className="whitespace-pre-wrap">{activeResource.content_text}</p></div>}
            {activeResource.resource_type === 'video' && activeResource.content_url && (
              <div className="aspect-video"><video src={activeResource.content_url} controls className="h-full w-full rounded-lg" /></div>
            )}
            {activeResource.resource_type === 'audio' && activeResource.content_url && (
              <audio src={activeResource.content_url} controls className="w-full" />
            )}
            {activeResource.resource_type === 'embed' && activeResource.content_url && (
              <div className="aspect-video"><iframe src={activeResource.content_url} className="h-full w-full rounded-lg" allowFullScreen /></div>
            )}
            {activeResource.resource_type === 'document' && activeResource.content_url && (
              <div className="space-y-4">
                <iframe src={activeResource.content_url} className="h-[600px] w-full rounded-lg border" />
                <Button asChild><a href={activeResource.content_url} download><File className="mr-2 h-4 w-4" />Download</a></Button>
              </div>
            )}
            {activeResource.resource_type === 'link' && activeResource.content_url && (
              <Button asChild><a href={activeResource.content_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Open Link</a></Button>
            )}
            {activeResource.resource_type === 'file' && activeResource.content_url && (
              <Button asChild><a href={activeResource.content_url} download><File className="mr-2 h-4 w-4" />Download File</a></Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <div className="aspect-video bg-muted">
              {course.thumbnail_url ? <img src={course.thumbnail_url} alt={course.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><BookOpen className="h-16 w-16 text-muted-foreground/50" /></div>}
            </div>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  {course.category && <Badge variant="secondary" className="mb-2">{course.category.name}</Badge>}
                  <CardTitle className="text-2xl">{course.title}</CardTitle>
                </div>
                {canEdit && <Button asChild variant="outline"><Link to={`/lms/courses/${course.id}/edit`}>Edit Course</Link></Button>}
              </div>
              {course.short_description && <CardDescription className="text-base">{course.short_description}</CardDescription>}
            </CardHeader>
            {course.description && <CardContent><p className="whitespace-pre-wrap text-muted-foreground">{course.description}</p></CardContent>}
          </Card>

          <Tabs defaultValue="lessons" className="space-y-4">
            <TabsList className="flex-wrap">
              <TabsTrigger value="lessons">Lessons</TabsTrigger>
              <TabsTrigger value="exams">Exams & Assignments</TabsTrigger>
              <TabsTrigger value="poe">
                <FolderOpen className="mr-2 h-4 w-4" />
                POE
              </TabsTrigger>
              <TabsTrigger value="live-classes">
                <Video className="mr-2 h-4 w-4" />
                Live Classes
              </TabsTrigger>
              {isEnrolled && (
                <TabsTrigger value="results">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  My Results
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="lessons">
              <Card>
                <CardHeader>
                  <CardTitle>Course Content</CardTitle>
                  <CardDescription>{sections.length} sections • {totalLessons} lessons</CardDescription>
                </CardHeader>
                <CardContent>
                  {sections.length === 0 ? <p className="py-8 text-center text-muted-foreground">No content available yet</p> : (
                    <Accordion type="multiple" className="space-y-2">
                      {sections.map((section, index) => (
                        <AccordionItem key={section.id} value={section.id} className="rounded-lg border px-4">
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex flex-1 items-center gap-3">
                              <span className="font-semibold">{index + 1}. {section.title}</span>
                              <span className="ml-auto mr-4 text-sm text-muted-foreground">{section.resources.length} lessons</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pb-4">
                            <div className="space-y-2">
                              {section.resources.map((resource, rIndex) => (
                                <div key={resource.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${isEnrolled ? 'hover:bg-muted' : 'cursor-not-allowed opacity-60'}`} onClick={() => isEnrolled && setActiveResource(resource)}>
                                  <div className="rounded bg-primary/10 p-2">{isEnrolled ? getResourceIcon(resource.resource_type) : <Lock className="h-4 w-4" />}</div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium">{rIndex + 1}. {resource.title}</p>
                                      {resource.has_quiz && <Badge variant="outline" className="text-xs"><HelpCircle className="mr-1 h-3 w-3" />Quiz</Badge>}
                                    </div>
                                    <p className="text-xs capitalize text-muted-foreground">{resource.resource_type}</p>
                                  </div>
                                  {resource.is_completed && <CheckCircle className="h-5 w-5 text-green-500" />}
                                  {isEnrolled && !resource.is_completed && <Play className="h-5 w-5 text-muted-foreground" />}
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
            </TabsContent>

            <TabsContent value="exams">
              <Card>
                <CardHeader>
                  <CardTitle>Exams & Assignments</CardTitle>
                  <CardDescription>Complete these exams to demonstrate your understanding</CardDescription>
                </CardHeader>
                <CardContent>
                  {exams.length === 0 ? (
                    <p className="py-8 text-center text-muted-foreground">No exams available yet</p>
                  ) : (
                    <div className="space-y-4">
                      {exams.map((exam) => (
                        <div key={exam.id} className="flex items-center justify-between rounded-lg border p-4">
                          <div className="flex items-center gap-4">
                            <div className={`rounded-lg p-3 ${exam.passed ? 'bg-green-500/10' : 'bg-primary/10'}`}>
                              <ClipboardList className={`h-6 w-6 ${exam.passed ? 'text-green-500' : 'text-primary'}`} />
                            </div>
                            <div>
                              <h4 className="font-semibold">{exam.title}</h4>
                              {exam.description && <p className="text-sm text-muted-foreground">{exam.description}</p>}
                              <div className="mt-2 flex flex-wrap gap-2">
                                {exam.time_limit_minutes && (
                                  <Badge variant="outline"><Clock className="mr-1 h-3 w-3" />{exam.time_limit_minutes} min</Badge>
                                )}
                                <Badge variant="outline">Pass: {exam.passing_score}%</Badge>
                                {exam.max_attempts && (
                                  <Badge variant="outline">Attempts: {exam.user_attempts || 0}/{exam.max_attempts}</Badge>
                                )}
                                {exam.passed && (
                                  <Badge className="bg-green-500"><CheckCircle className="mr-1 h-3 w-3" />Passed ({exam.best_score}%)</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isEnrolled ? (
                              canTakeExam(exam) ? (
                                <Button onClick={() => setActiveExam(exam)}>
                                  <Play className="mr-2 h-4 w-4" />
                                  {exam.passed ? 'Retake' : 'Start Exam'}
                                </Button>
                              ) : (
                                <Badge variant="secondary">
                                  <AlertTriangle className="mr-1 h-3 w-3" />Max attempts reached
                                </Badge>
                              )
                            ) : (
                              <Badge variant="secondary"><Lock className="mr-1 h-3 w-3" />Enroll to take exam</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="poe">
              <Card>
                <CardHeader>
                  <CardTitle>Portfolio of Evidence</CardTitle>
                  <CardDescription>Submit your work and evidence for assessment</CardDescription>
                </CardHeader>
                <CardContent>
                  {isEnrolled ? (
                    <POEStudentView courseId={id!} />
                  ) : (
                    <p className="py-8 text-center text-muted-foreground">
                      Enroll in this course to submit your portfolio of evidence
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="live-classes">
              <Card>
                <CardHeader>
                  <CardTitle>Live Classes</CardTitle>
                  <CardDescription>Join scheduled online sessions with your instructor</CardDescription>
                </CardHeader>
                <CardContent>
                  <OnlineClassList courseId={id!} isEnrolled={isEnrolled} />
                </CardContent>
              </Card>
            </TabsContent>

            {isEnrolled && (
              <TabsContent value="results">
                <StudentResults courseId={id!} courseName={course.title} />
              </TabsContent>
            )}
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              {isEnrolled ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Your Progress</span><span className="font-bold">{progressPercent}%</span></div>
                  <Progress value={progressPercent} />
                  <p className="text-sm text-muted-foreground">{completedLessons} of {totalLessons} lessons completed</p>
                  
                  {/* Certificate section */}
                  {courseComplete && (
                    <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                        <Award className="h-5 w-5" />
                        <span className="font-semibold">Course Completed!</span>
                      </div>
                      {certificate ? (
                        <Button
                          className="mt-3 w-full"
                          variant="outline"
                          onClick={() => setShowCertificate(true)}
                        >
                          <Award className="mr-2 h-4 w-4" />
                          View Certificate
                        </Button>
                      ) : (
                        <Button
                          className="mt-3 w-full"
                          onClick={generateCertificate}
                          disabled={generatingCertificate}
                        >
                          {generatingCertificate && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          <Award className="mr-2 h-4 w-4" />
                          Get Certificate
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-center text-muted-foreground">Enroll to access all lessons</p>
                  <Button className="w-full" onClick={handleEnroll} disabled={enrolling}>{enrolling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enroll Now</Button>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{enrollmentCount} students enrolled</span></div>
              <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{totalLessons} lessons</span></div>
              {exams.length > 0 && <div className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{exams.length} exams</span></div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
