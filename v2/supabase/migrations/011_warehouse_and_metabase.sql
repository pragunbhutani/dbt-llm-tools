-- Data warehouse connections
CREATE TABLE public.warehouse_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('snowflake', 'postgres', 'redshift')),
  credentials JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'untested' CHECK (status IN ('untested', 'connected', 'error')),
  last_tested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.warehouse_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view warehouse connections"
  ON public.warehouse_connections FOR SELECT
  USING (public.is_org_member(organisation_id));

CREATE POLICY "Org owners can insert warehouse connections"
  ON public.warehouse_connections FOR INSERT
  WITH CHECK (public.is_org_owner(organisation_id));

CREATE POLICY "Org owners can update warehouse connections"
  ON public.warehouse_connections FOR UPDATE
  USING (public.is_org_owner(organisation_id));

CREATE POLICY "Org owners can delete warehouse connections"
  ON public.warehouse_connections FOR DELETE
  USING (public.is_org_owner(organisation_id));

-- Metabase connections
CREATE TABLE public.metabase_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  database_id INTEGER,
  collection_path TEXT,
  status TEXT NOT NULL DEFAULT 'untested' CHECK (status IN ('untested', 'connected', 'error')),
  last_tested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.metabase_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view metabase connections"
  ON public.metabase_connections FOR SELECT
  USING (public.is_org_member(organisation_id));

CREATE POLICY "Org owners can insert metabase connections"
  ON public.metabase_connections FOR INSERT
  WITH CHECK (public.is_org_owner(organisation_id));

CREATE POLICY "Org owners can update metabase connections"
  ON public.metabase_connections FOR UPDATE
  USING (public.is_org_owner(organisation_id));

CREATE POLICY "Org owners can delete metabase connections"
  ON public.metabase_connections FOR DELETE
  USING (public.is_org_owner(organisation_id));
