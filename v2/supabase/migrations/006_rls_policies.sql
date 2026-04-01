-- 006_rls_policies.sql
-- Row Level Security policies for all tables

-- =============================================================================
-- Helper functions
-- =============================================================================

-- Check if the current user is a member of an organisation
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organisation_members
    WHERE organisation_id = org_id
      AND user_id = auth.uid()
  );
END;
$$;

-- Check if the current user is an owner of an organisation
CREATE OR REPLACE FUNCTION is_org_owner(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organisation_members
    WHERE organisation_id = org_id
      AND user_id = auth.uid()
      AND role = 'owner'
  );
END;
$$;

-- =============================================================================
-- profiles
-- =============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- =============================================================================
-- organisations
-- =============================================================================
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their organisations"
  ON public.organisations FOR SELECT
  USING (is_org_member(id));

CREATE POLICY "Authenticated users can create organisations"
  ON public.organisations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owners can update their organisations"
  ON public.organisations FOR UPDATE
  USING (is_org_owner(id))
  WITH CHECK (is_org_owner(id));

CREATE POLICY "Owners can delete their organisations"
  ON public.organisations FOR DELETE
  USING (is_org_owner(id));

-- =============================================================================
-- organisation_members
-- =============================================================================
ALTER TABLE public.organisation_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org members"
  ON public.organisation_members FOR SELECT
  USING (is_org_member(organisation_id));

CREATE POLICY "Authenticated users can insert org members"
  ON public.organisation_members FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owners can update org members"
  ON public.organisation_members FOR UPDATE
  USING (is_org_owner(organisation_id))
  WITH CHECK (is_org_owner(organisation_id));

CREATE POLICY "Owners can delete org members"
  ON public.organisation_members FOR DELETE
  USING (is_org_owner(organisation_id));

-- =============================================================================
-- organisation_settings
-- =============================================================================
ALTER TABLE public.organisation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org settings"
  ON public.organisation_settings FOR SELECT
  USING (is_org_member(organisation_id));

CREATE POLICY "Owners can update org settings"
  ON public.organisation_settings FOR UPDATE
  USING (is_org_owner(organisation_id))
  WITH CHECK (is_org_owner(organisation_id));

-- =============================================================================
-- dbt_projects
-- =============================================================================
ALTER TABLE public.dbt_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org dbt projects"
  ON public.dbt_projects FOR SELECT
  USING (is_org_member(organisation_id));

CREATE POLICY "Members can insert dbt projects"
  ON public.dbt_projects FOR INSERT
  WITH CHECK (is_org_member(organisation_id));

CREATE POLICY "Members can update dbt projects"
  ON public.dbt_projects FOR UPDATE
  USING (is_org_member(organisation_id))
  WITH CHECK (is_org_member(organisation_id));

CREATE POLICY "Owners can delete dbt projects"
  ON public.dbt_projects FOR DELETE
  USING (is_org_owner(organisation_id));

-- =============================================================================
-- dbt_models
-- =============================================================================
ALTER TABLE public.dbt_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org dbt models"
  ON public.dbt_models FOR SELECT
  USING (is_org_member(organisation_id));

CREATE POLICY "Members can insert dbt models"
  ON public.dbt_models FOR INSERT
  WITH CHECK (is_org_member(organisation_id));

CREATE POLICY "Members can update dbt models"
  ON public.dbt_models FOR UPDATE
  USING (is_org_member(organisation_id))
  WITH CHECK (is_org_member(organisation_id));

CREATE POLICY "Members can delete dbt models"
  ON public.dbt_models FOR DELETE
  USING (is_org_member(organisation_id));

-- =============================================================================
-- model_embeddings
-- =============================================================================
ALTER TABLE public.model_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org embeddings"
  ON public.model_embeddings FOR SELECT
  USING (is_org_member(organisation_id));

CREATE POLICY "Members can insert embeddings"
  ON public.model_embeddings FOR INSERT
  WITH CHECK (is_org_member(organisation_id));

CREATE POLICY "Members can update embeddings"
  ON public.model_embeddings FOR UPDATE
  USING (is_org_member(organisation_id))
  WITH CHECK (is_org_member(organisation_id));

CREATE POLICY "Members can delete embeddings"
  ON public.model_embeddings FOR DELETE
  USING (is_org_member(organisation_id));

-- =============================================================================
-- conversations
-- =============================================================================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org conversations"
  ON public.conversations FOR SELECT
  USING (is_org_member(organisation_id));

CREATE POLICY "Members can insert conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (is_org_member(organisation_id));

CREATE POLICY "Members can update conversations"
  ON public.conversations FOR UPDATE
  USING (is_org_member(organisation_id))
  WITH CHECK (is_org_member(organisation_id));

-- =============================================================================
-- conversation_parts (join through parent conversation)
-- =============================================================================
ALTER TABLE public.conversation_parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view conversation parts"
  ON public.conversation_parts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND is_org_member(c.organisation_id)
    )
  );

CREATE POLICY "Members can insert conversation parts"
  ON public.conversation_parts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND is_org_member(c.organisation_id)
    )
  );

-- =============================================================================
-- questions
-- =============================================================================
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org questions"
  ON public.questions FOR SELECT
  USING (is_org_member(organisation_id));

CREATE POLICY "Members can insert questions"
  ON public.questions FOR INSERT
  WITH CHECK (is_org_member(organisation_id));

CREATE POLICY "Members can update questions"
  ON public.questions FOR UPDATE
  USING (is_org_member(organisation_id))
  WITH CHECK (is_org_member(organisation_id));

-- =============================================================================
-- question_models (join through parent question)
-- =============================================================================
ALTER TABLE public.question_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view question models"
  ON public.question_models FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.questions q
      WHERE q.id = question_id
        AND is_org_member(q.organisation_id)
    )
  );

CREATE POLICY "Members can insert question models"
  ON public.question_models FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.questions q
      WHERE q.id = question_id
        AND is_org_member(q.organisation_id)
    )
  );

-- =============================================================================
-- organisation_integrations
-- =============================================================================
ALTER TABLE public.organisation_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org integrations"
  ON public.organisation_integrations FOR SELECT
  USING (is_org_member(organisation_id));

CREATE POLICY "Owners can insert integrations"
  ON public.organisation_integrations FOR INSERT
  WITH CHECK (is_org_owner(organisation_id));

CREATE POLICY "Owners can update integrations"
  ON public.organisation_integrations FOR UPDATE
  USING (is_org_owner(organisation_id))
  WITH CHECK (is_org_owner(organisation_id));

CREATE POLICY "Owners can delete integrations"
  ON public.organisation_integrations FOR DELETE
  USING (is_org_owner(organisation_id));

-- =============================================================================
-- waitlist_entries (no RLS — public insert, admin-only read)
-- =============================================================================
ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert waitlist entries"
  ON public.waitlist_entries FOR INSERT
  WITH CHECK (TRUE);

-- =============================================================================
-- signup_whitelist (no public access — service role only)
-- =============================================================================
ALTER TABLE public.signup_whitelist ENABLE ROW LEVEL SECURITY;
