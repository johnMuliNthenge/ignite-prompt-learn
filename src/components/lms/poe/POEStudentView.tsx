import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Clock, CheckCircle, XCircle, AlertCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { POESubmissionForm } from './POESubmissionForm';

interface POEStudentViewProps {
  courseId: string;
}

interface POEAssignment {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  due_date: string | null;
  max_score: number;
  max_files: number;
  max_file_size_mb: number;
  is_published: boolean;
}

interface POESubmission {
  id: string;
  assignment_id: string;
  status: string;
  submission_text: string | null;
  submitted_at: string | null;
  score: number | null;
  grade_label: string | null;
  feedback: string | null;
  revision_notes: string | null;
  poe_submission_files: Array<{
    id: string;
    file_name: string;
    file_url: string;
    file_type: string;
  }>;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'Draft', color: 'secondary', icon: <FileText className="h-4 w-4" /> },
  submitted: { label: 'Submitted', color: 'default', icon: <Clock className="h-4 w-4" /> },
  under_review: { label: 'Under Review', color: 'default', icon: <Clock className="h-4 w-4" /> },
  approved: { label: 'Approved', color: 'default', icon: <CheckCircle className="h-4 w-4" /> },
  rejected: { label: 'Rejected', color: 'destructive', icon: <XCircle className="h-4 w-4" /> },
  needs_revision: { label: 'Needs Revision', color: 'default', icon: <AlertCircle className="h-4 w-4" /> },
};

