import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Search, Loader2, FileText, Users } from 'lucide-react';
import { toast } from 'sonner';
import { ActionButton, useModulePermissions } from '@/components/auth/ProtectedPage';

const MODULE_CODE = 'finance.student_invoice';

interface FeeTemplate {
  id: string;
  name: string;
  template_type: 'class' | 'course';
  class_id: string | null;
  course_id: string | null;
  total_amount: number;
  is_active: boolean;
}

interface FeeTemplateItem {
  id: string;
  account_id: string;
  description: string | null;
  amount: number;
  account_name?: string;
  account_code?: string;
}

interface Student {
  id: string;
  student_no: string;
  other_name: string;
  surname: string;
  class_id: string | null;
  status: string;
}

// Helper to avoid Supabase type depth issues
const getSupabaseClient = () => supabase as any;

export default function StudentInvoicing() {
  const { canAdd } = useModulePermissions(MODULE_CODE);
  
  const [templates, setTemplates] = useState<FeeTemplate[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<FeeTemplate | null>(null);
  const [templateItems, setTemplateItems] = useState<FeeTemplateItem[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [invoicing, setInvoicing] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [templatesRes, studentsRes] = await Promise.all([
        getSupabaseClient()
          .from('fee_templates')
          .select('*')
          .eq('is_active', true)
          .order('name'),
        getSupabaseClient()
          .from('students')
          .select('id, student_no, other_name, surname, class_id, status')
          .eq('status', 'Active')
          .order('surname'),
      ]);

      if (templatesRes.error) throw templatesRes.error;
      if (studentsRes.error) throw studentsRes.error;

      setTemplates(templatesRes.data || []);
      setStudents(studentsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = async (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    setSelectedTemplate(template || null);
    setSelectedStudents(new Set());

    if (template) {
      // Fetch template items
      const { data: items, error } = await getSupabaseClient()
        .from('fee_template_items')
        .select(`
          *,
          chart_of_accounts:account_id (account_code, account_name)
        `)
        .eq('template_id', template.id)
        .order('sort_order');

      if (error) {
        toast.error('Failed to load fee items');
        return;
      }

      setTemplateItems(items?.map((item: any) => ({
        ...item,
        account_name: item.chart_of_accounts?.account_name,
        account_code: item.chart_of_accounts?.account_code,
      })) || []);
    }
  };

  const getFilteredStudents = () => {
    let filtered = students;

    // Filter by template type
    if (selectedTemplate) {
      if (selectedTemplate.template_type === 'class' && selectedTemplate.class_id) {
        filtered = filtered.filter(s => s.class_id === selectedTemplate.class_id);
      }
      // For course type, show all students (they can be enrolled in any course)
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.student_no.toLowerCase().includes(term) ||
        s.other_name.toLowerCase().includes(term) ||
        s.surname.toLowerCase().includes(term)
      );
    }

    return filtered;
  };

  const toggleStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const toggleAll = () => {
    const filtered = getFilteredStudents();
    if (selectedStudents.size === filtered.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filtered.map(s => s.id)));
    }
  };

  const openConfirmDialog = () => {
    if (!selectedTemplate) {
      toast.error('Please select a fee template');
      return;
    }
    if (selectedStudents.size === 0) {
      toast.error('Please select at least one student');
      return;
    }
    setConfirmDialogOpen(true);
  };

  const createInvoices = async () => {
    if (!selectedTemplate) return;

    setInvoicing(true);
    try {
      const studentIds = Array.from(selectedStudents);
      let successCount = 0;
      let skipCount = 0;

      for (const studentId of studentIds) {
        // Check if student already has an invoice for this template in current period
        const { data: existingInvoice } = await getSupabaseClient()
          .from('fee_invoices')
          .select('id')
          .eq('student_id', studentId)
          .eq('notes', `Template: ${selectedTemplate.id}`)
          .maybeSingle();

        if (existingInvoice) {
          skipCount++;
          continue;
        }

        // Generate invoice number
        const { data: invoiceNumber } = await getSupabaseClient().rpc('generate_invoice_number');

        // Create the invoice
        const { data: invoice, error: invoiceError } = await getSupabaseClient()
          .from('fee_invoices')
          .insert({
            student_id: studentId,
            invoice_number: invoiceNumber,
            invoice_date: new Date().toISOString().split('T')[0],
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            subtotal: selectedTemplate.total_amount,
            tax_amount: 0,
            total_amount: selectedTemplate.total_amount,
            amount_paid: 0,
            balance_due: selectedTemplate.total_amount,
            status: 'Pending',
            notes: `Template: ${selectedTemplate.id}`,
          })
          .select('id')
          .single();

        if (invoiceError) {
          console.error('Error creating invoice:', invoiceError);
          continue;
        }

        // Create invoice items
        const invoiceItems = templateItems.map(item => ({
          invoice_id: invoice.id,
          description: item.account_name || item.description || 'Fee',
          fee_account_id: null,
          unit_price: item.amount,
          quantity: 1,
          total: item.amount,
        }));

        await getSupabaseClient()
          .from('fee_invoice_items')
          .insert(invoiceItems);

        successCount++;
      }

      if (successCount > 0) {
        toast.success(`Successfully created ${successCount} invoice(s)`);
      }
      if (skipCount > 0) {
        toast.info(`${skipCount} student(s) already have invoices for this template`);
      }

      setConfirmDialogOpen(false);
      setSelectedStudents(new Set());
    } catch (error) {
      console.error('Error creating invoices:', error);
      toast.error('Failed to create invoices');
    } finally {
      setInvoicing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
  };

  const filteredStudents = getFilteredStudents();

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Template Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Select Fee Template
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Fee Template</Label>
              <Select
                value={selectedTemplate?.id || ''}
                onValueChange={handleTemplateSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a fee template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} ({formatCurrency(template.total_amount)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Selected Template</p>
                <p className="font-semibold">{selectedTemplate.name}</p>
                <p className="text-lg font-bold text-primary">
                  {formatCurrency(selectedTemplate.total_amount)}
                </p>
                <Badge variant="outline" className="mt-2 capitalize">
                  {selectedTemplate.template_type} Fee
                </Badge>
              </div>
            )}
          </div>

          {selectedTemplate && templateItems.length > 0 && (
            <div className="mt-4">
              <Label className="text-muted-foreground">Fee Breakdown</Label>
              <Table className="mt-2">
                <TableHeader>
                  <TableRow>
                    <TableHead>Vote Head</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templateItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.account_code} - {item.account_name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Selection */}
      {selectedTemplate && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Select Students to Invoice
              </CardTitle>
              <div className="flex items-center gap-4">
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <ActionButton moduleCode={MODULE_CODE} action="add">
                  <Button
                    onClick={openConfirmDialog}
                    disabled={selectedStudents.size === 0}
                  >
                    Invoice Selected ({selectedStudents.size})
                  </Button>
                </ActionButton>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={filteredStudents.length > 0 && selectedStudents.size === filteredStudents.length}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Student No.</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      {selectedTemplate.template_type === 'class'
                        ? 'No students found in the selected class'
                        : 'No active students found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedStudents.has(student.id)}
                          onCheckedChange={() => toggleStudent(student.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono">{student.student_no}</TableCell>
                      <TableCell>{student.other_name} {student.surname}</TableCell>
                      <TableCell>
                        <Badge variant="default">{student.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Invoice Creation</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p>You are about to create invoices for:</p>
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Students Selected:</span>
                <span className="font-bold">{selectedStudents.size}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fee Template:</span>
                <span className="font-bold">{selectedTemplate?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount per Student:</span>
                <span className="font-bold">{formatCurrency(selectedTemplate?.total_amount || 0)}</span>
              </div>
              <hr />
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Total to Invoice:</span>
                <span className="font-bold text-primary">
                  {formatCurrency((selectedTemplate?.total_amount || 0) * selectedStudents.size)}
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              This will create individual invoices for each selected student. 
              Students who already have invoices for this template will be skipped.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createInvoices} disabled={invoicing}>
              {invoicing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Invoices
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
