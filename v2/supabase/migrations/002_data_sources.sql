-- 002_data_sources.sql
-- dbt project connections

CREATE TABLE public.dbt_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  connection_type TEXT NOT NULL DEFAULT 'dbt_cloud'
    CHECK (connection_type IN ('dbt_cloud', 'github')),

  -- dbt Cloud specific
  dbt_cloud_url TEXT,
  dbt_cloud_account_id BIGINT,

  -- GitHub specific
  github_repository_url TEXT,
  github_branch TEXT DEFAULT 'main',
  github_project_folder TEXT,

  -- Credentials (path to secrets in Vault)
  credentials_path TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'syncing', 'synced', 'error')),
  last_synced_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX dbt_projects_organisation_id_idx
  ON public.dbt_projects (organisation_id);

CREATE TRIGGER dbt_projects_updated_at
  BEFORE UPDATE ON public.dbt_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
