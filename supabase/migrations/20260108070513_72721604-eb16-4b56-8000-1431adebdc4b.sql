-- Update admin role
UPDATE public.user_roles 
SET role = 'admin' 
WHERE user_id = 'a6494515-f910-4e5f-b824-0ebb35adcf47';

-- Update teacher role
UPDATE public.user_roles 
SET role = 'teacher' 
WHERE user_id = '31cefe53-64da-472d-a85e-ceefdcce113a';