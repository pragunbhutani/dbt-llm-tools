-- Add signing secret for per-org Slack signature verification
ALTER TABLE public.organisation_settings
  ADD COLUMN IF NOT EXISTS slack_signing_secret TEXT;
