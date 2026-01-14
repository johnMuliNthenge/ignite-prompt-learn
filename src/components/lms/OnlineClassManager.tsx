import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Video,
  Plus,
  Pencil,
  Trash2,
  Copy,
  ExternalLink,
  Users,
  Calendar,
  Clock,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import AttendanceManager from './AttendanceManager';

interface OnlineClass {
  id: string;
  title: string;
  description: string | null;
  meeting_link: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  created_by: string | null;
}

interface OnlineClassManagerProps {
  courseId: string;
}

export default function OnlineClassManager({ courseId }: OnlineClassManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<OnlineClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog states
  const [showClassDialog, setShowClassDialog] = useState(false);
  const [editingClass, setEditingClass] = useState<OnlineClass | null>(null);
  const [classForm, setClassForm] = useState({
    title: '',
    description: '',
    meeting_link: '',
    scheduled_at: '',
    duration_minutes: 60,
  });

  // Attendance dialog
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  useEffect(() => {
    fetchClasses();
  }, [courseId]);

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('online_classes')
        .select('*')
        .eq('course_id', courseId)
        .order('scheduled_at', { ascending: false });

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load online classes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openClassDialog = (onlineClass?: OnlineClass) => {
    if (onlineClass) {
      setEditingClass(onlineClass);
      setClassForm({
        title: onlineClass.title,
        description: onlineClass.description || '',
        meeting_link: onlineClass.meeting_link || '',
        scheduled_at: onlineClass.scheduled_at.slice(0, 16),
        duration_minutes: onlineClass.duration_minutes,
      });
    } else {
      setEditingClass(null);
      setClassForm({
        title: '',
        description: '',
        meeting_link: '',
        scheduled_at: '',
        duration_minutes: 60,
      });
    }
    setShowClassDialog(true);
  };

  const saveClass = async () => {
    if (!classForm.title.trim() || !classForm.scheduled_at) {
      toast({
        title: 'Error',
        description: 'Please fill in title and scheduled time',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      if (editingClass) {
        const { error } = await supabase
          .from('online_classes')
          .update({
            title: classForm.title,
            description: classForm.description || null,
            meeting_link: classForm.meeting_link || null,
            scheduled_at: classForm.scheduled_at,
            duration_minutes: classForm.duration_minutes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingClass.id);

        if (error) throw error;
        toast({ title: 'Class updated successfully' });
      } else {
        const { error } = await supabase.from('online_classes').insert({
          course_id: courseId,
          title: classForm.title,
          description: classForm.description || null,
          meeting_link: classForm.meeting_link || null,
          scheduled_at: classForm.scheduled_at,
          duration_minutes: classForm.duration_minutes,
          created_by: user?.id,
        });

        if (error) throw error;
        toast({ title: 'Class created successfully' });
      }

      setShowClassDialog(false);
      fetchClasses();
    } catch (error) {
      console.error('Error saving class:', error);
      toast({
        title: 'Error',
        description: 'Failed to save class',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteClass = async (classId: string) => {
    if (!confirm('Delete this online class and all attendance records?')) return;

    try {
      const { error } = await supabase
        .from('online_classes')
        .delete()
        .eq('id', classId);

      if (error) throw error;
      toast({ title: 'Class deleted' });
      fetchClasses();
    } catch (error) {
      console.error('Error deleting class:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete class',
        variant: 'destructive',
      });
    }
  };

  const updateStatus = async (classId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('online_classes')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', classId);

      if (error) throw error;
      fetchClasses();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast({ title: 'Link copied to clipboard' });
  };

  const openAttendance = (classId: string) => {
    setSelectedClassId(classId);
    setShowAttendanceDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      scheduled: 'secondary',
      in_progress: 'default',
      completed: 'outline',
      cancelled: 'destructive',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status.replace('_', ' ')}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Online Classes</h3>
          <p className="text-sm text-muted-foreground">
            Schedule live sessions and track attendance
          </p>
        </div>
        <Button onClick={() => openClassDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Create Class
        </Button>
      </div>

      {classes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Video className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No online classes scheduled</p>
            <Button variant="outline" className="mt-4" onClick={() => openClassDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Schedule Your First Class
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {classes.map((onlineClass) => (
            <Card key={onlineClass.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Video className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{onlineClass.title}</CardTitle>
                      {onlineClass.description && (
                        <CardDescription>{onlineClass.description}</CardDescription>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(onlineClass.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(onlineClass.scheduled_at), 'PPP')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {format(new Date(onlineClass.scheduled_at), 'p')} ({onlineClass.duration_minutes} min)
                  </div>
                </div>

                {onlineClass.meeting_link && (
                  <div className="mt-3 flex items-center gap-2">
                    <Input
                      value={onlineClass.meeting_link}
                      readOnly
                      className="flex-1 text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyLink(onlineClass.meeting_link!)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => window.open(onlineClass.meeting_link!, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Select
                    value={onlineClass.status}
                    onValueChange={(value) => updateStatus(onlineClass.id, value)}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    onClick={() => openAttendance(onlineClass.id)}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Attendance
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => openClassDialog(onlineClass)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => deleteClass(onlineClass.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Class Dialog */}
      <Dialog open={showClassDialog} onOpenChange={setShowClassDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingClass ? 'Edit Online Class' : 'Create Online Class'}
            </DialogTitle>
            <DialogDescription>
              Schedule a live session for your students
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Class Title *</Label>
              <Input
                id="title"
                value={classForm.title}
                onChange={(e) => setClassForm({ ...classForm, title: e.target.value })}
                placeholder="e.g., Week 1 - Introduction"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={classForm.description}
                onChange={(e) => setClassForm({ ...classForm, description: e.target.value })}
                placeholder="Brief description of what will be covered"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="meeting_link">Meeting Link</Label>
              <Input
                id="meeting_link"
                value={classForm.meeting_link}
                onChange={(e) => setClassForm({ ...classForm, meeting_link: e.target.value })}
                placeholder="https://zoom.us/j/..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="scheduled_at">Date & Time *</Label>
                <Input
                  id="scheduled_at"
                  type="datetime-local"
                  value={classForm.scheduled_at}
                  onChange={(e) => setClassForm({ ...classForm, scheduled_at: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={classForm.duration_minutes}
                  onChange={(e) =>
                    setClassForm({ ...classForm, duration_minutes: parseInt(e.target.value) || 60 })
                  }
                  min={15}
                  max={480}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClassDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveClass} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingClass ? 'Update Class' : 'Create Class'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attendance Dialog */}
      <Dialog open={showAttendanceDialog} onOpenChange={setShowAttendanceDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Class Attendance</DialogTitle>
            <DialogDescription>
              Mark attendance for enrolled students
            </DialogDescription>
          </DialogHeader>

          {selectedClassId && (
            <AttendanceManager
              classId={selectedClassId}
              courseId={courseId}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
