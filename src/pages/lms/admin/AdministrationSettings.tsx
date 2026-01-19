import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { LMSLayout } from '@/components/lms/LMSLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Calendar, BookOpen, Clock, GraduationCap } from 'lucide-react';
import { format } from 'date-fns';

interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

interface StudentType {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface SessionType {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface Session {
  id: string;
  academic_year_id: string;
  session_type_id: string | null;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export default function AdministrationSettings() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Academic Years State
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [academicYearDialog, setAcademicYearDialog] = useState(false);
  const [editingAcademicYear, setEditingAcademicYear] = useState<AcademicYear | null>(null);
  const [academicYearForm, setAcademicYearForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
    is_current: false,
  });

  // Student Types State
  const [studentTypes, setStudentTypes] = useState<StudentType[]>([]);
  const [studentTypeDialog, setStudentTypeDialog] = useState(false);
  const [editingStudentType, setEditingStudentType] = useState<StudentType | null>(null);
  const [studentTypeForm, setStudentTypeForm] = useState({
    name: '',
    description: '',
    is_active: true,
  });

  // Session Types State
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([]);
  const [sessionTypeDialog, setSessionTypeDialog] = useState(false);
  const [editingSessionType, setEditingSessionType] = useState<SessionType | null>(null);
  const [sessionTypeForm, setSessionTypeForm] = useState({
    name: '',
    description: '',
    is_active: true,
  });

