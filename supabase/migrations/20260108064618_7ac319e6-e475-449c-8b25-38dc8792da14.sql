-- =============================================
-- LMS DATABASE SCHEMA - FRESH START
-- =============================================

-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student');

-- 2. User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'student',
    created_at timestamptz DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles 
  WHERE user_id = _user_id 
  ORDER BY 
    CASE role 
      WHEN 'admin' THEN 1 
      WHEN 'teacher' THEN 2 
      WHEN 'student' THEN 3 
    END
  LIMIT 1
$$;

-- 5. LMS Profiles table (enhanced)
CREATE TABLE public.lms_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email text NOT NULL,
    full_name text,
    avatar_url text,
    bio text,
    phone text,
    is_active boolean DEFAULT true,
    last_login_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.lms_profiles ENABLE ROW LEVEL SECURITY;

-- 6. Course categories
CREATE TABLE public.course_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    parent_id uuid REFERENCES public.course_categories(id) ON DELETE SET NULL,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.course_categories ENABLE ROW LEVEL SECURITY;

-- 7. Courses table
CREATE TABLE public.lms_courses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    short_description text,
    description text,
    thumbnail_url text,
    category_id uuid REFERENCES public.course_categories(id) ON DELETE SET NULL,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    is_public boolean DEFAULT false,
    enrollment_type text DEFAULT 'open' CHECK (enrollment_type IN ('open', 'approval', 'key')),
    enrollment_key text,
    max_students integer,
    start_date date,
    end_date date,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.lms_courses ENABLE ROW LEVEL SECURITY;

-- 8. Course sections (topics/weeks)
CREATE TABLE public.course_sections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id uuid REFERENCES public.lms_courses(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    description text,
    sort_order integer DEFAULT 0,
    is_visible boolean DEFAULT true,
    unlock_date timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.course_sections ENABLE ROW LEVEL SECURITY;

-- 9. Course resources/activities
CREATE TABLE public.course_resources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id uuid REFERENCES public.course_sections(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    description text,
    resource_type text NOT NULL CHECK (resource_type IN ('file', 'video', 'link', 'text', 'embed', 'scorm')),
    content_url text,
    content_text text,
    file_size integer,
    duration_minutes integer,
    sort_order integer DEFAULT 0,
    is_visible boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.course_resources ENABLE ROW LEVEL SECURITY;

-- 10. Course enrollments
CREATE TABLE public.lms_enrollments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id uuid REFERENCES public.lms_courses(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role text DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'assistant')),
    status text DEFAULT 'active' CHECK (status IN ('pending', 'active', 'completed', 'suspended')),
    enrolled_at timestamptz DEFAULT now(),
    completed_at timestamptz,
    progress_percent integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE (course_id, user_id)
);

ALTER TABLE public.lms_enrollments ENABLE ROW LEVEL SECURITY;

-- 11. Resource progress tracking
CREATE TABLE public.resource_progress (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    resource_id uuid REFERENCES public.course_resources(id) ON DELETE CASCADE NOT NULL,
    is_completed boolean DEFAULT false,
    completed_at timestamptz,
    time_spent_seconds integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE (user_id, resource_id)
);

ALTER TABLE public.resource_progress ENABLE ROW LEVEL SECURITY;

-- 12. Activity logs
CREATE TABLE public.activity_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    action text NOT NULL,
    entity_type text,
    entity_id uuid,
    details jsonb,
    ip_address text,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- User roles policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- LMS Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.lms_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.lms_profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.lms_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.lms_profiles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all profiles"
ON public.lms_profiles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can view enrolled student profiles"
ON public.lms_profiles FOR SELECT
USING (
  public.has_role(auth.uid(), 'teacher') AND
  EXISTS (
    SELECT 1 FROM public.lms_enrollments e1
    JOIN public.lms_enrollments e2 ON e1.course_id = e2.course_id
    WHERE e1.user_id = auth.uid() 
    AND e1.role IN ('teacher', 'assistant')
    AND e2.user_id = lms_profiles.user_id
  )
);

-- Course categories policies
CREATE POLICY "Anyone can view active categories"
ON public.course_categories FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage categories"
ON public.course_categories FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Courses policies
CREATE POLICY "Anyone can view published public courses"
ON public.lms_courses FOR SELECT
USING (status = 'published' AND is_public = true);

