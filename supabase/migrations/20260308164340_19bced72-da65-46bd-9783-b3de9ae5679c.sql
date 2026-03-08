
-- 1. Create a security definer function for checking mpesa active status (client-side use)
CREATE OR REPLACE FUNCTION public.is_mpesa_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mpesa_settings WHERE is_active = true
  )
$$;

-- 2. Drop overly permissive mpesa_settings SELECT policy
DROP POLICY IF EXISTS "Authenticated users can read mpesa_settings" ON public.mpesa_settings;

-- 3. Create admin-only read policy for mpesa_settings
CREATE POLICY "Only admins can read mpesa_settings"
ON public.mpesa_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4. Drop overly permissive mpesa_transactions SELECT policy
DROP POLICY IF EXISTS "Users can view mpesa transactions" ON public.mpesa_transactions;

-- 5. Create scoped policy: students see own, admins see all
CREATE POLICY "Users can view own mpesa transactions"
ON public.mpesa_transactions
FOR SELECT
TO authenticated
USING (
  student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);
