import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Eye, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface ClassOption {
  id: string;
  name: string;
}

interface SessionOption {
  id: string;
  name: string;
}

interface StudentRow {
  id: string;
  student_no: string;
  surname: string;
  other_name: string;
  registered_count: number;
}

interface SubjectDetail {
  id: string;
  registration_id: string;
  name: string;
  code: string;
}

const PAGE_SIZE = 10;

export default function SubjectRegistrationList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // View/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit'>('view');
  const [dialogStudent, setDialogStudent] = useState<StudentRow | null>(null);
  const [studentSubjects, setStudentSubjects] = useState<SubjectDetail[]>([]);
  const [allSubjects, setAllSubjects] = useState<{ id: string; name: string; code: string }[]>([]);
  const [editSelectedIds, setEditSelectedIds] = useState<Set<string>>(new Set());
  const [dialogLoading, setDialogLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchClasses();
    fetchSessions();
  }, []);

  useEffect(() => {
    if (selectedClassId && selectedSessionId) {
      setCurrentPage(1);
      fetchStudents();
    } else {
      setStudents([]);
    }
  }, [selectedClassId, selectedSessionId]);

  const fetchClasses = async () => {
    const { data } = await supabase
      .from('classes')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    setClasses(data || []);
  };

  const fetchSessions = async () => {
    const { data } = await supabase
      .from('sessions')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    setSessions(data || []);
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      // Get students in the selected class
      const { data: studentData } = await (supabase as any)
        .from('students')
        .select('id, student_no, surname, other_name')
        .eq('class_id', selectedClassId)
        .eq('is_active', true)
        .order('surname');

      if (!studentData || studentData.length === 0) {
        setStudents([]);
        return;
      }

      // Get registration counts for this class+session per subject
      const { data: regData } = await supabase
        .from('class_subject_registrations')
        .select('subject_id')
        .eq('class_id', selectedClassId)
        .eq('session_id', selectedSessionId);

      const registeredCount = regData?.length || 0;

      // All students in a class share the same class-level registrations
      setStudents(
        (studentData as any[]).map((s: any) => ({
          id: s.id,
          student_no: s.student_no || '',
          surname: s.surname || '',
          other_name: s.other_name || '',
          registered_count: registeredCount,
        }))
      );
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const openDialog = async (student: StudentRow, mode: 'view' | 'edit') => {
    setDialogStudent(student);
    setDialogMode(mode);
    setDialogOpen(true);
    setDialogLoading(true);

    try {
      // Fetch registered subjects for this class+session
      const { data: regData } = await supabase
        .from('class_subject_registrations')
        .select(`
          id,
          subject_id,
          subjects:subject_id (id, name, code)
        `)
        .eq('class_id', selectedClassId)
        .eq('session_id', selectedSessionId);

      const subjects: SubjectDetail[] = (regData || []).map((r: any) => ({
        id: r.subject_id,
        registration_id: r.id,
        name: r.subjects?.name || '',
        code: r.subjects?.code || '',
      }));
      setStudentSubjects(subjects);

      if (mode === 'edit') {
        // Fetch all available subjects from programme curriculum
        const { data: classData } = await supabase
          .from('classes')
          .select('programme_id')
          .eq('id', selectedClassId)
          .single();

        if (classData?.programme_id) {
          const { data: currData } = await supabase
            .from('curriculum')
            .select('id')
            .eq('programme_id', classData.programme_id)
            .eq('is_active', true);

          if (currData && currData.length > 0) {
            const curriculumIds = currData.map((c) => c.id);
            const { data: csData } = await supabase
              .from('curriculum_subjects')
              .select('subject_id, subjects:subject_id (id, name, code)')
              .in('curriculum_id', curriculumIds as [string, ...string[]]);

            const subMap = new Map<string, { id: string; name: string; code: string }>();
            (csData || []).forEach((cs: any) => {
              if (cs.subjects && !subMap.has(cs.subject_id)) {
                subMap.set(cs.subject_id, {
                  id: cs.subjects.id,
                  name: cs.subjects.name,
                  code: cs.subjects.code,
                });
              }
            });
            setAllSubjects(Array.from(subMap.values()));
          }
        }

        setEditSelectedIds(new Set(subjects.map((s) => s.id)));
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
    } finally {
      setDialogLoading(false);
    }
  };

  const handleEditSave = async () => {
    setSaving(true);
    try {
      const currentIds = new Set(studentSubjects.map((s) => s.id));
      const toAdd = Array.from(editSelectedIds).filter((id) => !currentIds.has(id));
      const toRemove = studentSubjects.filter((s) => !editSelectedIds.has(s.id));

      // Remove deselected
      if (toRemove.length > 0) {
        const { error } = await supabase
          .from('class_subject_registrations')
          .delete()
          .in('id', toRemove.map((s) => s.registration_id));
        if (error) throw error;
      }

      // Add new
      if (toAdd.length > 0) {
        const { error } = await supabase
          .from('class_subject_registrations')
          .insert(
            toAdd.map((subjectId) => ({
              class_id: selectedClassId,
              session_id: selectedSessionId,
              subject_id: subjectId,
              registered_by: user?.id,
            }))
          );
        if (error) throw error;
      }

      toast({ title: 'Subject registrations updated successfully' });
      setDialogOpen(false);
      fetchStudents();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Pagination
  const totalPages = Math.ceil(students.length / PAGE_SIZE);
  const paginatedStudents = students.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Subject Registration</h1>
          <p className="text-muted-foreground">
            View students and their registered subjects per class and session
          </p>
        </div>
        <Button onClick={() => navigate('/lms/academics/subject-registration/register')}>
          <Plus className="mr-2 h-4 w-4" />
          Register Subjects
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Class & Session</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Session</Label>
              <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student Listing */}
      {selectedClassId && selectedSessionId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Students</CardTitle>
            <CardDescription>
              {students.length} student{students.length !== 1 ? 's' : ''} in this class
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : students.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">
                No students found in this class
              </p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Student No</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-center">Registered Subjects</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedStudents.map((student, idx) => (
                      <TableRow key={student.id}>
                        <TableCell className="text-muted-foreground">
                          {(currentPage - 1) * PAGE_SIZE + idx + 1}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{student.student_no}</TableCell>
                        <TableCell className="font-medium">
                          {student.surname} {student.other_name}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={student.registered_count > 0 ? 'default' : 'secondary'}>
                            {student.registered_count}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDialog(student, 'view')}
                            >
                              <Eye className="mr-1 h-3.5 w-3.5" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDialog(student, 'edit')}
                            >
                              <Pencil className="mr-1 h-3.5 w-3.5" />
                              Edit
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* View/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'view' ? 'Registered Subjects' : 'Edit Subject Registration'}
              {dialogStudent && (
                <span className="block text-sm font-normal text-muted-foreground mt-1">
                  {dialogStudent.surname} {dialogStudent.other_name} ({dialogStudent.student_no})
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {dialogLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : dialogMode === 'view' ? (
            <div className="space-y-2">
              {studentSubjects.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No subjects registered</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Subject</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentSubjects.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-sm">{s.code}</TableCell>
                        <TableCell>{s.name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {allSubjects.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No subjects found in the curriculum
                </p>
              ) : (
                <div className="max-h-[400px] overflow-y-auto space-y-2">
                  {allSubjects.map((subject) => (
                    <label
                      key={subject.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={editSelectedIds.has(subject.id)}
                        onCheckedChange={() => {
                          setEditSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(subject.id)) {
                              next.delete(subject.id);
                            } else {
                              next.add(subject.id);
                            }
                            return next;
                          });
                        }}
                      />
                      <span className="font-mono text-xs text-muted-foreground">{subject.code}</span>
                      <span className="text-sm">{subject.name}</span>
                    </label>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleEditSave} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
