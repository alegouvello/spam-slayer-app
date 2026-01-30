-- Remove duplicate OAuth token columns from profiles table
-- These tokens are now stored in gmail_accounts table with proper encryption
-- Keeping them in profiles creates unnecessary attack surface

ALTER TABLE public.profiles 
  DROP COLUMN IF EXISTS gmail_access_token,
  DROP COLUMN IF EXISTS gmail_refresh_token,
  DROP COLUMN IF EXISTS gmail_token_expires_at;