import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  FileText,
  Image,
  Video,
  File,
  Search,
  Award,
} from 'lucide-react';
import { format } from 'date-fns';

interface POESubmission {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string;
  file_name: string | null;
  status: string;
  score: number | null;
  max_score: number;
  feedback: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  student: {
    id: string;
    student_no: string;
    other_name: string;
    surname: string;
  } | null;
  subject: {
    id: string;
    name: string;
    code: string;
  } | null;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

export default function POEReview() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<POESubmission[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<POESubmission | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Review form
  const [reviewScore, setReviewScore] = useState('');
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch subjects
      const { data: subjectData } = await supabase
        .from('subjects')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');
      
      setSubjects(subjectData || []);

      // Fetch all submissions with student and subject info
      const { data: submissionData, error } = await supabase
        .from('student_poe_submissions')
        .select(`
          id,
          title,
          description,
          file_url,
          file_type,
          file_name,
          status,
          score,
          max_score,
          feedback,
          submitted_at,
          reviewed_at,
          student:student_id (
            id,
            student_no,
            other_name,
            surname
          ),
          subject:subject_id (
            id,
            name,
            code
          )
        `)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setSubmissions((submissionData || []) as unknown as POESubmission[]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load POE submissions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!selectedSubmission) return;
    
    if (reviewAction === 'approve' && !reviewScore) {
      toast({
        title: 'Score Required',
        description: 'Please enter a score for approval',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);
    try {
      const updateData: Record<string, unknown> = {
        status: reviewAction === 'approve' ? 'approved' : 'rejected',
        feedback: reviewFeedback || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id,
      };

      if (reviewAction === 'approve' && reviewScore) {
        updateData.score = parseFloat(reviewScore);
      }

      const { error } = await supabase
        .from('student_poe_submissions')
        .update(updateData)
        .eq('id', selectedSubmission.id);

      if (error) throw error;

      toast({
        title: reviewAction === 'approve' ? 'POE Approved' : 'POE Rejected',
        description: `The submission has been ${reviewAction === 'approve' ? 'approved' : 'rejected'}`,
      });

      // Refresh data
      fetchData();
      setReviewDialogOpen(false);
      setSelectedSubmission(null);
      setReviewScore('');
      setReviewFeedback('');
    } catch (error) {
      console.error('Review error:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit review',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const openReviewDialog = (submission: POESubmission) => {
    setSelectedSubmission(submission);
    setReviewScore(submission.score?.toString() || '');
    setReviewFeedback(submission.feedback || '');
    setReviewAction('approve');
    setReviewDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image':
        return <Image className="h-4 w-4 text-blue-500" />;
      case 'video':
        return <Video className="h-4 w-4 text-purple-500" />;
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-500" />;
      default:
        return <File className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const filteredSubmissions = submissions.filter(sub => {
    const matchesSubject = selectedSubject === 'all' || sub.subject?.id === selectedSubject;
    const matchesSearch = searchTerm === '' || 
      sub.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.student?.student_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${sub.student?.other_name} ${sub.student?.surname}`.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  const pendingSubmissions = filteredSubmissions.filter(s => s.status === 'submitted');
  const reviewedSubmissions = filteredSubmissions.filter(s => s.status !== 'submitted');

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">POE Review</h1>
        <p className="text-muted-foreground">Review and grade student Portfolio of Evidence submissions</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student name, number, or title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Submissions Table */}
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Review ({pendingSubmissions.length})
          </TabsTrigger>
          <TabsTrigger value="reviewed">
            Reviewed ({reviewedSubmissions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Submissions</CardTitle>
              <CardDescription>POE submissions awaiting your review</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingSubmissions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No pending submissions</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>File</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingSubmissions.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {submission.student?.other_name} {submission.student?.surname}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {submission.student?.student_no}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{submission.subject?.code}</Badge>
                        </TableCell>
                        <TableCell>{submission.title}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getFileIcon(submission.file_type)}
                            <a
                              href={submission.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-sm"
                            >
                              View
                            </a>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(submission.submitted_at), 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" onClick={() => openReviewDialog(submission)}>
                            <Award className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviewed">
          <Card>
            <CardHeader>
              <CardTitle>Reviewed Submissions</CardTitle>
              <CardDescription>Previously reviewed POE submissions</CardDescription>
            </CardHeader>
            <CardContent>
              {reviewedSubmissions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No reviewed submissions</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reviewed</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviewedSubmissions.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {submission.student?.other_name} {submission.student?.surname}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {submission.student?.student_no}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{submission.subject?.code}</Badge>
                        </TableCell>
                        <TableCell>{submission.title}</TableCell>
                        <TableCell>
                          {submission.score !== null ? (
                            <span className="font-medium">
                              {submission.score}/{submission.max_score}
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(submission.status)}</TableCell>
                        <TableCell>
                          {submission.reviewed_at
                            ? format(new Date(submission.reviewed_at), 'dd/MM/yyyy')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <a
                              href={submission.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </a>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openReviewDialog(submission)}
                            >
                              Edit
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review POE Submission</DialogTitle>
            <DialogDescription>
              {selectedSubmission?.title} by {selectedSubmission?.student?.other_name} {selectedSubmission?.student?.surname}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSubmission && (
            <div className="space-y-4">
              {/* File Preview Link */}
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  {getFileIcon(selectedSubmission.file_type)}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{selectedSubmission.file_name || 'Attached File'}</p>
                    <a
                      href={selectedSubmission.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      Open in new tab
                    </a>
                  </div>
                </div>
              </div>

              {selectedSubmission.description && (
                <div>
                  <Label>Student Description</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedSubmission.description}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant={reviewAction === 'approve' ? 'default' : 'outline'}
                  onClick={() => setReviewAction('approve')}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant={reviewAction === 'reject' ? 'destructive' : 'outline'}
                  onClick={() => setReviewAction('reject')}
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>

              {reviewAction === 'approve' && (
                <div>
                  <Label htmlFor="score">Score (out of {selectedSubmission.max_score})</Label>
                  <Input
                    id="score"
                    type="number"
                    min="0"
                    max={selectedSubmission.max_score}
                    value={reviewScore}
                    onChange={(e) => setReviewScore(e.target.value)}
                    placeholder={`Enter score (0-${selectedSubmission.max_score})`}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="feedback">Feedback</Label>
                <Textarea
                  id="feedback"
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                  placeholder="Provide feedback to the student..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReview} disabled={processing}>
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Review'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
