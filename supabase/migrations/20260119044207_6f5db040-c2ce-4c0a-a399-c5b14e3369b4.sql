-- Academic years table
CREATE TABLE public.academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Student types (e.g., Regular, Correspondence, etc.)
CREATE TABLE public.student_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Session types (e.g., Morning, Afternoon, Full Day)
CREATE TABLE public.session_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Sessions (date ranges for terms/semesters)
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE NOT NULL,
  session_type_id UUID REFERENCES public.session_types(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Students table
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_no TEXT UNIQUE,
  other_name TEXT NOT NULL,
  surname TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
  upi_number TEXT,
  birth_cert_no TEXT,
  birth_date DATE NOT NULL,
  nationality TEXT NOT NULL,
  phone TEXT NOT NULL,
  religion TEXT,
  county TEXT NOT NULL,
  sub_county TEXT,
  postal_address TEXT,
  physical_address TEXT,
  student_type_id UUID REFERENCES public.student_types(id) ON DELETE SET NULL,
  student_source TEXT,
  financial_aid TEXT,
  email TEXT,
  kcpe_index TEXT,
  kcpe_year INTEGER,
  kcpe_grade TEXT,
  kcse_index TEXT,
  kcse_year INTEGER,
  kcse_grade TEXT,
  class TEXT,
  stay_status TEXT CHECK (stay_status IN ('Resident', 'Non-Resident')),
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Suspended', 'Graduated')),
  stream TEXT,
  sports_house TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- RLS Policies for academic_years (admin can manage, all authenticated can view)
CREATE POLICY "Admin can manage academic_years"
ON public.academic_years FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view academic_years"
ON public.academic_years FOR SELECT
TO authenticated
USING (true);

-- RLS Policies for student_types
CREATE POLICY "Admin can manage student_types"
ON public.student_types FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view student_types"
ON public.student_types FOR SELECT
TO authenticated
USING (true);

-- RLS Policies for session_types
CREATE POLICY "Admin can manage session_types"
ON public.session_types FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view session_types"
ON public.session_types FOR SELECT
TO authenticated
USING (true);

-- RLS Policies for sessions
CREATE POLICY "Admin can manage sessions"
ON public.sessions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view sessions"
ON public.sessions FOR SELECT
TO authenticated
USING (true);

-- RLS Policies for students (admin and teacher can manage)
CREATE POLICY "Admin and Teacher can view students"
ON public.students FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Admin and Teacher can insert students"
ON public.students FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Admin and Teacher can update students"
ON public.students FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Admin can delete students"
ON public.students FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_academic_years_updated_at
BEFORE UPDATE ON public.academic_years
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
BEFORE UPDATE ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_students_updated_at
BEFORE UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate student number
CREATE OR REPLACE FUNCTION public.generate_student_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.student_no IS NULL THEN
    NEW.student_no := 'S' || LPAD(FLOOR(RANDOM() * 1000000000)::TEXT, 12, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_student_number
BEFORE INSERT ON public.students
FOR EACH ROW EXECUTE FUNCTION public.generate_student_number();