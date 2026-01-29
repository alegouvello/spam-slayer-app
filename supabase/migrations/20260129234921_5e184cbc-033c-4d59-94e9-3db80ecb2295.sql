-- Create table for storing user feedback on senders (for AI learning)
CREATE TABLE public.sender_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  marked_as_spam BOOLEAN NOT NULL DEFAULT true,
  feedback_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, sender_email)
);

-- Enable RLS
ALTER TABLE public.sender_feedback ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own sender feedback" 
ON public.sender_feedback 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sender feedback" 
ON public.sender_feedback 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sender feedback" 
ON public.sender_feedback 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sender feedback" 
ON public.sender_feedback 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_sender_feedback_updated_at
BEFORE UPDATE ON public.sender_feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();