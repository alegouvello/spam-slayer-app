-- Create profiles table to store user data and Gmail tokens
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  gmail_access_token TEXT,
  gmail_refresh_token TEXT,
  gmail_token_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create cleanup_history table to track processed emails
CREATE TABLE public.cleanup_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_id TEXT NOT NULL,
  sender TEXT,
  subject TEXT,
  spam_confidence TEXT CHECK (spam_confidence IN ('definitely_spam', 'likely_spam', 'might_be_important')),
  ai_reasoning TEXT,
  unsubscribe_method TEXT CHECK (unsubscribe_method IN ('auto_header', 'web_link', 'none')),
  unsubscribe_status TEXT CHECK (unsubscribe_status IN ('pending', 'success', 'failed', 'opened_link')),
  deleted BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scheduled_cleanup table for user scheduling preferences
CREATE TABLE public.scheduled_cleanup (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  auto_approve BOOLEAN DEFAULT false,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleanup_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_cleanup ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for cleanup_history
CREATE POLICY "Users can view their own cleanup history" 
ON public.cleanup_history FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cleanup history" 
ON public.cleanup_history FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cleanup history" 
ON public.cleanup_history FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cleanup history" 
ON public.cleanup_history FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for scheduled_cleanup
CREATE POLICY "Users can view their own scheduled cleanup" 
ON public.scheduled_cleanup FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scheduled cleanup" 
ON public.scheduled_cleanup FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled cleanup" 
ON public.scheduled_cleanup FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled cleanup" 
ON public.scheduled_cleanup FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scheduled_cleanup_updated_at
BEFORE UPDATE ON public.scheduled_cleanup
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_cleanup_history_user_id ON public.cleanup_history(user_id);
CREATE INDEX idx_cleanup_history_processed_at ON public.cleanup_history(processed_at);
CREATE INDEX idx_scheduled_cleanup_next_run ON public.scheduled_cleanup(next_run_at) WHERE is_active = true;