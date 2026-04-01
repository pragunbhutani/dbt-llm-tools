-- 003_knowledge_base.sql
-- dbt model metadata

CREATE TABLE public.dbt_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  dbt_project_id UUID NOT NULL REFERENCES public.dbt_projects(id) ON DELETE CASCADE,

  -- Identification
  name TEXT NOT NULL,
  unique_id TEXT,
  path TEXT,

  -- Database info
  database_name TEXT,
  schema_name TEXT,
  materialization TEXT,

  -- Content
  raw_sql TEXT,
  compiled_sql TEXT,

  -- Documentation
  yml_description TEXT,
  yml_columns JSONB,
  interpreted_description TEXT,
  interpreted_columns JSONB,
  interpretation_details JSONB,

  -- Metadata
  tags TEXT[],
  depends_on TEXT[],
  all_upstream_models TEXT[],
  tests JSONB,
  meta JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique model per org + project + name
CREATE UNIQUE INDEX dbt_models_org_project_name_unique
  ON public.dbt_models (organisation_id, dbt_project_id, name);

-- Conditional unique index on unique_id (only where non-null)
CREATE UNIQUE INDEX dbt_models_org_unique_id_unique
  ON public.dbt_models (organisation_id, unique_id)
  WHERE unique_id IS NOT NULL;

CREATE INDEX dbt_models_organisation_id_idx ON public.dbt_models (organisation_id);
CREATE INDEX dbt_models_dbt_project_id_idx ON public.dbt_models (dbt_project_id);
CREATE INDEX dbt_models_name_idx ON public.dbt_models (name);

CREATE TRIGGER dbt_models_updated_at
  BEFORE UPDATE ON public.dbt_models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
