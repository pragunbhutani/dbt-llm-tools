-- Add MCP API key column to organisation_settings
ALTER TABLE public.organisation_settings
  ADD COLUMN IF NOT EXISTS mcp_api_key TEXT;

-- Index for fast key lookups
CREATE UNIQUE INDEX IF NOT EXISTS organisation_settings_mcp_api_key_idx
  ON public.organisation_settings (mcp_api_key)
  WHERE mcp_api_key IS NOT NULL;
