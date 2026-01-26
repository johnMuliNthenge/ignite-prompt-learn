import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import { format, isSameDay, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function LeaveCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const { data: leaves } = useQuery({
    queryKey: ['hr-leave-calendar'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_leave_applications')
        .select(`
          *,
          employee:hr_employees(first_name, last_name),
          leave_type:hr_leave_types(name)
        `)
        .eq('status', 'approved')
        .order('start_date');
      if (error) throw error;
      return data || [];
    }
  });

  const getLeavesForDate = (date: Date) => {
    return leaves?.filter((leave: any) => {
      const start = parseISO(leave.start_date);
      const end = parseISO(leave.end_date);
      return date >= start && date <= end;
    }) || [];
  };

  const selectedDateLeaves = selectedDate ? getLeavesForDate(selectedDate) : [];

  const modifiers = {
    hasLeave: (date: Date) => getLeavesForDate(date).length > 0
  };

  const modifiersStyles = {
    hasLeave: {
      backgroundColor: 'hsl(var(--primary) / 0.2)',
      borderRadius: '50%'
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Leave Calendar</h1>
        <p className="text-muted-foreground">View approved leaves on calendar</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDateLeaves.length === 0 ? (
              <p className="text-muted-foreground">No leaves on this date</p>
            ) : (
              <div className="space-y-4">
                {selectedDateLeaves.map((leave: any) => (
                  <div key={leave.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">
                        {leave.employee?.first_name} {leave.employee?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {leave.leave_type?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(leave.start_date), 'MMM d')} - {format(parseISO(leave.end_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Badge variant="outline">{leave.days_requested} days</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
