-- Add GitHub access token to organisation_settings
ALTER TABLE public.organisation_settings
  ADD COLUMN IF NOT EXISTS github_access_token TEXT,
  ADD COLUMN IF NOT EXISTS github_installation_id TEXT;