export const POEStudentView = ({ courseId }: POEStudentViewProps) => {
  const [selectedAssignment, setSelectedAssignment] = useState<POEAssignment | null>(null);
  const [viewingSubmission, setViewingSubmission] = useState<POESubmission | null>(null);

  const { data: assignments, isLoading: loadingAssignments } = useQuery({
    queryKey: ['poe-assignments-student', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('poe_assignments')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_published', true)
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data as POEAssignment[];
    },
  });

  const { data: submissions, refetch: refetchSubmissions } = useQuery({
    queryKey: ['poe-submissions-student', courseId],
    queryFn: async () => {
      const assignmentIds = assignments?.map(a => a.id) || [];
      if (assignmentIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('poe_submissions')
        .select(`
          *,
          poe_submission_files(id, file_name, file_url, file_type)
        `)
        .in('assignment_id', assignmentIds);
      if (error) throw error;
      return data as POESubmission[];
    },
    enabled: !!assignments && assignments.length > 0,
  });

  const getSubmissionForAssignment = (assignmentId: string) => {
    return submissions?.find(s => s.assignment_id === assignmentId);
  };

  if (loadingAssignments) {
    return <div className="p-4">Loading POE assignments...</div>;
  }

  if (!assignments || assignments.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mb-4" />
          <p>No POE assignments available yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="submitted">Submitted</TabsTrigger>
          <TabsTrigger value="graded">Graded</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 mt-4">
          {assignments
            .filter(a => {
              const sub = getSubmissionForAssignment(a.id);
              return !sub || sub.status === 'draft' || sub.status === 'needs_revision';
            })
            .map(assignment => {
              const submission = getSubmissionForAssignment(assignment.id);
              return (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  submission={submission}
                  onSubmit={() => setSelectedAssignment(assignment)}
                  onView={() => setViewingSubmission(submission!)}
                />
              );
            })}
        </TabsContent>

        <TabsContent value="submitted" className="space-y-3 mt-4">
          {assignments
            .filter(a => {
              const sub = getSubmissionForAssignment(a.id);
              return sub && (sub.status === 'submitted' || sub.status === 'under_review');
            })
            .map(assignment => {
              const submission = getSubmissionForAssignment(assignment.id);
              return (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  submission={submission}
                  onView={() => setViewingSubmission(submission!)}
                />
              );
            })}
        </TabsContent>

        <TabsContent value="graded" className="space-y-3 mt-4">
          {assignments
            .filter(a => {
              const sub = getSubmissionForAssignment(a.id);
              return sub && (sub.status === 'approved' || sub.status === 'rejected');
            })
            .map(assignment => {
              const submission = getSubmissionForAssignment(assignment.id);
              return (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  submission={submission}
                  onView={() => setViewingSubmission(submission!)}
                />
              );
            })}
        </TabsContent>
      </Tabs>

      {/* Submission Form Dialog */}
      <Dialog open={!!selectedAssignment} onOpenChange={() => setSelectedAssignment(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submit POE</DialogTitle>
          </DialogHeader>
          {selectedAssignment && (
            <POESubmissionForm
              assignment={selectedAssignment}
              existingSubmission={getSubmissionForAssignment(selectedAssignment.id) ? {
                id: getSubmissionForAssignment(selectedAssignment.id)!.id,
                status: getSubmissionForAssignment(selectedAssignment.id)!.status,
                submission_text: getSubmissionForAssignment(selectedAssignment.id)!.submission_text,
                files: getSubmissionForAssignment(selectedAssignment.id)!.poe_submission_files,
              } : undefined}
              onSuccess={() => {
                setSelectedAssignment(null);
                refetchSubmissions();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Submission Dialog */}
      <Dialog open={!!viewingSubmission} onOpenChange={() => setViewingSubmission(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submission Details</DialogTitle>
          </DialogHeader>
          {viewingSubmission && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={statusConfig[viewingSubmission.status]?.color as any}>
                  {statusConfig[viewingSubmission.status]?.label}
                </Badge>
                {viewingSubmission.score !== null && (
                  <Badge variant="outline">
                    Score: {viewingSubmission.score} {viewingSubmission.grade_label && `(${viewingSubmission.grade_label})`}
                  </Badge>
                )}
              </div>

              {viewingSubmission.submission_text && (
                <div>
                  <h4 className="font-medium mb-2">Your Response</h4>
                  <p className="text-sm bg-muted p-3 rounded">{viewingSubmission.submission_text}</p>
                </div>
              )}

              {viewingSubmission.poe_submission_files.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Uploaded Files</h4>
                  <div className="space-y-2">
                    {viewingSubmission.poe_submission_files.map(file => (
                      <a
                        key={file.id}
                        href={file.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 bg-muted rounded hover:bg-muted/80"
                      >
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">{file.file_name}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {viewingSubmission.feedback && (
                <div>
                  <h4 className="font-medium mb-2">Teacher Feedback</h4>
                  <p className="text-sm bg-muted p-3 rounded">{viewingSubmission.feedback}</p>
                </div>
              )}

              {viewingSubmission.revision_notes && (
                <div>
                  <h4 className="font-medium mb-2">Revision Notes</h4>
                  <p className="text-sm bg-destructive/10 p-3 rounded">{viewingSubmission.revision_notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface AssignmentCardProps {
  assignment: POEAssignment;
  submission?: POESubmission;
  onSubmit?: () => void;
  onView?: () => void;
}

const AssignmentCard = ({ assignment, submission, onSubmit, onView }: AssignmentCardProps) => {
  const status = submission?.status || 'not_started';
  const isPastDue = assignment.due_date && new Date(assignment.due_date) < new Date();

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base">{assignment.title}</CardTitle>
            {assignment.description && (
              <p className="text-sm text-muted-foreground mt-1">{assignment.description}</p>
            )}
          </div>
          {submission && (
            <Badge variant={statusConfig[status]?.color as any}>
              {statusConfig[status]?.icon}
              <span className="ml-1">{statusConfig[status]?.label}</span>
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {assignment.due_date && (
              <span className={isPastDue ? 'text-destructive' : ''}>
                Due: {format(new Date(assignment.due_date), 'PPp')}
              </span>
            )}
            <span className="ml-4">Max Score: {assignment.max_score}</span>
          </div>
          <div className="flex gap-2">
            {submission && (
              <Button size="sm" variant="outline" onClick={onView}>
                <Eye className="h-4 w-4 mr-1" />
                View
              </Button>
            )}
            {onSubmit && (!submission || submission.status === 'draft' || submission.status === 'needs_revision') && (
              <Button size="sm" onClick={onSubmit}>
                {submission ? 'Edit Submission' : 'Start Submission'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
