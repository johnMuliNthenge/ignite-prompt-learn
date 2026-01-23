import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Budget {
  id: string;
  name: string;
  description: string | null;
  fiscal_year_id: string | null;
  fiscal_year_name?: string;
  total_amount: number;
  status: string;
  created_at: string;
}

interface FiscalYear {
  id: string;
  name: string;
}

export default function Budget() {
  const { isAdmin, user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    fiscal_year_id: '',
    total_amount: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([fetchBudgets(), fetchFiscalYears()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBudgets = async () => {
    const { data, error } = await supabase
      .from('budgets')
      .select(`
        id,
        name,
        description,
        fiscal_year_id,
        total_amount,
        status,
        created_at,
        fiscal_years(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching budgets:', error);
      toast.error('Failed to load budgets');
      return;
    }

    const formattedBudgets: Budget[] = (data || []).map((b: any) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      fiscal_year_id: b.fiscal_year_id,
      fiscal_year_name: b.fiscal_years?.name || '',
      total_amount: Number(b.total_amount) || 0,
      status: b.status,
      created_at: b.created_at,
    }));

    setBudgets(formattedBudgets);
  };

  const fetchFiscalYears = async () => {
    const { data, error } = await supabase
      .from('fiscal_years')
      .select('id, name')
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Error fetching fiscal years:', error);
      return;
    }

    setFiscalYears(data || []);
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error('Please enter a budget name');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('budgets').insert({
        name: formData.name,
        description: formData.description || null,
        fiscal_year_id: formData.fiscal_year_id || null,
        total_amount: parseFloat(formData.total_amount) || 0,
        status: 'Draft',
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success('Budget created successfully');
      setDialogOpen(false);
      setFormData({ name: '', description: '', fiscal_year_id: '', total_amount: '' });
      fetchBudgets();
    } catch (error: any) {
      console.error('Error creating budget:', error);
      toast.error(error.message || 'Failed to create budget');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <Badge className="bg-green-600 hover:bg-green-700">Approved</Badge>;
      case 'Pending':
        return <Badge className="bg-yellow-600 hover:bg-yellow-700">Pending</Badge>;
      case 'Rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  const filteredBudgets = budgets.filter(
    (b) =>
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.fiscal_year_name && b.fiscal_year_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!isAdmin) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">You don't have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Budget Management</h1>
          <p className="text-muted-foreground">Create and manage institutional budgets</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Budget
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Budget</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Budget Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Annual Operating Budget 2026"
                />
              </div>
              <div className="space-y-2">
                <Label>Fiscal Year</Label>
                <Select
                  value={formData.fiscal_year_id}
                  onValueChange={(value) => setFormData({ ...formData, fiscal_year_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fiscal year" />
                  </SelectTrigger>
                  <SelectContent>
                    {fiscalYears.map((fy) => (
                      <SelectItem key={fy.id} value={fy.id}>
                        {fy.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Total Amount (KES)</Label>
                <Input
                  type="number"
                  value={formData.total_amount}
                  onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Budget description..."
                />
              </div>
              <Button onClick={handleSubmit} className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Budget
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Budgets</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search budgets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Budget Name</TableHead>
                  <TableHead>Fiscal Year</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBudgets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No budgets found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBudgets.map((budget) => (
                    <TableRow key={budget.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{budget.name}</p>
                          {budget.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-xs">
                              {budget.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{budget.fiscal_year_name || '-'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(budget.total_amount)}</TableCell>
                      <TableCell>{getStatusBadge(budget.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" title="Edit">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
