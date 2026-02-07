import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface ClassOption {
  id: string;
  name: string;
  programme_id: string | null;
}

interface SessionOption {
  id: string;
  name: string;
}

interface ProgrammeInfo {
  id: string;
  name: string;
}

interface SubjectOption {
  id: string;
  name: string;
  code: string;
  is_compulsory: boolean;
  credit_hours: number | null;
}

interface Registration {
  id: string;
  subject_id: string;
  subject_name: string;
  subject_code: string;
}

export default function SubjectRegistration() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [programme, setProgramme] = useState<ProgrammeInfo | null>(null);
  const [availableSubjects, setAvailableSubjects] = useState<SubjectOption[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(new Set());
  const [existingRegistrations, setExistingRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // Fetch classes and sessions on mount
  useEffect(() => {
    fetchClasses();
    fetchSessions();
  }, []);

  // When class changes, fetch programme and subjects
  useEffect(() => {
    if (selectedClassId) {
      const cls = classes.find(c => c.id === selectedClassId);
      if (cls?.programme_id) {
        fetchProgrammeAndSubjects(cls.programme_id);
      } else {
        setProgramme(null);
        setAvailableSubjects([]);
      }
    } else {
      setProgramme(null);
      setAvailableSubjects([]);
    }
  }, [selectedClassId, classes]);

  // When class + session selected, fetch existing registrations
  useEffect(() => {
    if (selectedClassId && selectedSessionId) {
      fetchExistingRegistrations();
    } else {
      setExistingRegistrations([]);
    }
  }, [selectedClassId, selectedSessionId]);

  const fetchClasses = async () => {
    const { data } = await supabase
      .from('classes')
      .select('id, name, programme_id')
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

  const fetchProgrammeAndSubjects = async (programmeId: string) => {
    setLoadingSubjects(true);
    try {
      // Fetch programme name
      const { data: progData } = await supabase
        .from('programmes')
        .select('id, name')
        .eq('id', programmeId)
        .single();

      setProgramme(progData);

      // Fetch subjects via curriculum -> curriculum_subjects
      const { data: currData } = await supabase
        .from('curriculum')
        .select('id')
        .eq('programme_id', programmeId)
        .eq('is_active', true);

      if (currData && currData.length > 0) {
        const curriculumIds = currData.map(c => c.id);
        const { data: csData } = await supabase
          .from('curriculum_subjects')
          .select(`
            subject_id,
            is_compulsory,
            credit_hours,
            subjects:subject_id (id, name, code)
          `)
          .in('curriculum_id', curriculumIds);

        if (csData) {
          // Deduplicate by subject_id
          const subjectMap = new Map<string, SubjectOption>();
          csData.forEach((cs: any) => {
            if (cs.subjects && !subjectMap.has(cs.subject_id)) {
              subjectMap.set(cs.subject_id, {
                id: cs.subjects.id,
                name: cs.subjects.name,
                code: cs.subjects.code,
                is_compulsory: cs.is_compulsory ?? false,
                credit_hours: cs.credit_hours,
              });
            }
          });
          setAvailableSubjects(Array.from(subjectMap.values()));
        }
      } else {
        setAvailableSubjects([]);
      }
    } catch (error) {
      console.error('Error fetching programme subjects:', error);
    } finally {
      setLoadingSubjects(false);
    }
  };

  const fetchExistingRegistrations = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('class_subject_registrations')
        .select(`
          id,
          subject_id,
          subjects:subject_id (name, code)
        `)
        .eq('class_id', selectedClassId)
        .eq('session_id', selectedSessionId);

      if (data) {
        setExistingRegistrations(
          data.map((r: any) => ({
            id: r.id,
            subject_id: r.subject_id,
            subject_name: r.subjects?.name || '',
            subject_code: r.subjects?.code || '',
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjectIds(prev => {
      const next = new Set(prev);
      if (next.has(subjectId)) {
        next.delete(subjectId);
      } else {
        next.add(subjectId);
      }
      return next;
    });
  };

  const selectAll = () => {
    const alreadyRegistered = new Set(existingRegistrations.map(r => r.subject_id));
    const unregistered = availableSubjects.filter(s => !alreadyRegistered.has(s.id));
    setSelectedSubjectIds(new Set(unregistered.map(s => s.id)));
  };

  const deselectAll = () => {
    setSelectedSubjectIds(new Set());
  };

  const handleRegister = async () => {
    if (!selectedClassId || !selectedSessionId || selectedSubjectIds.size === 0) {
      toast({
        title: 'Missing selection',
        description: 'Please select a class, session, and at least one subject.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const rows = Array.from(selectedSubjectIds).map(subjectId => ({
        class_id: selectedClassId,
        session_id: selectedSessionId,
        subject_id: subjectId,
        registered_by: user?.id,
      }));

      const { error } = await supabase
        .from('class_subject_registrations')
        .insert(rows);

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Duplicate',
            description: 'Some subjects are already registered for this class and session.',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
      } else {
        toast({ title: 'Subjects registered successfully!' });
        setSelectedSubjectIds(new Set());
        fetchExistingRegistrations();
      }
    } catch (error: any) {
      console.error('Error registering subjects:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to register subjects',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (registrationId: string) => {
    try {
      const { error } = await supabase
        .from('class_subject_registrations')
        .delete()
        .eq('id', registrationId);

      if (error) throw error;

      toast({ title: 'Subject removed from registration' });
      fetchExistingRegistrations();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove subject',
        variant: 'destructive',
      });
    }
  };

  const alreadyRegistered = new Set(existingRegistrations.map(r => r.subject_id));
  const unregisteredSubjects = availableSubjects.filter(s => !alreadyRegistered.has(s.id));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Subject Registration</h1>
        <p className="text-muted-foreground">
          Register subjects for a class in a given session based on the programme curriculum
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Class & Session</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
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
                  {sessions.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Programme</Label>
              <div className="h-10 flex items-center px-3 rounded-md border bg-muted/50 text-sm">
                {programme ? programme.name : <span className="text-muted-foreground">Auto-populated from class</span>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Subjects to Register */}
      {selectedClassId && selectedSessionId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Available Subjects</CardTitle>
                <CardDescription>
                  {programme
                    ? `Subjects from ${programme.name} curriculum`
                    : 'No programme linked to this class'}
                </CardDescription>
              </div>
              {unregisteredSubjects.length > 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>Select All</Button>
                  <Button variant="outline" size="sm" onClick={deselectAll}>Deselect All</Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingSubjects ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : unregisteredSubjects.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">
                {availableSubjects.length === 0
                  ? 'No subjects found in the curriculum for this programme. Please set up the curriculum first.'
                  : 'All available subjects are already registered.'}
              </p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Select</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Subject Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Credit Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unregisteredSubjects.map(subject => (
                      <TableRow key={subject.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedSubjectIds.has(subject.id)}
                            onCheckedChange={() => toggleSubject(subject.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{subject.code}</TableCell>
                        <TableCell className="font-medium">{subject.name}</TableCell>
                        <TableCell>
                          <Badge variant={subject.is_compulsory ? 'default' : 'secondary'}>
                            {subject.is_compulsory ? 'Compulsory' : 'Elective'}
                          </Badge>
                        </TableCell>
                        <TableCell>{subject.credit_hours ?? '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex justify-end mt-4">
                  <Button onClick={handleRegister} disabled={saving || selectedSubjectIds.size === 0}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Register {selectedSubjectIds.size} Subject{selectedSubjectIds.size !== 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Already Registered Subjects */}
      {selectedClassId && selectedSessionId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Registered Subjects</CardTitle>
            <CardDescription>Subjects already registered for this class and session</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : existingRegistrations.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">No subjects registered yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Subject Name</TableHead>
                    <TableHead className="w-20">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {existingRegistrations.map(reg => (
                    <TableRow key={reg.id}>
                      <TableCell className="font-mono text-sm">{reg.subject_code}</TableCell>
                      <TableCell className="font-medium">{reg.subject_name}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemove(reg.id)}
                        >
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
      )}
    </div>
  );
}
