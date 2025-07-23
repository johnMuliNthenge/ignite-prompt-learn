-- Create course packages table
CREATE TABLE public.course_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  duration_days INTEGER DEFAULT 5,
  practicals_schedule TEXT, -- 'last_2_days' or 'every_day'
  features TEXT[], -- array of features
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create enrollments table
CREATE TABLE public.enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.course_packages(id) ON DELETE CASCADE,
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'failed'
  payment_method TEXT, -- 'mpesa', 'paypal', 'visa', 'binance'
  payment_reference TEXT,
  amount_paid DECIMAL(10,2),
  access_link_token TEXT UNIQUE,
  access_link_expires_at TIMESTAMP WITH TIME ZONE,
  access_link_active BOOLEAN DEFAULT false,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create course content table
CREATE TABLE public.course_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT DEFAULT 'theory', -- 'theory' or 'practical'
  content_url TEXT,
  is_premium_only BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default course packages
INSERT INTO public.course_packages (name, description, price, practicals_schedule, features) VALUES 
('Standard', '5-day Prompt Engineering course with practicals in the last 2 days', 99.00, 'last_2_days', ARRAY['5-day course access', 'Theory lessons', 'Practicals on days 4-5', 'Certificate of completion']),
('Premium', '5-day Prompt Engineering course with daily practicals', 199.00, 'every_day', ARRAY['5-day course access', 'Theory lessons', 'Daily practicals', 'One-on-one mentorship', 'Priority support', 'Certificate of completion', 'Bonus materials']);

-- Insert default course content
INSERT INTO public.course_content (day_number, title, description, content_type, is_premium_only) VALUES 
(1, 'Introduction to Prompt Engineering', 'Understanding the fundamentals of AI prompts', 'theory', false),
(1, 'Hands-on Prompt Creation', 'Practical session: Building your first prompts', 'practical', true),
(2, 'Advanced Prompting Techniques', 'Chain-of-thought, few-shot learning, and more', 'theory', false),
(2, 'Advanced Prompt Workshop', 'Practice advanced techniques', 'practical', true),
(3, 'Prompt Optimization Strategies', 'Making your prompts more effective', 'theory', false),
(3, 'Optimization Lab', 'Hands-on optimization exercises', 'practical', true),
(4, 'Real-world Applications', 'Industry use cases and best practices', 'theory', false),
(4, 'Project Development', 'Build a complete prompt-based project', 'practical', false),
(5, 'Scaling and Deployment', 'Taking prompts to production', 'theory', false),
(5, 'Final Project Presentation', 'Present and get feedback on your work', 'practical', false);

-- Enable Row Level Security
ALTER TABLE public.course_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_content ENABLE ROW LEVEL SECURITY;

-- Create policies for course_packages (public read)
CREATE POLICY "Everyone can view active course packages" ON public.course_packages
  FOR SELECT
  USING (is_active = true);

-- Create policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policies for enrollments
CREATE POLICY "Users can view own enrollments" ON public.enrollments
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own enrollments" ON public.enrollments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policies for course content
CREATE POLICY "Users can view course content if enrolled" ON public.course_content
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments 
      WHERE user_id = auth.uid() 
      AND payment_status = 'paid' 
      AND access_link_active = true
      AND (
        is_premium_only = false 
        OR EXISTS (
          SELECT 1 FROM public.course_packages cp
          WHERE cp.id = enrollments.package_id 
          AND cp.practicals_schedule = 'every_day'
        )
      )
    )
  );

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_course_packages_updated_at
  BEFORE UPDATE ON public.course_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_enrollments_updated_at
  BEFORE UPDATE ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_course_content_updated_at
  BEFORE UPDATE ON public.course_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();