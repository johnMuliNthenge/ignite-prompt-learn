-- Create course chat messages table
CREATE TABLE public.course_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mentions/notifications table
CREATE TABLE public.chat_mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.course_chat_messages(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.course_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_mentions ENABLE ROW LEVEL SECURITY;

-- Policies for chat messages (only enrolled users can read/write)
CREATE POLICY "Enrolled users can view course chat" 
ON public.course_chat_messages 
FOR SELECT 
USING (
  course_id IN (SELECT public.user_enrolled_course_ids(auth.uid()))
);

CREATE POLICY "Enrolled users can send messages" 
ON public.course_chat_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  course_id IN (SELECT public.user_enrolled_course_ids(auth.uid()))
);

CREATE POLICY "Users can update own messages" 
ON public.course_chat_messages 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages" 
ON public.course_chat_messages 
FOR DELETE 
USING (auth.uid() = user_id);

-- Policies for mentions
CREATE POLICY "Users can view their mentions" 
ON public.chat_mentions 
FOR SELECT 
USING (mentioned_user_id = auth.uid());

CREATE POLICY "Anyone can create mentions" 
ON public.chat_mentions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can mark their mentions as read" 
ON public.chat_mentions 
FOR UPDATE 
USING (mentioned_user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_chat_messages_course ON public.course_chat_messages(course_id);
CREATE INDEX idx_chat_messages_created ON public.course_chat_messages(created_at DESC);
CREATE INDEX idx_chat_mentions_user ON public.chat_mentions(mentioned_user_id);
CREATE INDEX idx_chat_mentions_unread ON public.chat_mentions(mentioned_user_id, is_read) WHERE is_read = false;

-- Trigger for updated_at
CREATE TRIGGER update_chat_messages_updated_at
BEFORE UPDATE ON public.course_chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();