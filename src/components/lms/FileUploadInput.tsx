import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, File, Check, Loader2 } from 'lucide-react';

interface FileUploadInputProps {
  type: 'video' | 'audio' | 'document';
  value: string;
  onChange: (url: string) => void;
  accept?: string;
}

export default function FileUploadInput({ type, value, onChange, accept }: FileUploadInputProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);

  const getAcceptType = () => {
    if (accept) return accept;
    switch (type) {
      case 'video': return 'video/*';
      case 'audio': return 'audio/*';
      case 'document': return '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt';
      default: return '*/*';
    }
  };

  const getMaxSize = () => {
    switch (type) {
      case 'video': return 500 * 1024 * 1024; // 500MB
      case 'audio': return 100 * 1024 * 1024; // 100MB
      case 'document': return 50 * 1024 * 1024; // 50MB
      default: return 50 * 1024 * 1024;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size
    if (file.size > getMaxSize()) {
      toast({
        title: 'File too large',
        description: `Maximum file size is ${getMaxSize() / (1024 * 1024)}MB`,
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setProgress(0);
    setFileName(file.name);

    try {
      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `course-content/${type}/${uniqueName}`;

      // Note: For actual file upload, you would need Supabase Storage configured
      // For now, we'll simulate the upload and use a placeholder URL
      // In production, use: const { data, error } = await supabase.storage.from('courses').upload(filePath, file);
      
      // Simulate upload progress
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // For demo: Use the file as a blob URL (temporary)
      // In production, you would get the public URL from Supabase Storage
      const tempUrl = URL.createObjectURL(file);
      
      // Wait a bit to show progress
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      clearInterval(interval);
      setProgress(100);
      
      onChange(tempUrl);
      
      toast({
        title: 'File uploaded',
        description: `${file.name} has been uploaded successfully`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload file. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const clearFile = () => {
    onChange('');
    setFileName(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={getAcceptType()}
        onChange={handleFileChange}
        className="hidden"
      />

      {uploading ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Uploading {fileName}...</span>
          </div>
          <Progress value={progress} />
        </div>
      ) : value ? (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
          <File className="h-5 w-5 text-primary" />
          <span className="flex-1 truncate text-sm">
            {fileName || 'File uploaded'}
          </span>
          <Check className="h-4 w-4 text-green-500" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearFile}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload {type.charAt(0).toUpperCase() + type.slice(1)}
        </Button>
      )}

      <p className="text-xs text-muted-foreground">
        {type === 'video' && 'Supported: MP4, WebM, MOV (max 500MB)'}
        {type === 'audio' && 'Supported: MP3, WAV, M4A (max 100MB)'}
        {type === 'document' && 'Supported: PDF, DOC, DOCX, PPT, XLS (max 50MB)'}
      </p>
    </div>
  );
}
