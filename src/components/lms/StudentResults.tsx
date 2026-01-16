import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Award,
  CheckCircle,
  XCircle,
  Printer,
  Loader2,
  FileText,
  ClipboardList,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';

interface StudentResultsProps {
  courseId: string;
  courseName: string;
}

interface QuizResult {
  id: string;
  quiz_id: string;
  quiz_title: string;
  resource_title: string;
  score: number;
  passed: boolean;
  completed_at: string;
  passing_score: number;
}

interface ExamResult {
  id: string;
  exam_id: string;
  exam_title: string;
  score: number;
  passed: boolean;
  completed_at: string;
  passing_score: number;
  time_limit_minutes: number | null;
}

interface POEResult {
  id: string;
  assignment_title: string;
  status: string;
  score: number | null;
  grade_label: string | null;
  max_score: number;
  submitted_at: string | null;
  reviewed_at: string | null;
  feedback: string | null;
}

export default function StudentResults({ courseId, courseName }: StudentResultsProps) {
  const { user } = useAuth();
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [poeResults, setPoeResults] = useState<POEResult[]>([]);
  const [studentName, setStudentName] = useState('');
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && courseId) {
      fetchResults();
    }
  }, [user, courseId]);

  const fetchResults = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch student profile
      const { data: profile } = await supabase
        .from('lms_profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .maybeSingle();

      setStudentName(profile?.full_name || user.email || 'Student');

      // Fetch quiz results for this course
      const { data: sections } = await supabase
        .from('course_sections')
        .select('id')
        .eq('course_id', courseId);

      if (sections && sections.length > 0) {
        const sectionIds = sections.map(s => s.id);
        
        const { data: resources } = await supabase
          .from('course_resources')
          .select('id, title')
          .in('section_id', sectionIds);

        if (resources && resources.length > 0) {
          const resourceIds = resources.map(r => r.id);
          
          const { data: quizzes } = await supabase
            .from('lesson_quizzes')
            .select('id, title, passing_score, resource_id')
            .in('resource_id', resourceIds);

          if (quizzes && quizzes.length > 0) {
            const quizIds = quizzes.map(q => q.id);
            
            const { data: attempts } = await supabase
              .from('quiz_attempts')
              .select('id, quiz_id, score, passed, completed_at')
              .in('quiz_id', quizIds)
              .eq('user_id', user.id)
              .not('completed_at', 'is', null)
              .order('completed_at', { ascending: false });

            if (attempts) {
              const quizResultsData: QuizResult[] = attempts.map(attempt => {
                const quiz = quizzes.find(q => q.id === attempt.quiz_id);
                const resource = resources.find(r => r.id === quiz?.resource_id);
                return {
                  id: attempt.id,
                  quiz_id: attempt.quiz_id,
                  quiz_title: quiz?.title || 'Unknown Quiz',
                  resource_title: resource?.title || 'Unknown Lesson',
                  score: attempt.score,
                  passed: attempt.passed,
                  completed_at: attempt.completed_at || '',
                  passing_score: quiz?.passing_score || 70,
                };
              });
              setQuizResults(quizResultsData);
            }
          }
        }
      }

      // Fetch exam results
      const { data: exams } = await supabase
        .from('course_exams')
        .select('id, title, passing_score, time_limit_minutes')
        .eq('course_id', courseId);

      if (exams && exams.length > 0) {
        const examIds = exams.map(e => e.id);
        
        const { data: examAttempts } = await supabase
          .from('exam_attempts')
          .select('id, exam_id, score, passed, completed_at')
          .in('exam_id', examIds)
          .eq('user_id', user.id)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false });

        if (examAttempts) {
          const examResultsData: ExamResult[] = examAttempts.map(attempt => {
            const exam = exams.find(e => e.id === attempt.exam_id);
            return {
              id: attempt.id,
              exam_id: attempt.exam_id,
              exam_title: exam?.title || 'Unknown Exam',
              score: attempt.score || 0,
              passed: attempt.passed || false,
              completed_at: attempt.completed_at || '',
              passing_score: exam?.passing_score || 70,
              time_limit_minutes: exam?.time_limit_minutes || null,
            };
          });
          setExamResults(examResultsData);
        }
      }

      // Fetch POE results
      const { data: assignments } = await supabase
        .from('poe_assignments')
        .select('id, title, max_score')
        .eq('course_id', courseId);

      if (assignments && assignments.length > 0) {
        const assignmentIds = assignments.map(a => a.id);
        
        const { data: submissions } = await supabase
          .from('poe_submissions')
          .select('id, assignment_id, status, score, grade_label, submitted_at, reviewed_at, feedback')
          .in('assignment_id', assignmentIds)
          .eq('user_id', user.id);

        if (submissions) {
          const poeResultsData: POEResult[] = submissions.map(sub => {
            const assignment = assignments.find(a => a.id === sub.assignment_id);
            return {
              id: sub.id,
              assignment_title: assignment?.title || 'Unknown Assignment',
              status: sub.status,
              score: sub.score,
              grade_label: sub.grade_label,
              max_score: assignment?.max_score || 100,
              submitted_at: sub.submitted_at,
              reviewed_at: sub.reviewed_at,
              feedback: sub.feedback,
            };
          });
          setPoeResults(poeResultsData);
        }
      }
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student Results - ${courseName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .header h1 { margin: 0; color: #333; }
            .header p { margin: 5px 0; color: #666; }
            .section { margin-bottom: 30px; }
            .section h2 { color: #444; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .passed { color: green; font-weight: bold; }
            .failed { color: red; font-weight: bold; }
            .summary { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 20px; }
            .summary-item { display: inline-block; margin-right: 30px; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #999; }
            @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Student Academic Report</h1>
            <p><strong>Course:</strong> ${courseName}</p>
            <p><strong>Student:</strong> ${studentName}</p>
            <p><strong>Generated:</strong> ${format(new Date(), 'PPP p')}</p>
          </div>

          ${quizResults.length > 0 ? `
            <div class="section">
              <h2>Quiz Results</h2>
              <table>
                <thead>
                  <tr>
                    <th>Quiz</th>
                    <th>Lesson</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  ${quizResults.map(q => `
                    <tr>
                      <td>${q.quiz_title}</td>
                      <td>${q.resource_title}</td>
                      <td>${q.score}% (Pass: ${q.passing_score}%)</td>
                      <td class="${q.passed ? 'passed' : 'failed'}">${q.passed ? 'PASSED' : 'FAILED'}</td>
                      <td>${q.completed_at ? format(new Date(q.completed_at), 'PP') : '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          ${examResults.length > 0 ? `
            <div class="section">
              <h2>Exam Results</h2>
              <table>
                <thead>
                  <tr>
                    <th>Exam</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  ${examResults.map(e => `
                    <tr>
                      <td>${e.exam_title}</td>
                      <td>${e.score}% (Pass: ${e.passing_score}%)</td>
                      <td class="${e.passed ? 'passed' : 'failed'}">${e.passed ? 'PASSED' : 'FAILED'}</td>
                      <td>${e.completed_at ? format(new Date(e.completed_at), 'PP') : '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          ${poeResults.length > 0 ? `
            <div class="section">
              <h2>POE (Portfolio of Evidence) Results</h2>
              <table>
                <thead>
                  <tr>
                    <th>Assignment</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Grade</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  ${poeResults.map(p => `
                    <tr>
                      <td>${p.assignment_title}</td>
                      <td>${p.status.toUpperCase()}</td>
                      <td>${p.score !== null ? `${p.score}/${p.max_score}` : '-'}</td>
                      <td>${p.grade_label || '-'}</td>
                      <td>${p.submitted_at ? format(new Date(p.submitted_at), 'PP') : '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          <div class="summary">
            <h3>Summary</h3>
            <div class="summary-item"><strong>Total Quizzes:</strong> ${quizResults.length}</div>
            <div class="summary-item"><strong>Quizzes Passed:</strong> ${quizResults.filter(q => q.passed).length}</div>
            <div class="summary-item"><strong>Total Exams:</strong> ${examResults.length}</div>
            <div class="summary-item"><strong>Exams Passed:</strong> ${examResults.filter(e => e.passed).length}</div>
            <div class="summary-item"><strong>POE Submissions:</strong> ${poeResults.length}</div>
            <div class="summary-item"><strong>POE Graded:</strong> ${poeResults.filter(p => p.status === 'graded').length}</div>
          </div>

          <div class="footer">
            <p>This is an official academic record generated by the Learning Management System.</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
  };

  // Calculate statistics
  const quizzesPassed = quizResults.filter(q => q.passed).length;
  const examsPassed = examResults.filter(e => e.passed).length;
  const avgQuizScore = quizResults.length > 0 
    ? Math.round(quizResults.reduce((acc, q) => acc + q.score, 0) / quizResults.length)
    : 0;
  const avgExamScore = examResults.length > 0 
    ? Math.round(examResults.reduce((acc, e) => acc + e.score, 0) / examResults.length)
    : 0;
  const poeGraded = poeResults.filter(p => p.status === 'graded').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasNoResults = quizResults.length === 0 && examResults.length === 0 && poeResults.length === 0;

  if (hasNoResults) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg text-muted-foreground">No results yet</p>
          <p className="text-sm text-muted-foreground">Complete quizzes, exams, or POE assignments to see your results here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" ref={printRef}>
      {/* Header with Print Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Results</h2>
          <p className="text-muted-foreground">View all your quiz, exam, and POE results for this course</p>
        </div>
        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print Results
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900">
                <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">{quizzesPassed}/{quizResults.length}</p>
                <p className="text-sm text-muted-foreground">Quizzes Passed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900">
                <Award className="h-5 w-5 text-purple-600 dark:text-purple-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">{examsPassed}/{examResults.length}</p>
                <p className="text-sm text-muted-foreground">Exams Passed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2 dark:bg-green-900">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgQuizScore}%</p>
                <p className="text-sm text-muted-foreground">Avg Quiz Score</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-orange-100 p-2 dark:bg-orange-900">
                <FileText className="h-5 w-5 text-orange-600 dark:text-orange-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">{poeGraded}/{poeResults.length}</p>
                <p className="text-sm text-muted-foreground">POE Graded</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quiz Results */}
      {quizResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Quiz Results
            </CardTitle>
            <CardDescription>All quiz attempts for this course</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quiz</TableHead>
                  <TableHead>Lesson</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Passing Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quizResults.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell className="font-medium">{result.quiz_title}</TableCell>
                    <TableCell>{result.resource_title}</TableCell>
                    <TableCell>
                      <Badge variant={result.score >= result.passing_score ? "default" : "destructive"}>
                        {result.score}%
                      </Badge>
                    </TableCell>
                    <TableCell>{result.passing_score}%</TableCell>
                    <TableCell>
                      {result.passed ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span>Passed</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-600">
                          <XCircle className="h-4 w-4" />
                          <span>Failed</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {result.completed_at && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(result.completed_at), 'PP')}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Exam Results */}
      {examResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Exam Results
            </CardTitle>
            <CardDescription>All exam attempts for this course</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Passing Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {examResults.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell className="font-medium">{result.exam_title}</TableCell>
                    <TableCell>
                      <Badge variant={result.score >= result.passing_score ? "default" : "destructive"}>
                        {result.score}%
                      </Badge>
                    </TableCell>
                    <TableCell>{result.passing_score}%</TableCell>
                    <TableCell>
                      {result.passed ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span>Passed</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-600">
                          <XCircle className="h-4 w-4" />
                          <span>Failed</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {result.completed_at && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(result.completed_at), 'PP')}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* POE Results */}
      {poeResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              POE Results
            </CardTitle>
            <CardDescription>Portfolio of Evidence submissions and grades</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assignment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Feedback</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {poeResults.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell className="font-medium">{result.assignment_title}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          result.status === 'graded' ? 'default' :
                          result.status === 'submitted' ? 'secondary' :
                          result.status === 'revision_requested' ? 'destructive' :
                          'outline'
                        }
                      >
                        {result.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {result.score !== null ? (
                        <span className="font-medium">{result.score}/{result.max_score}</span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {result.grade_label ? (
                        <Badge variant="outline">{result.grade_label}</Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {result.submitted_at && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(result.submitted_at), 'PP')}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {result.feedback || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