CREATE POLICY "Enrolled users can view their courses"
ON public.lms_courses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lms_enrollments
    WHERE course_id = lms_courses.id
    AND user_id = auth.uid()
    AND status = 'active'
  )
);

CREATE POLICY "Teachers can manage their own courses"
ON public.lms_courses FOR ALL
USING (created_by = auth.uid() AND public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Admins can manage all courses"
ON public.lms_courses FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Course sections policies
CREATE POLICY "Users can view sections of enrolled courses"
ON public.course_sections FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lms_enrollments e
    JOIN public.lms_courses c ON c.id = e.course_id
    WHERE c.id = course_sections.course_id
    AND e.user_id = auth.uid()
    AND e.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM public.lms_courses c
    WHERE c.id = course_sections.course_id
    AND c.status = 'published' AND c.is_public = true
  )
);

CREATE POLICY "Teachers can manage sections of their courses"
ON public.course_sections FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.lms_courses
    WHERE id = course_sections.course_id
    AND created_by = auth.uid()
  )
);

CREATE POLICY "Admins can manage all sections"
ON public.course_sections FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Course resources policies
CREATE POLICY "Users can view resources of enrolled courses"
ON public.course_resources FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.course_sections s
    JOIN public.lms_enrollments e ON e.course_id = s.course_id
    WHERE s.id = course_resources.section_id
    AND e.user_id = auth.uid()
    AND e.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM public.course_sections s
    JOIN public.lms_courses c ON c.id = s.course_id
    WHERE s.id = course_resources.section_id
    AND c.status = 'published' AND c.is_public = true
  )
);

CREATE POLICY "Teachers can manage resources of their courses"
ON public.course_resources FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.course_sections s
    JOIN public.lms_courses c ON c.id = s.course_id
    WHERE s.id = course_resources.section_id
    AND c.created_by = auth.uid()
  )
);

CREATE POLICY "Admins can manage all resources"
ON public.course_resources FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Enrollments policies
CREATE POLICY "Users can view their own enrollments"
ON public.lms_enrollments FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can enroll themselves in open courses"
ON public.lms_enrollments FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.lms_courses
    WHERE id = course_id
    AND status = 'published'
    AND enrollment_type = 'open'
  )
);

CREATE POLICY "Teachers can view enrollments in their courses"
ON public.lms_enrollments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lms_courses
    WHERE id = course_id
    AND created_by = auth.uid()
  )
);

CREATE POLICY "Teachers can manage enrollments in their courses"
ON public.lms_enrollments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.lms_courses
    WHERE id = course_id
    AND created_by = auth.uid()
  )
);

CREATE POLICY "Admins can manage all enrollments"
ON public.lms_enrollments FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Resource progress policies
CREATE POLICY "Users can manage their own progress"
ON public.resource_progress FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Teachers can view progress in their courses"
ON public.resource_progress FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.course_resources r
    JOIN public.course_sections s ON s.id = r.section_id
    JOIN public.lms_courses c ON c.id = s.course_id
    WHERE r.id = resource_progress.resource_id
    AND c.created_by = auth.uid()
  )
);

-- Activity logs policies
CREATE POLICY "Users can view their own logs"
ON public.activity_logs FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own logs"
ON public.activity_logs FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all logs"
ON public.activity_logs FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-update updated_at
CREATE TRIGGER update_lms_profiles_updated_at
BEFORE UPDATE ON public.lms_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_course_categories_updated_at
BEFORE UPDATE ON public.course_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lms_courses_updated_at
BEFORE UPDATE ON public.lms_courses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_course_sections_updated_at
BEFORE UPDATE ON public.course_sections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_course_resources_updated_at
BEFORE UPDATE ON public.course_resources
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lms_enrollments_updated_at
BEFORE UPDATE ON public.lms_enrollments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_resource_progress_updated_at
BEFORE UPDATE ON public.resource_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile and assign student role on signup
CREATE OR REPLACE FUNCTION public.handle_new_lms_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.lms_profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', '')
  );
  
  -- Assign default student role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_lms
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_lms_user();