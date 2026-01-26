import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Trash2, Download, Eye } from "lucide-react";
import { format } from "date-fns";

export default function Documents() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [documentType, setDocumentType] = useState<string>('contract');
  const [documentName, setDocumentName] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');

  const { data: employees } = useQuery({
    queryKey: ['hr-employees-simple'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_employees')
        .select('id, first_name, last_name, employee_no')
        .order('first_name');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: documents, isLoading } = useQuery({
    queryKey: ['hr-documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_documents')
        .select(`
          *,
          employee:hr_employees(first_name, last_name, employee_no)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!documentName || !selectedEmployee) throw new Error('Missing document name or employee');

      const { error } = await supabase.from('hr_documents').insert({
        employee_id: selectedEmployee,
        document_type: documentType,
        document_name: documentName,
        file_url: null,
        expiry_date: expiryDate || null,
      } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Document added successfully" });
      queryClient.invalidateQueries({ queryKey: ['hr-documents'] });
      handleClose();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hr_documents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Document deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['hr-documents'] });
    }
  });

  const handleClose = () => {
    setOpen(false);
    setSelectedEmployee('');
    setDocumentType('contract');
    setDocumentName('');
    setExpiryDate('');
  };

  const documentTypes = [
    { value: 'contract', label: 'Contract' },
    { value: 'offer_letter', label: 'Offer Letter' },
    { value: 'nda', label: 'NDA' },
    { value: 'id_copy', label: 'ID Copy' },
    { value: 'certificate', label: 'Certificate' },
    { value: 'disciplinary', label: 'Disciplinary Letter' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Employee Documents</h1>
          <p className="text-muted-foreground">Manage employee documents and files</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Add Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Document</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Employee *</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees?.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.employee_no})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Document Type *</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Document Name *</Label>
                <Input
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  placeholder="e.g., Employment Contract 2024"
                />
              </div>
              <div className="space-y-2">
                <Label>Expiry Date (optional)</Label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button 
                onClick={() => uploadMutation.mutate()} 
                disabled={!documentName || !selectedEmployee || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? 'Adding...' : 'Add'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : documents?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No documents found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Document Type</TableHead>
                  <TableHead>Document Name</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents?.map((doc: any) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      {doc.employee?.first_name} {doc.employee?.last_name}
                    </TableCell>
                    <TableCell className="capitalize">{doc.document_type.replace('_', ' ')}</TableCell>
                    <TableCell className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {doc.document_name}
                    </TableCell>
                    <TableCell>
                      {doc.expiry_date ? format(new Date(doc.expiry_date), 'PP') : '-'}
                    </TableCell>
                    <TableCell>{format(new Date(doc.created_at), 'PP')}</TableCell>
                    <TableCell className="text-right">
                      {doc.file_url && (
                        <>
                          <Button variant="ghost" size="icon" asChild>
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button variant="ghost" size="icon" asChild>
                            <a href={doc.file_url} download>
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(doc.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}