ALTER TABLE public.payment_modes ADD COLUMN can_receive boolean NOT NULL DEFAULT true;
ALTER TABLE public.payment_modes ADD COLUMN can_pay boolean NOT NULL DEFAULT true;