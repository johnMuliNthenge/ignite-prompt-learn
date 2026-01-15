import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, FileText, Image, Video, File } from 'lucide-react';

interface POESubmissionFormProps {
  assignment: {
    id: string;
    title: string;
    description: string | null;
    instructions: string | null;
    max_score: number;
    max_files: number;
    max_file_size_mb: number;
  };
  existingSubmission?: {
    id: string;
    status: string;
    submission_text: string | null;
    files: Array<{ id: string; file_name: string; file_url: string; file_type: string }>;
  };
  onSuccess: () => void;
}

export const POESubmissionForm = ({ assignment, existingSubmission, onSuccess }: POESubmissionFormProps) => {
  const [submissionText, setSubmissionText] = useState(existingSubmission?.submission_text || '');
  const [files, setFiles] = useState<File[]>([]);
  const [existingFiles, setExistingFiles] = useState(existingSubmission?.files || []);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (type.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (type.includes('pdf') || type.includes('document')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const totalFiles = files.length + existingFiles.length + selectedFiles.length;
    
    if (totalFiles > assignment.max_files) {
      toast({
        title: `Maximum ${assignment.max_files} files allowed`,
        variant: 'destructive',
      });
      return;
    }

    const maxSize = assignment.max_file_size_mb * 1024 * 1024;
    const oversizedFiles = selectedFiles.filter(f => f.size > maxSize);
    if (oversizedFiles.length > 0) {
      toast({
        title: `Files must be under ${assignment.max_file_size_mb}MB`,
        variant: 'destructive',
      });
      return;
    }

    setFiles([...files, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const removeExistingFile = async (fileId: string, fileUrl: string) => {
    try {
      // Extract path from URL
      const path = fileUrl.split('/poe-files/')[1];
      if (path) {
        await supabase.storage.from('poe-files').remove([path]);
      }
      await supabase.from('poe_submission_files').delete().eq('id', fileId);
      setExistingFiles(existingFiles.filter(f => f.id !== fileId));
      toast({ title: 'File removed' });
    } catch {
      toast({ title: 'Failed to remove file', variant: 'destructive' });
    }
  };

  const submitMutation = useMutation({
    mutationFn: async (isDraft: boolean) => {
      setIsUploading(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      let submissionId = existingSubmission?.id;

      // Create or update submission
      if (submissionId) {
        const { error } = await supabase
          .from('poe_submissions')
          .update({
            submission_text: submissionText || null,
            status: isDraft ? 'draft' : 'submitted',
            submitted_at: isDraft ? null : new Date().toISOString(),
          })
          .eq('id', submissionId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('poe_submissions')
          .insert({
            assignment_id: assignment.id,
            user_id: user.user.id,
            submission_text: submissionText || null,
            status: isDraft ? 'draft' : 'submitted',
            submitted_at: isDraft ? null : new Date().toISOString(),
          })
          .select('id')
          .single();
        if (error) throw error;
        submissionId = data.id;
      }

      // Upload new files
      const totalFiles = files.length;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filePath = `${user.user.id}/${submissionId}/${Date.now()}-${file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('poe-files')
          .upload(filePath, file);
        
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('poe-files')
          .getPublicUrl(filePath);

        await supabase.from('poe_submission_files').insert({
          submission_id: submissionId,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type,
          file_size: file.size,
        });

        setUploadProgress(((i + 1) / totalFiles) * 100);
      }
    },
    onSuccess: (_, isDraft) => {
      queryClient.invalidateQueries({ queryKey: ['poe-submissions'] });
      toast({ title: isDraft ? 'Draft saved' : 'Submission sent for review' });
      setIsUploading(false);
      setUploadProgress(0);
      onSuccess();
    },
    onError: (error) => {
      console.error('Submission error:', error);
      toast({ title: 'Failed to submit', variant: 'destructive' });
      setIsUploading(false);
      setUploadProgress(0);
    },
  });

  const canEdit = !existingSubmission || existingSubmission.status === 'draft' || existingSubmission.status === 'needs_revision';

  return (
    <Card>
      <CardHeader>
        <CardTitle>{assignment.title}</CardTitle>
        {assignment.description && <CardDescription>{assignment.description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {assignment.instructions && (
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Instructions</h4>
            <p className="text-sm whitespace-pre-wrap">{assignment.instructions}</p>
          </div>
        )}

        {canEdit ? (
          <>
            <div>
              <Label>Your Response</Label>
              <Textarea
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
                rows={4}
                placeholder="Describe your evidence and what you learned..."
              />
            </div>

            <div>
              <Label>Upload Evidence Files</Label>
              <div className="mt-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*,application/pdf,.doc,.docx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={files.length + existingFiles.length >= assignment.max_files}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Select Files
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Max {assignment.max_files} files, {assignment.max_file_size_mb}MB each. Supports images, videos, and documents.
                </p>
              </div>

              {/* Existing files */}
              {existingFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium">Uploaded Files:</p>
                  {existingFiles.map((file) => (
                    <div key={file.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                      {getFileIcon(file.file_type)}
                      <span className="text-sm flex-1 truncate">{file.file_name}</span>
                      <Button size="icon" variant="ghost" onClick={() => removeExistingFile(file.id, file.file_url)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* New files to upload */}
              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium">New Files:</p>
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                      {getFileIcon(file.type)}
                      <span className="text-sm flex-1 truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)}MB
                      </span>
                      <Button size="icon" variant="ghost" onClick={() => removeFile(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isUploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} />
                <p className="text-sm text-muted-foreground">Uploading files... {Math.round(uploadProgress)}%</p>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => submitMutation.mutate(false)}
                disabled={isUploading || submitMutation.isPending}
              >
                Submit for Review
              </Button>
              <Button
                variant="outline"
                onClick={() => submitMutation.mutate(true)}
                disabled={isUploading || submitMutation.isPending}
              >
                Save as Draft
              </Button>
            </div>
          </>
        ) : (
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm">Your submission is currently under review and cannot be edited.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
