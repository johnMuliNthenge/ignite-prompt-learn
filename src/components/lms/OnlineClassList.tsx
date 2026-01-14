import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Video,
  Calendar,
  Clock,
  ExternalLink,
  Loader2,
  UserCheck,
} from 'lucide-react';
import { format, isPast, isFuture, isToday } from 'date-fns';

interface OnlineClass {
  id: string;
  title: string;
  description: string | null;
  meeting_link: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
}

interface MyAttendance {
  class_id: string;
  status: string;
  marked_at: string;
}

interface OnlineClassListProps {
  courseId: string;
  isEnrolled: boolean;
}

export default function OnlineClassList({ courseId, isEnrolled }: OnlineClassListProps) {
  const { user } = useAuth();
  const [classes, setClasses] = useState<OnlineClass[]>([]);
  const [myAttendance, setMyAttendance] = useState<Record<string, MyAttendance>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClasses();
  }, [courseId]);

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('online_classes')
        .select('*')
        .eq('course_id', courseId)
        .neq('status', 'cancelled')
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setClasses(data || []);

      // Fetch user's attendance records
      if (user && isEnrolled) {
        const classIds = data?.map((c) => c.id) || [];
        if (classIds.length > 0) {
          const { data: attendanceData } = await supabase
            .from('class_attendance')
            .select('*')
            .eq('user_id', user.id)
            .in('class_id', classIds);

          const attendanceMap: Record<string, MyAttendance> = {};
          attendanceData?.forEach((a) => {
            attendanceMap[a.class_id] = a;
          });
          setMyAttendance(attendanceMap);
        }
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getClassStatus = (onlineClass: OnlineClass) => {
    const classDate = new Date(onlineClass.scheduled_at);
    const endTime = new Date(classDate.getTime() + onlineClass.duration_minutes * 60000);
    const now = new Date();

    if (onlineClass.status === 'completed') {
      return { label: 'Completed', variant: 'outline' as const };
    }
    if (onlineClass.status === 'in_progress' || (now >= classDate && now <= endTime)) {
      return { label: 'Live Now', variant: 'default' as const };
    }
    if (isToday(classDate)) {
      return { label: 'Today', variant: 'secondary' as const };
    }
    if (isFuture(classDate)) {
      return { label: 'Upcoming', variant: 'secondary' as const };
    }
    return { label: 'Past', variant: 'outline' as const };
  };

  const getAttendanceBadge = (classId: string) => {
    const attendance = myAttendance[classId];
    if (!attendance) return null;

    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      present: 'default',
      absent: 'destructive',
      late: 'secondary',
      excused: 'outline',
    };

    return (
      <Badge variant={variants[attendance.status]} className="ml-2">
        <UserCheck className="mr-1 h-3 w-3" />
        {attendance.status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Video className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">No online classes scheduled</p>
      </div>
    );
  }

  // Separate upcoming and past classes
  const upcomingClasses = classes.filter((c) => 
    c.status !== 'completed' && isFuture(new Date(c.scheduled_at))
  );
  const pastClasses = classes.filter((c) => 
    c.status === 'completed' || isPast(new Date(c.scheduled_at))
  );

  return (
    <div className="space-y-6">
      {upcomingClasses.length > 0 && (
        <div>
          <h3 className="mb-4 font-semibold">Upcoming Classes</h3>
          <div className="space-y-3">
            {upcomingClasses.map((onlineClass) => {
              const status = getClassStatus(onlineClass);
              return (
                <Card key={onlineClass.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className={`rounded-lg p-3 ${status.label === 'Live Now' ? 'bg-green-500/10' : 'bg-primary/10'}`}>
                        <Video className={`h-5 w-5 ${status.label === 'Live Now' ? 'text-green-500' : 'text-primary'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{onlineClass.title}</h4>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                        {onlineClass.description && (
                          <p className="text-sm text-muted-foreground">{onlineClass.description}</p>
                        )}
                        <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(onlineClass.scheduled_at), 'EEE, MMM d')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(onlineClass.scheduled_at), 'h:mm a')} ({onlineClass.duration_minutes} min)
                          </span>
                        </div>
                      </div>
                    </div>
                    {isEnrolled && onlineClass.meeting_link && (status.label === 'Live Now' || status.label === 'Today') && (
                      <Button onClick={() => window.open(onlineClass.meeting_link!, '_blank')}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Join Class
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {pastClasses.length > 0 && (
        <div>
          <h3 className="mb-4 font-semibold">Past Classes</h3>
          <div className="space-y-3">
            {pastClasses.map((onlineClass) => (
              <Card key={onlineClass.id} className="bg-muted/30">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-muted p-3">
                      <Video className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{onlineClass.title}</h4>
                        {getAttendanceBadge(onlineClass.id)}
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(onlineClass.scheduled_at), 'PPP')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(onlineClass.scheduled_at), 'p')}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
