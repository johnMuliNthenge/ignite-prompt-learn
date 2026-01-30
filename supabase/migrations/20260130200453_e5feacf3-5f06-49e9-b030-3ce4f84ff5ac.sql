-- Add RLS policy for authenticated users to view all employees (HR management)
-- This allows HR staff and managers to see the employee list

CREATE POLICY "Authenticated users can view hr_employees" 
ON public.hr_employees 
FOR SELECT 
TO authenticated
USING (true);

-- Note: Admin policy already exists for full management (INSERT, UPDATE, DELETE)
-- This new policy only allows SELECT for all authenticated users