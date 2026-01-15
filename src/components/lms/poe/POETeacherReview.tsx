import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { FileText, User, Download, CheckCircle, XCircle, RotateCcw, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

interface POETeacherReviewProps {
  courseId: string;
}

interface SubmissionWithDetails {
  id: string;
  assignment_id: string;
  user_id: string;
  status: string;
  submission_text: string | null;
  submitted_at: string | null;
  score: number | null;
  grade_label: string | null;
  feedback: string | null;
  poe_assignments: {
    id: string;
    title: string;
    max_score: number;
    grading_scale_id: string | null;
  };
  poe_submission_files: Array<{
    id: string;
    file_name: string;
    file_url: string;
    file_type: string;
  }>;
  lms_profiles: {
    full_name: string | null;
    email: string;
  } | null;
}

interface GradingScaleLevel {
  id: string;
  label: string;
  min_value: number;
  max_value: number;
  color: string | null;
}

export const POETeacherReview = ({ courseId }: POETeacherReviewProps) => {
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithDetails | null>(null);
  const [gradeData, setGradeData] = useState({ score: '', feedback: '', revision_notes: '' });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: submissions, isLoading } = useQuery({
    queryKey: ['poe-submissions-teacher', courseId],
    queryFn: async () => {
      // First get assignment IDs for this course
      const { data: assignments } = await supabase
        .from('poe_assignments')
        .select('id')
        .eq('course_id', courseId);
      
      if (!assignments || assignments.length === 0) return [];
      
      const assignmentIds = assignments.map(a => a.id);
      
      const { data, error } = await supabase
        .from('poe_submissions')
        .select(`
          *,
          poe_assignments(id, title, max_score, grading_scale_id),
          poe_submission_files(id, file_name, file_url, file_type)
        `)
        .in('assignment_id', assignmentIds)
        .neq('status', 'draft')
        .order('submitted_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch user profiles
      const userIds = [...new Set(data.map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from('lms_profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);
      
      return data.map(s => ({
        ...s,
        lms_profiles: profiles?.find(p => p.user_id === s.user_id) || null,
      })) as SubmissionWithDetails[];
    },
  });

  const { data: gradingLevels } = useQuery({
    queryKey: ['grading-levels', selectedSubmission?.poe_assignments?.grading_scale_id],
    queryFn: async () => {
      if (!selectedSubmission?.poe_assignments?.grading_scale_id) return null;
      const { data, error } = await supabase
        .from('grading_scale_levels')
        .select('*')
        .eq('scale_id', selectedSubmission.poe_assignments.grading_scale_id)
        .order('sort_order');
      if (error) throw error;
      return data as GradingScaleLevel[];
    },
    enabled: !!selectedSubmission?.poe_assignments?.grading_scale_id,
  });

  const gradeMutation = useMutation({
    mutationFn: async ({ status, score, feedback, revision_notes }: { 
      status: string; 
      score?: number; 
      feedback?: string;
      revision_notes?: string;
    }) => {
      if (!selectedSubmission) return;
      
      const { data: user } = await supabase.auth.getUser();
      
      // Determine grade label based on score and grading scale
      let gradeLabel = null;
      if (score !== undefined && gradingLevels) {
        const level = gradingLevels.find(l => score >= l.min_value && score <= l.max_value);
        gradeLabel = level?.label || null;
      }

      const { error } = await supabase
        .from('poe_submissions')
        .update({
          status,
          score: score ?? null,
          grade_label: gradeLabel,
          feedback: feedback || null,
          revision_notes: revision_notes || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.user?.id,
        })
        .eq('id', selectedSubmission.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poe-submissions-teacher', courseId] });
      toast({ title: 'Submission graded successfully' });
      setSelectedSubmission(null);
      setGradeData({ score: '', feedback: '', revision_notes: '' });
    },
    onError: () => {
      toast({ title: 'Failed to grade submission', variant: 'destructive' });
    },
  });

  const handleGrade = (status: 'approved' | 'rejected' | 'needs_revision') => {
    gradeMutation.mutate({
      status,
      score: gradeData.score ? parseFloat(gradeData.score) : undefined,
      feedback: gradeData.feedback,
      revision_notes: gradeData.revision_notes,
    });
  };

  const openReview = (submission: SubmissionWithDetails) => {
    setSelectedSubmission(submission);
    setGradeData({
      score: submission.score?.toString() || '',
      feedback: submission.feedback || '',
      revision_notes: '',
    });
  };

  const downloadAllSubmissions = () => {
    if (!submissions) return;
    
    const csvContent = [
      ['Student', 'Assignment', 'Status', 'Score', 'Grade', 'Submitted At'].join(','),
      ...submissions.map(s => [
        s.lms_profiles?.full_name || s.lms_profiles?.email || 'Unknown',
        s.poe_assignments.title,
        s.status,
        s.score || '',
        s.grade_label || '',
        s.submitted_at ? format(new Date(s.submitted_at), 'yyyy-MM-dd HH:mm') : '',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `poe-submissions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (isLoading) {
    return <div className="p-4">Loading submissions...</div>;
  }

  const pendingSubmissions = submissions?.filter(s => s.status === 'submitted' || s.status === 'under_review') || [];
  const gradedSubmissions = submissions?.filter(s => s.status === 'approved' || s.status === 'rejected' || s.status === 'needs_revision') || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">POE Submissions</h3>
        <Button size="sm" variant="outline" onClick={downloadAllSubmissions}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Review ({pendingSubmissions.length})
          </TabsTrigger>
          <TabsTrigger value="graded">
            Graded ({gradedSubmissions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 mt-4">
          {pendingSubmissions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No pending submissions to review
              </CardContent>
            </Card>
          ) : (
            pendingSubmissions.map(submission => (
              <SubmissionCard
                key={submission.id}
                submission={submission}
                onReview={() => openReview(submission)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="graded" className="space-y-3 mt-4">
          {gradedSubmissions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No graded submissions yet
              </CardContent>
            </Card>
          ) : (
            gradedSubmissions.map(submission => (
              <SubmissionCard
                key={submission.id}
                submission={submission}
                onReview={() => openReview(submission)}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Submission</DialogTitle>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Student</p>
                  <p className="font-medium">
                    {selectedSubmission.lms_profiles?.full_name || selectedSubmission.lms_profiles?.email || 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Assignment</p>
                  <p className="font-medium">{selectedSubmission.poe_assignments.title}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <p className="font-medium">
                    {selectedSubmission.submitted_at 
                      ? format(new Date(selectedSubmission.submitted_at), 'PPp')
                      : 'Not submitted'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Max Score</p>
                  <p className="font-medium">{selectedSubmission.poe_assignments.max_score}</p>
                </div>
              </div>

              {selectedSubmission.submission_text && (
                <div>
                  <Label>Student's Response</Label>
                  <div className="bg-muted p-4 rounded-lg mt-2">
                    <p className="whitespace-pre-wrap">{selectedSubmission.submission_text}</p>
                  </div>
                </div>
              )}

              {selectedSubmission.poe_submission_files.length > 0 && (
                <div>
                  <Label>Submitted Files</Label>
                  <div className="space-y-2 mt-2">
                    {selectedSubmission.poe_submission_files.map(file => (
                      <a
                        key={file.id}
                        href={file.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 bg-muted rounded-lg hover:bg-muted/80"
                      >
                        <FileText className="h-5 w-5" />
                        <span className="flex-1">{file.file_name}</span>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-4 space-y-4">
                <div>
                  <Label>Score (out of {selectedSubmission.poe_assignments.max_score})</Label>
                  <Input
                    type="number"
                    min="0"
                    max={selectedSubmission.poe_assignments.max_score}
                    value={gradeData.score}
                    onChange={(e) => setGradeData({ ...gradeData, score: e.target.value })}
                    placeholder="Enter score"
                    className="mt-1"
                  />
                  {gradingLevels && gradeData.score && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Grade: {gradingLevels.find(l => 
                        parseFloat(gradeData.score) >= l.min_value && 
                        parseFloat(gradeData.score) <= l.max_value
                      )?.label || 'N/A'}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Feedback to Student</Label>
                  <Textarea
                    value={gradeData.feedback}
                    onChange={(e) => setGradeData({ ...gradeData, feedback: e.target.value })}
                    rows={3}
                    placeholder="Provide constructive feedback..."
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Revision Notes (if requesting revision)</Label>
                  <Textarea
                    value={gradeData.revision_notes}
                    onChange={(e) => setGradeData({ ...gradeData, revision_notes: e.target.value })}
                    rows={2}
                    placeholder="What needs to be fixed..."
                    className="mt-1"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => handleGrade('approved')}
                    disabled={gradeMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleGrade('needs_revision')}
                    disabled={gradeMutation.isPending}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Request Revision
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleGrade('rejected')}
                    disabled={gradeMutation.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface SubmissionCardProps {
  submission: SubmissionWithDetails;
  onReview: () => void;
}

const SubmissionCard = ({ submission, onReview }: SubmissionCardProps) => {
  const statusColors: Record<string, string> = {
    submitted: 'default',
    under_review: 'default',
    approved: 'default',
    rejected: 'destructive',
    needs_revision: 'secondary',
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base">{submission.poe_assignments.title}</CardTitle>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              {submission.lms_profiles?.full_name || submission.lms_profiles?.email || 'Unknown Student'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusColors[submission.status] as any}>
              {submission.status.replace('_', ' ')}
            </Badge>
            {submission.score !== null && (
              <Badge variant="outline">
                {submission.score}/{submission.poe_assignments.max_score}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {submission.submitted_at && (
              <span>Submitted: {format(new Date(submission.submitted_at), 'PPp')}</span>
            )}
            <span className="ml-4">{submission.poe_submission_files.length} file(s)</span>
          </div>
          <Button size="sm" onClick={onReview}>
            Review
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
