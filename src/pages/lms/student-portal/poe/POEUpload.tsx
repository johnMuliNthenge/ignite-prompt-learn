import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  FolderOpen,
  Upload,
  FileText,
  Image,
  Video,
  ArrowLeft,
  File,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface POESubmission {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string;
  status: string;
  submitted_at: string;
  feedback: string | null;
}

interface StudentInfo {
  id: string;
  student_no: string;
  class_id: string | null;
}

export default function POEUpload() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [submissions, setSubmissions] = useState<POESubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Upload form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, [user?.email]);

  useEffect(() => {
    if (selectedSubject && student) {
      fetchSubmissions();
    }
  }, [selectedSubject, student]);

  const fetchInitialData = async () => {
    try {
      // Get student
      const { data: studentData } = await supabase
        .from('students')
        .select('id, student_no, class_id')
        .eq('email', user?.email || '')
        .single();

      if (studentData) {
        setStudent(studentData);

        // Get subjects from curriculum based on student's programme
        if (studentData.class_id) {
          const { data: classData } = await supabase
            .from('classes')
            .select('programme_id')
            .eq('id', studentData.class_id)
            .single();

          if (classData?.programme_id) {
            const { data: curriculumData } = await supabase
              .from('curriculum')
              .select('id')
              .eq('programme_id', classData.programme_id)
              .eq('is_active', true);

            if (curriculumData && curriculumData.length > 0) {
              const curriculumIds = curriculumData.map(c => c.id);
              
              const { data: curriculumSubjects } = await supabase
                .from('curriculum_subjects')
                .select('subject:subject_id (id, name, code)')
                .in('curriculum_id', curriculumIds);

              const uniqueSubjects = curriculumSubjects
                ?.map(cs => cs.subject as unknown as Subject)
                .filter(Boolean) || [];
              setSubjects(uniqueSubjects);
            }
          }
        }
      }

      // Fallback: get all subjects if no curriculum mapping
      const { data: allSubjects } = await supabase
        .from('subjects')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');

      if (allSubjects && allSubjects.length > 0) {
        setSubjects(prev => prev.length > 0 ? prev : allSubjects);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    if (!selectedSubject || !student) return;
    
    setLoadingSubmissions(true);
    try {
      const { data, error } = await supabase
        .from('student_poe_submissions')
        .select('id, title, description, file_url, file_type, status, submitted_at, feedback')
        .eq('student_id', student.id)
        .eq('subject_id', selectedSubject.id)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setSubmissions((data || []) as POESubmission[]);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file size (50MB max)
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Maximum file size is 50MB',
          variant: 'destructive',
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const getFileType = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType === 'application/pdf') return 'pdf';
    return 'document';
  };

  const handleUpload = async () => {
    if (!file || !title || !selectedSubject || !student) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${student.id}/${selectedSubject.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('poe-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('poe-files')
        .getPublicUrl(fileName);

      // Create submission record
      const { error: insertError } = await supabase
        .from('student_poe_submissions')
        .insert({
          student_id: student.id,
          subject_id: selectedSubject.id,
          title,
          description: description || null,
          file_url: urlData.publicUrl,
          file_type: getFileType(file.type),
          file_name: file.name,
          status: 'submitted',
        });

      if (insertError) throw insertError;

      toast({
        title: 'POE Uploaded',
        description: 'Your evidence has been submitted successfully',
      });

      // Reset form
      setTitle('');
      setDescription('');
      setFile(null);
      setUploadDialogOpen(false);
      fetchSubmissions();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload your evidence. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
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
        return <Image className="h-8 w-8 text-primary" />;
      case 'video':
        return <Video className="h-8 w-8 text-primary" />;
      case 'pdf':
        return <FileText className="h-8 w-8 text-destructive" />;
      default:
        return <File className="h-8 w-8 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Subject folders view
  if (!selectedSubject) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Portfolio of Evidence</h1>
          <p className="text-muted-foreground">Select a subject to upload your evidence</p>
        </div>

        {subjects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No subjects available</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subject) => (
              <Card
                key={subject.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedSubject(subject)}
              >
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <FolderOpen className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{subject.name}</h3>
                    <p className="text-sm text-muted-foreground">{subject.code}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Subject POE view
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setSelectedSubject(null)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{selectedSubject.name}</h1>
          <p className="text-muted-foreground">Upload your portfolio evidence</p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Upload POE
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Submissions</CardTitle>
          <CardDescription>
            Evidence files submitted for {selectedSubject.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSubmissions ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-12">
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No submissions yet</p>
              <Button className="mt-4" onClick={() => setUploadDialogOpen(true)}>
                Upload your first POE
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <div
                  key={submission.id}
                  className="flex items-center gap-4 p-4 border rounded-lg"
                >
                  {getFileIcon(submission.file_type)}
                  <div className="flex-1">
                    <h4 className="font-medium">{submission.title}</h4>
                    {submission.description && (
                      <p className="text-sm text-muted-foreground">{submission.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Submitted: {new Date(submission.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(submission.status)}
                    <a
                      href={submission.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm"
                    >
                      View
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Evidence</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Assignment 1 Evidence"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this evidence..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="file">File *</Label>
              <Input
                id="file"
                type="file"
                onChange={handleFileChange}
                accept="image/*,video/*,.pdf,.doc,.docx"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Supported: Images, Videos, PDF, Word documents (max 50MB)
              </p>
            </div>
            {file && (
              <div className="p-3 bg-muted rounded-lg flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !file || !title}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
