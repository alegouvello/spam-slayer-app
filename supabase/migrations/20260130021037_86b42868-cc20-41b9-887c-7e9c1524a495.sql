-- Create gmail_accounts table for multiple Gmail connections per user
CREATE TABLE public.gmail_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  gmail_email TEXT NOT NULL,
  gmail_access_token TEXT,
  gmail_refresh_token TEXT,
  gmail_token_expires_at TIMESTAMP WITH TIME ZONE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, gmail_email)
);

-- Enable RLS
ALTER TABLE public.gmail_accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own gmail accounts"
ON public.gmail_accounts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gmail accounts"
ON public.gmail_accounts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gmail accounts"
ON public.gmail_accounts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gmail accounts"
ON public.gmail_accounts
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_gmail_accounts_updated_at
BEFORE UPDATE ON public.gmail_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing tokens from profiles to gmail_accounts
INSERT INTO public.gmail_accounts (user_id, gmail_email, gmail_access_token, gmail_refresh_token, gmail_token_expires_at, is_primary)
SELECT 
  p.user_id,
  COALESCE(p.email, 'unknown@gmail.com'),
  p.gmail_access_token,
  p.gmail_refresh_token,
  p.gmail_token_expires_at,
  true
FROM public.profiles p
WHERE p.gmail_access_token IS NOT NULL;