import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { PlusCircle, Pencil, Trash2, Users, GraduationCap, Search } from 'lucide-react';

interface ClassData {
  id: string;
  name: string;
  description: string | null;
  academic_year_id: string | null;
  session_id: string | null;
  capacity: number | null;
  is_active: boolean;
  created_at: string;
  academic_years?: { name: string } | null;
  sessions?: { name: string } | null;
}

interface AcademicYear {
  id: string;
  name: string;
  is_current: boolean;
}

interface Session {
  id: string;
  name: string;
  academic_year_id: string;
}

export default function ClassManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    academic_year_id: '',
    session_id: '',
    capacity: '',
    is_active: true,
  });

  // Fetch classes
  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          academic_years(name),
          sessions(name)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ClassData[];
    },
  });

  // Fetch academic years
  const { data: academicYears = [] } = useQuery({
    queryKey: ['academic-years'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_years')
        .select('*')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data as AcademicYear[];
    },
  });

  // Fetch sessions
  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data as Session[];
    },
  });

  // Get student count per class
  const { data: studentCounts = {} } = useQuery({
    queryKey: ['class-student-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('class_id');
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach((s) => {
        if (s.class_id) {
          counts[s.class_id] = (counts[s.class_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        name: data.name,
        description: data.description || null,
        academic_year_id: data.academic_year_id || null,
        session_id: data.session_id || null,
        capacity: data.capacity ? parseInt(data.capacity) : null,
        is_active: data.is_active,
        created_by: user?.id,
      };

      if (editingClass) {
        const { error } = await supabase
          .from('classes')
          .update(payload)
          .eq('id', editingClass.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('classes').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success(editingClass ? 'Class updated successfully' : 'Class created successfully');
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to save class: ' + error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('classes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Class deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete class: ' + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      academic_year_id: '',
      session_id: '',
      capacity: '',
      is_active: true,
    });
    setEditingClass(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (classItem: ClassData) => {
    setEditingClass(classItem);
    setFormData({
      name: classItem.name,
      description: classItem.description || '',
      academic_year_id: classItem.academic_year_id || '',
      session_id: classItem.session_id || '',
      capacity: classItem.capacity?.toString() || '',
      is_active: classItem.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Class name is required');
      return;
    }
    saveMutation.mutate(formData);
  };

  const filteredClasses = classes.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter sessions by selected academic year
  const filteredSessions = formData.academic_year_id
    ? sessions.filter((s) => s.academic_year_id === formData.academic_year_id)
    : sessions;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Class Management</h1>
          <p className="text-muted-foreground">
            Manage student intakes and class groups
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Class
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingClass ? 'Edit Class' : 'Create New Class'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Class Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Form 1 2024, Year 1 Intake A"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Brief description of this class"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="academic_year">Academic Year</Label>
                  <Select
                    value={formData.academic_year_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, academic_year_id: value, session_id: '' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
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

                <div className="space-y-2">
                  <Label htmlFor="session">Session</Label>
                  <Select
                    value={formData.session_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, session_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select session" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSessions.map((session) => (
                        <SelectItem key={session.id} value={session.id}>
                          {session.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    value={formData.capacity}
                    onChange={(e) =>
                      setFormData({ ...formData, capacity: e.target.value })
                    }
                    placeholder="Max students"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="is_active">Status</Label>
                  <Select
                    value={formData.is_active ? 'active' : 'inactive'}
                    onValueChange={(value) =>
                      setFormData({ ...formData, is_active: value === 'active' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving...' : editingClass ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Classes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{classes.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Classes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">
                {classes.filter((c) => c.is_active).length}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Enrolled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-secondary-foreground" />
              <span className="text-2xl font-bold">
                {Object.values(studentCounts).reduce((a, b) => a + b, 0)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search classes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class Name</TableHead>
                <TableHead className="hidden md:table-cell">Academic Year</TableHead>
                <TableHead className="hidden md:table-cell">Session</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredClasses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No classes found
                  </TableCell>
                </TableRow>
              ) : (
                filteredClasses.map((classItem) => (
                  <TableRow key={classItem.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{classItem.name}</p>
                        {classItem.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {classItem.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {classItem.academic_years?.name || '-'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {classItem.sessions?.name || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{studentCounts[classItem.id] || 0}</span>
                        {classItem.capacity && (
                          <span className="text-muted-foreground">
                            /{classItem.capacity}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={classItem.is_active ? 'default' : 'secondary'}>
                        {classItem.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(classItem)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this class?')) {
                              deleteMutation.mutate(classItem.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
