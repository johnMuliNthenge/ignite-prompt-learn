
-- Add is_active flag for tenant management
ALTER TABLE public.institution_settings 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Add a subscription/plan field for SaaS tracking
ALTER TABLE public.institution_settings 
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'basic';

-- Add max_users limit per tenant
ALTER TABLE public.institution_settings 
ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 50;

-- Add subscription dates
ALTER TABLE public.institution_settings 
ADD COLUMN IF NOT EXISTS subscription_start DATE;
ALTER TABLE public.institution_settings 
ADD COLUMN IF NOT EXISTS subscription_end DATE;
