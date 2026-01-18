-- Fix the overly permissive INSERT policy on chat_mentions
-- Only allow creating mentions for messages the user sent
DROP POLICY IF EXISTS "Anyone can create mentions" ON public.chat_mentions;

CREATE POLICY "Users can create mentions for their messages" 
ON public.chat_mentions 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.course_chat_messages 
    WHERE id = message_id AND user_id = auth.uid()
  )
);