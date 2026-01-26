import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PreviewRow {
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  phone?: string;
  gender?: string;
  date_of_birth?: string;
  national_id?: string;
  date_of_hire?: string;
  error?: string;
}

export default function BulkUpload() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<{ success: number; failed: number } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  };

  const parseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
      
      const data: PreviewRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        
        // Validate required fields
        if (!row.first_name || !row.last_name || !row.email) {
          row.error = 'Missing required fields (first_name, last_name, email)';
        }
        
        data.push(row);
      }
      setPreviewData(data);
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (previewData.length === 0) return;
    
    setIsUploading(true);
    let success = 0;
    let failed = 0;

    for (const row of previewData) {
      if (row.error) {
        failed++;
        continue;
      }

      try {
        const { error } = await supabase.from('hr_employees').insert({
          first_name: row.first_name,
          middle_name: row.middle_name || null,
          last_name: row.last_name,
          email: row.email,
          phone: row.phone || null,
          gender: row.gender || null,
          date_of_birth: row.date_of_birth || null,
          national_id: row.national_id || null,
          date_of_hire: row.date_of_hire || new Date().toISOString().split('T')[0],
        } as any);

        if (error) throw error;
        success++;
      } catch (err: any) {
        failed++;
        row.error = err.message;
      }
    }

    setUploadResults({ success, failed });
    setIsUploading(false);
    queryClient.invalidateQueries({ queryKey: ['hr-employees'] });
    
    toast({
      title: "Upload Complete",
      description: `${success} employees added, ${failed} failed`,
    });
  };

  const downloadTemplate = () => {
    const headers = ['first_name', 'middle_name', 'last_name', 'email', 'phone', 'gender', 'date_of_birth', 'national_id', 'date_of_hire'];
    const csvContent = headers.join(',') + '\nJohn,,Doe,john@example.com,+254700000000,male,1990-01-01,12345678,2024-01-01';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee_template.csv';
    a.click();
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bulk Employee Upload</h1>
        <p className="text-muted-foreground">Import multiple employees from a CSV file</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Upload CSV File
          </CardTitle>
          <CardDescription>
            Upload a CSV file with employee data. Download the template for the correct format.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
          </div>
          
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Click to upload or drag and drop</p>
              <p className="text-sm text-muted-foreground">CSV files only</p>
            </label>
            {file && <p className="mt-4 text-sm">Selected: {file.name}</p>}
          </div>

          {uploadResults && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Upload complete: {uploadResults.success} successful, {uploadResults.failed} failed
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {previewData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview ({previewData.length} rows)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>First Name</TableHead>
                    <TableHead>Last Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row.first_name}</TableCell>
                      <TableCell>{row.last_name}</TableCell>
                      <TableCell>{row.email}</TableCell>
                      <TableCell>{row.phone || '-'}</TableCell>
                      <TableCell>
                        {row.error ? (
                          <span className="text-destructive flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            {row.error}
                          </span>
                        ) : (
                          <span className="text-primary flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            Ready
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={handleUpload} disabled={isUploading}>
                {isUploading ? 'Uploading...' : `Import ${previewData.filter(r => !r.error).length} Employees`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}