  // Sessions State
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionDialog, setSessionDialog] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [sessionForm, setSessionForm] = useState({
    academic_year_id: '',
    session_type_id: '',
    name: '',
    start_date: '',
    end_date: '',
    is_active: true,
  });

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/lms/dashboard');
    }
  }, [authLoading, isAdmin, navigate]);

  useEffect(() => {
    fetchAcademicYears();
    fetchStudentTypes();
    fetchSessionTypes();
    fetchSessions();
  }, []);

  // Fetch functions
  const fetchAcademicYears = async () => {
    const { data } = await supabase
      .from('academic_years')
      .select('*')
      .order('start_date', { ascending: false });
    setAcademicYears(data || []);
  };

  const fetchStudentTypes = async () => {
    const { data } = await supabase
      .from('student_types')
      .select('*')
      .order('name');
    setStudentTypes(data || []);
  };

  const fetchSessionTypes = async () => {
    const { data } = await supabase
      .from('session_types')
      .select('*')
      .order('name');
    setSessionTypes(data || []);
  };

  const fetchSessions = async () => {
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .order('start_date', { ascending: false });
    setSessions(data || []);
  };

  // Academic Year handlers
  const handleAcademicYearSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingAcademicYear) {
      const { error } = await supabase
        .from('academic_years')
        .update(academicYearForm)
        .eq('id', editingAcademicYear.id);
      
      if (error) toast.error('Failed to update academic year');
      else {
        toast.success('Academic year updated');
        setAcademicYearDialog(false);
        setEditingAcademicYear(null);
        fetchAcademicYears();
      }
    } else {
      const { error } = await supabase.from('academic_years').insert(academicYearForm);
      
      if (error) toast.error('Failed to create academic year');
      else {
        toast.success('Academic year created');
        setAcademicYearDialog(false);
        fetchAcademicYears();
      }
    }
    setAcademicYearForm({ name: '', start_date: '', end_date: '', is_current: false });
  };

  const handleDeleteAcademicYear = async (id: string) => {
    if (!confirm('Delete this academic year?')) return;
    const { error } = await supabase.from('academic_years').delete().eq('id', id);
    if (error) toast.error('Failed to delete');
    else {
      toast.success('Deleted');
      fetchAcademicYears();
    }
  };

  // Student Type handlers
  const handleStudentTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingStudentType) {
      const { error } = await supabase
        .from('student_types')
        .update(studentTypeForm)
        .eq('id', editingStudentType.id);
      
      if (error) toast.error('Failed to update student type');
      else {
        toast.success('Student type updated');
        setStudentTypeDialog(false);
        setEditingStudentType(null);
        fetchStudentTypes();
      }
    } else {
      const { error } = await supabase.from('student_types').insert(studentTypeForm);
      
      if (error) toast.error('Failed to create student type');
      else {
        toast.success('Student type created');
        setStudentTypeDialog(false);
        fetchStudentTypes();
      }
    }
    setStudentTypeForm({ name: '', description: '', is_active: true });
  };

  const handleDeleteStudentType = async (id: string) => {
    if (!confirm('Delete this student type?')) return;
    const { error } = await supabase.from('student_types').delete().eq('id', id);
    if (error) toast.error('Failed to delete');
    else {
      toast.success('Deleted');
      fetchStudentTypes();
    }
  };

  // Session Type handlers
  const handleSessionTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingSessionType) {
      const { error } = await supabase
        .from('session_types')
        .update(sessionTypeForm)
        .eq('id', editingSessionType.id);
      
      if (error) toast.error('Failed to update session type');
      else {
        toast.success('Session type updated');
        setSessionTypeDialog(false);
        setEditingSessionType(null);
        fetchSessionTypes();
      }
    } else {
      const { error } = await supabase.from('session_types').insert(sessionTypeForm);
      
      if (error) toast.error('Failed to create session type');
      else {
        toast.success('Session type created');
        setSessionTypeDialog(false);
        fetchSessionTypes();
      }
    }
    setSessionTypeForm({ name: '', description: '', is_active: true });
  };

  const handleDeleteSessionType = async (id: string) => {
    if (!confirm('Delete this session type?')) return;
    const { error } = await supabase.from('session_types').delete().eq('id', id);
    if (error) toast.error('Failed to delete');
    else {
      toast.success('Deleted');
      fetchSessionTypes();
    }
  };

  // Session handlers
  const handleSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      ...sessionForm,
      session_type_id: sessionForm.session_type_id || null,
    };
    
    if (editingSession) {
      const { error } = await supabase
        .from('sessions')
        .update(data)
        .eq('id', editingSession.id);
      
      if (error) toast.error('Failed to update session');
      else {
        toast.success('Session updated');
        setSessionDialog(false);
        setEditingSession(null);
        fetchSessions();
      }
    } else {
      const { error } = await supabase.from('sessions').insert(data);
      
      if (error) toast.error('Failed to create session');
      else {
        toast.success('Session created');
        setSessionDialog(false);
        fetchSessions();
      }
    }
    setSessionForm({ academic_year_id: '', session_type_id: '', name: '', start_date: '', end_date: '', is_active: true });
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm('Delete this session?')) return;
    const { error } = await supabase.from('sessions').delete().eq('id', id);
    if (error) toast.error('Failed to delete');
    else {
      toast.success('Deleted');
      fetchSessions();
    }
  };

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Administration Settings</h1>
          <p className="text-muted-foreground">
            Manage academic years, student types, and sessions
          </p>
        </div>

        <Tabs defaultValue="academic-years" className="space-y-4">
          <TabsList className="h-auto flex-wrap gap-1 p-1">
            <TabsTrigger value="academic-years" className="text-xs sm:text-sm">
              <Calendar className="mr-1 h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Academic Years</span>
              <span className="sm:hidden">Years</span>
            </TabsTrigger>
            <TabsTrigger value="student-types" className="text-xs sm:text-sm">
              <GraduationCap className="mr-1 h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Student Types</span>
              <span className="sm:hidden">Types</span>
            </TabsTrigger>
            <TabsTrigger value="session-types" className="text-xs sm:text-sm">
              <Clock className="mr-1 h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Session Types</span>
              <span className="sm:hidden">S.Types</span>
            </TabsTrigger>
            <TabsTrigger value="sessions" className="text-xs sm:text-sm">
              <BookOpen className="mr-1 h-4 w-4 sm:mr-2" />
              Sessions
            </TabsTrigger>
          </TabsList>

          {/* Academic Years Tab */}
          <TabsContent value="academic-years">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Academic Years</CardTitle>
                  <CardDescription>Define academic year periods</CardDescription>
                </div>
                <Dialog open={academicYearDialog} onOpenChange={(open) => {
                  setAcademicYearDialog(open);
                  if (!open) {
                    setEditingAcademicYear(null);
                    setAcademicYearForm({ name: '', start_date: '', end_date: '', is_current: false });
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Year
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingAcademicYear ? 'Edit' : 'Add'} Academic Year</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAcademicYearSubmit} className="space-y-4">
                      <div>
                        <Label>Name</Label>
                        <Input
                          value={academicYearForm.name}
                          onChange={(e) => setAcademicYearForm({ ...academicYearForm, name: e.target.value })}
                          placeholder="e.g., 2024/2025"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Start Date</Label>
                          <Input
                            type="date"
                            value={academicYearForm.start_date}
                            onChange={(e) => setAcademicYearForm({ ...academicYearForm, start_date: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label>End Date</Label>
                          <Input
                            type="date"
                            value={academicYearForm.end_date}
                            onChange={(e) => setAcademicYearForm({ ...academicYearForm, end_date: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={academicYearForm.is_current}
                          onCheckedChange={(checked) => setAcademicYearForm({ ...academicYearForm, is_current: checked })}
                        />
                        <Label>Current Academic Year</Label>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setAcademicYearDialog(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">Save</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {academicYears.map((year) => (
                      <TableRow key={year.id}>
                        <TableCell className="font-medium">{year.name}</TableCell>
                        <TableCell>{format(new Date(year.start_date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>{format(new Date(year.end_date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          {year.is_current ? (
                            <Badge className="bg-green-500">Current</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingAcademicYear(year);
                                setAcademicYearForm({
                                  name: year.name,
                                  start_date: year.start_date,
                                  end_date: year.end_date,
                                  is_current: year.is_current,
                                });
                                setAcademicYearDialog(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteAcademicYear(year.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {academicYears.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No academic years defined
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Student Types Tab */}
          <TabsContent value="student-types">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Student Types</CardTitle>
                  <CardDescription>Categories for different types of students</CardDescription>
                </div>
                <Dialog open={studentTypeDialog} onOpenChange={(open) => {
                  setStudentTypeDialog(open);
                  if (!open) {
                    setEditingStudentType(null);
                    setStudentTypeForm({ name: '', description: '', is_active: true });
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Type
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingStudentType ? 'Edit' : 'Add'} Student Type</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleStudentTypeSubmit} className="space-y-4">
                      <div>
                        <Label>Name</Label>
                        <Input
                          value={studentTypeForm.name}
                          onChange={(e) => setStudentTypeForm({ ...studentTypeForm, name: e.target.value })}
                          placeholder="e.g., Regular, Correspondence"
                          required
                        />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={studentTypeForm.description}
                          onChange={(e) => setStudentTypeForm({ ...studentTypeForm, description: e.target.value })}
                          placeholder="Optional description"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={studentTypeForm.is_active}
                          onCheckedChange={(checked) => setStudentTypeForm({ ...studentTypeForm, is_active: checked })}
                        />
                        <Label>Active</Label>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setStudentTypeDialog(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">Save</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentTypes.map((type) => (
                      <TableRow key={type.id}>
                        <TableCell className="font-medium">{type.name}</TableCell>
                        <TableCell className="text-muted-foreground">{type.description || '-'}</TableCell>
                        <TableCell>
                          {type.is_active ? (
                            <Badge className="bg-green-500">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingStudentType(type);
                                setStudentTypeForm({
                                  name: type.name,
                                  description: type.description || '',
                                  is_active: type.is_active,
                                });
                                setStudentTypeDialog(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteStudentType(type.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {studentTypes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No student types defined
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Session Types Tab */}
          <TabsContent value="session-types">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Session Types</CardTitle>
                  <CardDescription>Define types of sessions (e.g., Morning, Afternoon)</CardDescription>
                </div>
                <Dialog open={sessionTypeDialog} onOpenChange={(open) => {
                  setSessionTypeDialog(open);
                  if (!open) {
                    setEditingSessionType(null);
                    setSessionTypeForm({ name: '', description: '', is_active: true });
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Type
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingSessionType ? 'Edit' : 'Add'} Session Type</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSessionTypeSubmit} className="space-y-4">
                      <div>
                        <Label>Name</Label>
                        <Input
                          value={sessionTypeForm.name}
                          onChange={(e) => setSessionTypeForm({ ...sessionTypeForm, name: e.target.value })}
                          placeholder="e.g., Morning, Full Day"
                          required
                        />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={sessionTypeForm.description}
                          onChange={(e) => setSessionTypeForm({ ...sessionTypeForm, description: e.target.value })}
                          placeholder="Optional description"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={sessionTypeForm.is_active}
                          onCheckedChange={(checked) => setSessionTypeForm({ ...sessionTypeForm, is_active: checked })}
                        />
                        <Label>Active</Label>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setSessionTypeDialog(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">Save</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessionTypes.map((type) => (
                      <TableRow key={type.id}>
                        <TableCell className="font-medium">{type.name}</TableCell>
                        <TableCell className="text-muted-foreground">{type.description || '-'}</TableCell>
                        <TableCell>
                          {type.is_active ? (
                            <Badge className="bg-green-500">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingSessionType(type);
                                setSessionTypeForm({
                                  name: type.name,
                                  description: type.description || '',
                                  is_active: type.is_active,
                                });
                                setSessionTypeDialog(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteSessionType(type.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {sessionTypes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No session types defined
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Sessions</CardTitle>
                  <CardDescription>Define session periods (terms/semesters) within academic years</CardDescription>
                </div>
                <Dialog open={sessionDialog} onOpenChange={(open) => {
                  setSessionDialog(open);
                  if (!open) {
                    setEditingSession(null);
                    setSessionForm({ academic_year_id: '', session_type_id: '', name: '', start_date: '', end_date: '', is_active: true });
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Session
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingSession ? 'Edit' : 'Add'} Session</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSessionSubmit} className="space-y-4">
                      <div>
                        <Label>Academic Year</Label>
                        <Select
                          value={sessionForm.academic_year_id}
                          onValueChange={(value) => setSessionForm({ ...sessionForm, academic_year_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select academic year" />
                          </SelectTrigger>
                          <SelectContent>
                            {academicYears.map((year) => (
                              <SelectItem key={year.id} value={year.id}>
                                {year.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Session Type (Optional)</Label>
                        <Select
                          value={sessionForm.session_type_id}
                          onValueChange={(value) => setSessionForm({ ...sessionForm, session_type_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select session type" />
                          </SelectTrigger>
                          <SelectContent>
                            {sessionTypes.map((type) => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Name</Label>
                        <Input
                          value={sessionForm.name}
                          onChange={(e) => setSessionForm({ ...sessionForm, name: e.target.value })}
                          placeholder="e.g., Term 1, First Semester"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Start Date</Label>
                          <Input
                            type="date"
                            value={sessionForm.start_date}
                            onChange={(e) => setSessionForm({ ...sessionForm, start_date: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label>End Date</Label>
                          <Input
                            type="date"
                            value={sessionForm.end_date}
                            onChange={(e) => setSessionForm({ ...sessionForm, end_date: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={sessionForm.is_active}
                          onCheckedChange={(checked) => setSessionForm({ ...sessionForm, is_active: checked })}
                        />
                        <Label>Active</Label>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setSessionDialog(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">Save</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Academic Year</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => {
                      const year = academicYears.find((y) => y.id === session.academic_year_id);
                      return (
                        <TableRow key={session.id}>
                          <TableCell className="font-medium">{session.name}</TableCell>
                          <TableCell>{year?.name || '-'}</TableCell>
                          <TableCell>{format(new Date(session.start_date), 'MMM d, yyyy')}</TableCell>
                          <TableCell>{format(new Date(session.end_date), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            {session.is_active ? (
                              <Badge className="bg-green-500">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingSession(session);
                                  setSessionForm({
                                    academic_year_id: session.academic_year_id,
                                    session_type_id: session.session_type_id || '',
                                    name: session.name,
                                    start_date: session.start_date,
                                    end_date: session.end_date,
                                    is_active: session.is_active,
                                  });
                                  setSessionDialog(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteSession(session.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {sessions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No sessions defined
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </div>
  );
}
