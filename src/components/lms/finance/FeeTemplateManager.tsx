import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Loader2, Edit, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { ActionButton, useModulePermissions } from '@/components/auth/ProtectedPage';

const MODULE_CODE = 'finance.student_invoice';

interface FeeTemplate {
  id: string;
  name: string;
  description: string | null;
  template_type: 'class' | 'course';
  class_id: string | null;
  course_id: string | null;
  academic_year_id: string | null;
  total_amount: number;
  is_active: boolean;
  created_at: string;
}

interface FeeTemplateItem {
  id: string;
  template_id: string;
  account_id: string;
  description: string | null;
  amount: number;
  sort_order: number;
  account_name?: string;
  account_code?: string;
}

interface IncomeAccount {
  id: string;
  account_code: string;
  account_name: string;
}

interface ClassOption {
  id: string;
  name: string;
}

interface CourseOption {
  id: string;
  title: string;
}

interface AcademicYear {
  id: string;
  name: string;
  is_current: boolean;
}

// Helper to avoid Supabase type depth issues
const getSupabaseClient = () => supabase as any;

export default function FeeTemplateManager() {
  const { canAdd, canEdit, canDelete } = useModulePermissions(MODULE_CODE);
  
  const [templates, setTemplates] = useState<FeeTemplate[]>([]);
  const [incomeAccounts, setIncomeAccounts] = useState<IncomeAccount[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FeeTemplate | null>(null);
  const [viewingTemplate, setViewingTemplate] = useState<FeeTemplate | null>(null);
  const [templateItems, setTemplateItems] = useState<FeeTemplateItem[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    template_type: 'class' as 'class' | 'course',
    class_id: '',
    course_id: '',
    academic_year_id: '',
  });
  const [lineItems, setLineItems] = useState<{ account_id: string; amount: number; description: string }[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [templatesRes, accountsRes, classesRes, coursesRes, yearsRes] = await Promise.all([
        getSupabaseClient().from('fee_templates').select('*').order('created_at', { ascending: false }),
        getSupabaseClient().from('chart_of_accounts').select('id, account_code, account_name').eq('account_type', 'Income').eq('is_active', true).order('account_code'),
        getSupabaseClient().from('classes').select('id, name').order('name'),
        getSupabaseClient().from('lms_courses').select('id, title').order('title'),
        getSupabaseClient().from('academic_years').select('id, name, is_current').order('start_date', { ascending: false }),
      ]);

      if (templatesRes.error) throw templatesRes.error;
      if (accountsRes.error) throw accountsRes.error;
      
      setTemplates(templatesRes.data || []);
      setIncomeAccounts(accountsRes.data || []);
      setClasses(classesRes.data || []);
      setCourses(coursesRes.data || []);
      setAcademicYears(yearsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      description: '',
      template_type: 'class',
      class_id: '',
      course_id: '',
      academic_year_id: academicYears.find(y => y.is_current)?.id || '',
    });
    setLineItems([{ account_id: '', amount: 0, description: '' }]);
    setDialogOpen(true);
  };

  const openEditDialog = async (template: FeeTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      template_type: template.template_type,
      class_id: template.class_id || '',
      course_id: template.course_id || '',
      academic_year_id: template.academic_year_id || '',
    });
    
    // Fetch template items
    const { data: items, error } = await getSupabaseClient()
      .from('fee_template_items')
      .select('*')
      .eq('template_id', template.id)
      .order('sort_order');
    
    if (error) {
      toast.error('Failed to load template items');
      return;
    }
    
    setLineItems(items?.map((item: any) => ({
      account_id: item.account_id,
      amount: item.amount,
      description: item.description || '',
    })) || [{ account_id: '', amount: 0, description: '' }]);
    
    setDialogOpen(true);
  };

  const viewTemplate = async (template: FeeTemplate) => {
    setViewingTemplate(template);
    
    const { data: items, error } = await getSupabaseClient()
      .from('fee_template_items')
      .select(`
        *,
        chart_of_accounts:account_id (account_code, account_name)
      `)
      .eq('template_id', template.id)
      .order('sort_order');
    
    if (error) {
      toast.error('Failed to load template items');
      return;
    }
    
    setTemplateItems(items?.map((item: any) => ({
      ...item,
      account_name: item.chart_of_accounts?.account_name,
      account_code: item.chart_of_accounts?.account_code,
    })) || []);
    
    setViewDialogOpen(true);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { account_id: '', amount: 0, description: '' }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (index: number, field: string, value: string | number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    
    if (formData.template_type === 'class' && !formData.class_id) {
      toast.error('Please select a class');
      return;
    }
    
    if (formData.template_type === 'course' && !formData.course_id) {
      toast.error('Please select a course');
      return;
    }
    
    const validItems = lineItems.filter(item => item.account_id && item.amount > 0);
    if (validItems.length === 0) {
      toast.error('Please add at least one fee item with amount');
      return;
    }

    setSaving(true);
    try {
      const templateData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        template_type: formData.template_type,
        class_id: formData.template_type === 'class' ? formData.class_id : null,
        course_id: formData.template_type === 'course' ? formData.course_id : null,
        academic_year_id: formData.academic_year_id || null,
        total_amount: calculateTotal(),
        is_active: true,
      };

      let templateId: string;

      if (editingTemplate) {
        const { error } = await getSupabaseClient()
          .from('fee_templates')
          .update(templateData)
          .eq('id', editingTemplate.id);
        
        if (error) throw error;
        templateId = editingTemplate.id;

        // Delete old items
        await getSupabaseClient()
          .from('fee_template_items')
          .delete()
          .eq('template_id', templateId);
      } else {
        const { data, error } = await getSupabaseClient()
          .from('fee_templates')
          .insert(templateData)
          .select('id')
          .single();
        
        if (error) throw error;
        templateId = data.id;
      }

      // Insert new items
      const itemsToInsert = validItems.map((item, index) => ({
        template_id: templateId,
        account_id: item.account_id,
        amount: item.amount,
        description: item.description || null,
        sort_order: index,
      }));

      const { error: itemsError } = await getSupabaseClient()
        .from('fee_template_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast.success(editingTemplate ? 'Fee template updated' : 'Fee template created');
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save fee template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this fee template?')) return;
    
    try {
      const { error } = await getSupabaseClient()
        .from('fee_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Fee template deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete fee template');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
  };

  const getTargetName = (template: FeeTemplate) => {
    if (template.template_type === 'class') {
      return classes.find(c => c.id === template.class_id)?.name || 'Unknown Class';
    }
    return courses.find(c => c.id === template.course_id)?.title || 'Unknown Course';
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Fee Templates</CardTitle>
            <ActionButton moduleCode={MODULE_CODE} action="add">
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Create Fee Template
              </Button>
            </ActionButton>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Target</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No fee templates created yet
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {template.template_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{getTargetName(template)}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(template.total_amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={template.is_active ? 'default' : 'secondary'}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => viewTemplate(template)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <ActionButton moduleCode={MODULE_CODE} action="edit">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(template)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </ActionButton>
                        <ActionButton moduleCode={MODULE_CODE} action="delete">
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </ActionButton>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Fee Template' : 'Create Fee Template'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Term 1 Fees 2026"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Academic Year</Label>
                <Select
                  value={formData.academic_year_id}
                  onValueChange={(v) => setFormData({ ...formData, academic_year_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select academic year" />
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map((year) => (
                      <SelectItem key={year.id} value={year.id}>
                        {year.name} {year.is_current && '(Current)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Fee Type *</Label>
                <Select
                  value={formData.template_type}
                  onValueChange={(v: 'class' | 'course') => setFormData({ ...formData, template_type: v, class_id: '', course_id: '' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="class">Class Fee</SelectItem>
                    <SelectItem value="course">Course Fee</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.template_type === 'class' ? (
                <div className="space-y-2">
                  <Label>Select Class *</Label>
                  <Select
                    value={formData.class_id}
                    onValueChange={(v) => setFormData({ ...formData, class_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Select Course *</Label>
                  <Select
                    value={formData.course_id}
                    onValueChange={(v) => setFormData({ ...formData, course_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Vote Heads / Line Items */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold">Vote Heads / Fee Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </Button>
              </div>

              <div className="space-y-3">
                {lineItems.map((item, index) => (
                  <div key={index} className="grid gap-3 md:grid-cols-12 items-end p-3 border rounded-lg bg-muted/30">
                    <div className="md:col-span-5 space-y-1">
                      <Label className="text-xs">Vote Head (Income Account) *</Label>
                      <Select
                        value={item.account_id}
                        onValueChange={(v) => updateLineItem(index, 'account_id', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {incomeAccounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.account_code} - {acc.account_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-3 space-y-1">
                      <Label className="text-xs">Description</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                        placeholder="Optional"
                      />
                    </div>
                    <div className="md:col-span-3 space-y-1">
                      <Label className="text-xs">Amount (KES) *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.amount || ''}
                        onChange={(e) => updateLineItem(index, 'amount', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(index)}
                        disabled={lineItems.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <div className="text-lg font-bold">
                  Total: {formatCurrency(calculateTotal())}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingTemplate ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewingTemplate?.name}</DialogTitle>
          </DialogHeader>

          {viewingTemplate && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <p className="capitalize">{viewingTemplate.template_type} Fee</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Target</Label>
                  <p>{getTargetName(viewingTemplate)}</p>
                </div>
              </div>

              {viewingTemplate.description && (
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p>{viewingTemplate.description}</p>
                </div>
              )}

              <div>
                <Label className="text-muted-foreground">Fee Breakdown</Label>
                <Table className="mt-2">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account Code</TableHead>
                      <TableHead>Vote Head</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templateItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono">{item.account_code}</TableCell>
                        <TableCell>{item.account_name}</TableCell>
                        <TableCell>{item.description || '-'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold">
                      <TableCell colSpan={3}>Total</TableCell>
                      <TableCell className="text-right">{formatCurrency(viewingTemplate.total_amount)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
