import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Award, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CourseCertificateProps {
  studentName: string;
  courseName: string;
  completionDate: string;
  certificateNumber: string;
  finalScore?: number;
  instructorName?: string;
}

export default function CourseCertificate({
  studentName,
  courseName,
  completionDate,
  certificateNumber,
  finalScore,
  instructorName,
}: CourseCertificateProps) {
  const certificateRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleDownload = async () => {
    if (!certificateRef.current) return;

    try {
      // Create a canvas from the certificate
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });

      // Convert to image and download
      const link = document.createElement('a');
      link.download = `certificate-${certificateNumber}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast({ title: 'Certificate downloaded!' });
    } catch (error) {
      console.error('Error generating certificate:', error);
      toast({
        title: 'Download failed',
        description: 'Could not generate certificate image',
        variant: 'destructive',
      });
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Course Completion Certificate',
          text: `I completed "${courseName}" and earned my certificate!`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({ title: 'Link copied to clipboard!' });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const formattedDate = new Date(completionDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleShare}>
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
        <Button onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download Certificate
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div
            ref={certificateRef}
            className="relative bg-gradient-to-br from-amber-50 via-white to-amber-50 p-12"
            style={{ aspectRatio: '1.414/1', minHeight: '500px' }}
          >
            {/* Decorative border */}
            <div className="absolute inset-4 rounded-lg border-4 border-amber-400/30" />
            <div className="absolute inset-6 rounded-lg border-2 border-amber-300/50" />

            {/* Corner decorations */}
            <div className="absolute left-8 top-8 h-16 w-16 border-l-4 border-t-4 border-amber-500" />
            <div className="absolute right-8 top-8 h-16 w-16 border-r-4 border-t-4 border-amber-500" />
            <div className="absolute bottom-8 left-8 h-16 w-16 border-b-4 border-l-4 border-amber-500" />
            <div className="absolute bottom-8 right-8 h-16 w-16 border-b-4 border-r-4 border-amber-500" />

            {/* Content */}
            <div className="relative flex h-full flex-col items-center justify-center text-center">
              {/* Award icon */}
              <div className="mb-4 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 p-4 shadow-lg">
                <Award className="h-12 w-12 text-white" />
              </div>

              {/* Title */}
              <h1 className="mb-2 font-serif text-4xl font-bold tracking-wide text-amber-800">
                CERTIFICATE
              </h1>
              <p className="mb-6 text-lg uppercase tracking-widest text-amber-600">
                of Completion
              </p>

              {/* Divider */}
              <div className="mb-6 flex w-48 items-center gap-2">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-400" />
                <div className="h-2 w-2 rotate-45 bg-amber-500" />
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-400" />
              </div>

              {/* Presented to */}
              <p className="mb-2 text-sm uppercase tracking-wider text-gray-500">
                This is to certify that
              </p>
              <h2 className="mb-4 font-serif text-3xl font-semibold text-gray-800">
                {studentName}
              </h2>

              {/* Course completion */}
              <p className="mb-2 text-sm uppercase tracking-wider text-gray-500">
                has successfully completed
              </p>
              <h3 className="mb-6 max-w-md font-serif text-xl font-medium text-primary">
                {courseName}
              </h3>

              {/* Score if available */}
              {finalScore !== undefined && (
                <p className="mb-4 text-sm text-gray-600">
                  with a final score of{' '}
                  <span className="font-semibold text-primary">{finalScore.toFixed(0)}%</span>
                </p>
              )}

              {/* Date */}
              <p className="mb-8 text-sm text-gray-500">
                Completed on {formattedDate}
              </p>

              {/* Divider */}
              <div className="mb-6 flex w-32 items-center gap-2">
                <div className="h-px flex-1 bg-amber-300" />
                <div className="h-1.5 w-1.5 rotate-45 bg-amber-400" />
                <div className="h-px flex-1 bg-amber-300" />
              </div>

              {/* Signature area */}
              {instructorName && (
                <div className="text-center">
                  <p className="font-serif text-lg italic text-gray-700">
                    {instructorName}
                  </p>
                  <p className="text-xs uppercase tracking-wider text-gray-400">
                    Course Instructor
                  </p>
                </div>
              )}

              {/* Certificate number */}
              <p className="absolute bottom-12 left-1/2 -translate-x-1/2 text-xs text-gray-400">
                Certificate No: {certificateNumber}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
