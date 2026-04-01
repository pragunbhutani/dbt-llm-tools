-- Add dbt Cloud API key storage to dbt_projects
ALTER TABLE public.dbt_projects
  ADD COLUMN IF NOT EXISTS dbt_cloud_api_key TEXT;
