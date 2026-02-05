-- Allow all authenticated users to read mpesa_settings (needed for student portal Pay Now)
CREATE POLICY "Authenticated users can read mpesa_settings"
ON public.mpesa_settings
FOR SELECT
TO authenticated
USING (true);