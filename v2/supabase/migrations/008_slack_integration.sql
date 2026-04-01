-- Add Slack-specific columns to organisation_settings
ALTER TABLE public.organisation_settings
  ADD COLUMN IF NOT EXISTS slack_team_id TEXT,
  ADD COLUMN IF NOT EXISTS slack_bot_token TEXT,
  ADD COLUMN IF NOT EXISTS slack_bot_user_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS organisation_settings_slack_team_id_idx
  ON public.organisation_settings (slack_team_id)
  WHERE slack_team_id IS NOT NULL;
