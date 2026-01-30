-- Drop the existing policies
DROP POLICY IF EXISTS "Admin can manage hr_departments" ON public.hr_departments;
DROP POLICY IF EXISTS "Authenticated can view hr_departments" ON public.hr_departments;

-- Create SELECT policy for all authenticated users
CREATE POLICY "Authenticated users can view departments"
ON public.hr_departments
FOR SELECT
TO authenticated
USING (true);

-- Create INSERT policy for admins
CREATE POLICY "Admins can insert departments"
ON public.hr_departments
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create UPDATE policy for admins
CREATE POLICY "Admins can update departments"
ON public.hr_departments
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create DELETE policy for admins
CREATE POLICY "Admins can delete departments"
ON public.hr_departments
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));