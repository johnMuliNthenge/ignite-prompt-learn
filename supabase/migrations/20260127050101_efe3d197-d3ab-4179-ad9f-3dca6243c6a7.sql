-- Drop existing app_role enum if it exists and create a more flexible system
-- Create permissions enum for actions
CREATE TYPE public.permission_action AS ENUM ('view', 'add', 'edit', 'delete', 'change_status');

-- Create app_roles table for custom roles
CREATE TABLE IF NOT EXISTS public.app_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_system boolean DEFAULT false, -- System roles cannot be deleted
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create modules table to define all system modules
CREATE TABLE IF NOT EXISTS public.app_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE, -- e.g., 'students', 'courses', 'hr.employees'
  name text NOT NULL,
  parent_code text, -- For nested modules like hr.employees
  description text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create role_permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.app_roles(id) ON DELETE CASCADE,
  module_code text NOT NULL,
  action permission_action NOT NULL,
  is_allowed boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(role_id, module_code, action)
);

-- Modify user_roles to reference app_roles instead of enum
-- First, let's add a new column for the custom role
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS app_role_id uuid REFERENCES public.app_roles(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check permissions
CREATE OR REPLACE FUNCTION public.user_has_permission(_user_id uuid, _module_code text, _action permission_action)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.app_roles ar ON ur.app_role_id = ar.id
    JOIN public.role_permissions rp ON rp.role_id = ar.id
    WHERE ur.user_id = _user_id
      AND rp.module_code = _module_code
      AND rp.action = _action
      AND rp.is_allowed = true
      AND ar.is_active = true
  )
  OR
  -- Legacy admin check - admins have all permissions
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

-- Function to get user's role name
CREATE OR REPLACE FUNCTION public.get_user_app_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ar.name
  FROM public.user_roles ur
  JOIN public.app_roles ar ON ur.app_role_id = ar.id
  WHERE ur.user_id = _user_id
  AND ar.is_active = true
  LIMIT 1
$$;

-- Function to get all permissions for a user
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id uuid)
RETURNS TABLE(module_code text, action permission_action)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT rp.module_code, rp.action
  FROM public.user_roles ur
  JOIN public.app_roles ar ON ur.app_role_id = ar.id
  JOIN public.role_permissions rp ON rp.role_id = ar.id
  WHERE ur.user_id = _user_id
    AND rp.is_allowed = true
    AND ar.is_active = true
$$;

-- RLS Policies for app_roles
CREATE POLICY "Anyone can view active roles" ON public.app_roles
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage roles" ON public.app_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for app_modules
CREATE POLICY "Anyone can view modules" ON public.app_modules
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage modules" ON public.app_modules
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for role_permissions
CREATE POLICY "Anyone can view permissions" ON public.role_permissions
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage permissions" ON public.role_permissions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Insert default system modules
INSERT INTO public.app_modules (code, name, parent_code, sort_order) VALUES
  -- Main modules
  ('dashboard', 'Dashboard', NULL, 1),
  ('courses', 'Courses', NULL, 2),
  ('students', 'Students', NULL, 3),
  ('classes', 'Classes', NULL, 4),
  ('users', 'User Management', NULL, 5),
  
  -- Administration
  ('admin', 'Administration', NULL, 10),
  ('admin.settings', 'Site Settings', 'admin', 11),
  ('admin.academic_years', 'Academic Years', 'admin', 12),
  ('admin.sessions', 'Sessions', 'admin', 13),
  ('admin.categories', 'Categories', 'admin', 14),
  
  -- Finance
  ('finance', 'Finance', NULL, 20),
  ('finance.dashboard', 'Finance Dashboard', 'finance', 21),
  ('finance.invoices', 'Invoices', 'finance', 22),
  ('finance.payments', 'Payments', 'finance', 23),
  ('finance.receivables', 'Receivables', 'finance', 24),
  ('finance.payables', 'Payables', 'finance', 25),
  ('finance.journal', 'Journal Entries', 'finance', 26),
  ('finance.reports', 'Financial Reports', 'finance', 27),
  ('finance.utilities', 'Finance Utilities', 'finance', 28),
  
  -- HR
  ('hr', 'Human Resource', NULL, 30),
  ('hr.dashboard', 'HR Dashboard', 'hr', 31),
  ('hr.employees', 'Employees', 'hr', 32),
  ('hr.leave', 'Leave Management', 'hr', 33),
  ('hr.attendance', 'Attendance', 'hr', 34),
  ('hr.performance', 'Performance', 'hr', 35),
  ('hr.disciplinary', 'Disciplinary', 'hr', 36),
  ('hr.reports', 'HR Reports', 'hr', 37),
  ('hr.utilities', 'HR Utilities', 'hr', 38),
  
  -- Roles & Permissions
  ('roles', 'Roles & Permissions', NULL, 100)
ON CONFLICT (code) DO NOTHING;

-- Insert default system roles
INSERT INTO public.app_roles (name, description, is_system) VALUES
  ('Super Admin', 'Full system access - cannot be modified', true),
  ('Administrator', 'Administrative access to most features', true),
  ('Teacher', 'Can manage courses and students', true),
  ('Student', 'Basic student access', true),
  ('Finance Manager', 'Full access to finance module', false),
  ('HR Manager', 'Full access to HR module', false),
  ('Viewer', 'Read-only access', false)
ON CONFLICT (name) DO NOTHING;

-- Grant all permissions to Super Admin role
INSERT INTO public.role_permissions (role_id, module_code, action, is_allowed)
SELECT 
  ar.id,
  am.code,
  pa.action,
  true
FROM public.app_roles ar
CROSS JOIN public.app_modules am
CROSS JOIN (SELECT unnest(enum_range(NULL::permission_action)) as action) pa
WHERE ar.name = 'Super Admin'
ON CONFLICT (role_id, module_code, action) DO NOTHING;

-- Create trigger for updated_at
CREATE TRIGGER update_app_roles_updated_at
  BEFORE UPDATE ON public.app_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();