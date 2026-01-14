-- Create online classes table
CREATE TABLE public.online_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  meeting_link TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create class attendance table
CREATE TABLE public.class_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.online_classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT DEFAULT 'absent' CHECK (status IN ('present', 'absent', 'late', 'excused')),
  marked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  marked_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(class_id, user_id)
);

-- Enable RLS
ALTER TABLE public.online_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_attendance ENABLE ROW LEVEL SECURITY;

-- Online classes policies
CREATE POLICY "Admins can manage all online classes"
  ON public.online_classes FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can manage their course online classes"
  ON public.online_classes FOR ALL
  USING (EXISTS (
    SELECT 1 FROM lms_courses c
    WHERE c.id = online_classes.course_id
    AND c.created_by = auth.uid()
  ));

CREATE POLICY "Enrolled users can view online classes"
  ON public.online_classes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM lms_enrollments e
    WHERE e.course_id = online_classes.course_id
    AND e.user_id = auth.uid()
    AND e.status = 'active'
  ));

-- Class attendance policies
CREATE POLICY "Admins can manage all attendance"
  ON public.class_attendance FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can manage attendance for their courses"
  ON public.class_attendance FOR ALL
  USING (EXISTS (
    SELECT 1 FROM online_classes oc
    JOIN lms_courses c ON c.id = oc.course_id
    WHERE oc.id = class_attendance.class_id
    AND c.created_by = auth.uid()
  ));

CREATE POLICY "Users can view their own attendance"
  ON public.class_attendance FOR SELECT
  USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_online_classes_course_id ON public.online_classes(course_id);
CREATE INDEX idx_online_classes_scheduled_at ON public.online_classes(scheduled_at);
CREATE INDEX idx_class_attendance_class_id ON public.class_attendance(class_id);
CREATE INDEX idx_class_attendance_user_id ON public.class_attendance(user_id);