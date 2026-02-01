-- Create cleanup_runs table to track each cleanup run with summary data
CREATE TABLE public.cleanup_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  run_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  emails_scanned INTEGER NOT NULL DEFAULT 0,
  emails_deleted INTEGER NOT NULL DEFAULT 0,
  emails_unsubscribed INTEGER NOT NULL DEFAULT 0,
  top_senders JSONB DEFAULT '[]'::jsonb,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.cleanup_runs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own cleanup runs"
ON public.cleanup_runs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cleanup runs"
ON public.cleanup_runs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cleanup runs"
ON public.cleanup_runs
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cleanup runs"
ON public.cleanup_runs
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_cleanup_runs_user_id_run_at ON public.cleanup_runs(user_id, run_at DESC);