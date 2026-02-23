
-- Table to track which modules are enabled per tenant
CREATE TABLE public.tenant_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.institution_settings(id) ON DELETE CASCADE,
  module_code TEXT NOT NULL,
  module_name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, module_code)
);

ALTER TABLE public.tenant_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tenant modules"
  ON public.tenant_modules FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add super_admin flag to user_roles for platform-level admin distinction
ALTER TABLE public.institution_settings 
  ADD COLUMN IF NOT EXISTS admin_email TEXT,
  ADD COLUMN IF NOT EXISTS admin_password_hash TEXT;

-- Trigger for updated_at
CREATE TRIGGER update_tenant_modules_updated_at
  BEFORE UPDATE ON public.tenant_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default modules list (will be inserted per tenant on creation)
-- This is just the reference; actual per-tenant records created via app logic
