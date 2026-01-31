-- Add column to track if employee has been sent password setup email
ALTER TABLE public.hr_employees 
ADD COLUMN IF NOT EXISTS password_setup_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add column to track if employee has set their password
ALTER TABLE public.hr_employees 
ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;