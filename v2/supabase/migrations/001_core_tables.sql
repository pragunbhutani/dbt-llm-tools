-- 001_core_tables.sql
-- Core tables: profiles, organisations, organisation_members, organisation_settings
-- Extensions: pgcrypto, vector

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- =============================================================================
-- Reusable updated_at trigger function
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- profiles (extends auth.users)
-- =============================================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- organisations
-- =============================================================================
CREATE TABLE public.organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX organisations_slug_unique ON public.organisations (slug);

CREATE TRIGGER organisations_updated_at
  BEFORE UPDATE ON public.organisations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- organisation_members
-- =============================================================================
CREATE TABLE public.organisation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX organisation_members_org_user_unique
  ON public.organisation_members (organisation_id, user_id);

CREATE INDEX organisation_members_user_id_idx
  ON public.organisation_members (user_id);

-- =============================================================================
-- organisation_settings
-- =============================================================================
CREATE TABLE public.organisation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL UNIQUE REFERENCES public.organisations(id) ON DELETE CASCADE,

  -- LLM provider settings
  llm_chat_provider TEXT DEFAULT 'openai',
  llm_chat_model TEXT DEFAULT 'gpt-4o',
  llm_embeddings_provider TEXT DEFAULT 'openai',
  llm_embeddings_model TEXT DEFAULT 'text-embedding-3-large',

  -- API key paths (stored in Supabase Vault, not plaintext)
  llm_openai_api_key_path TEXT,
  llm_google_api_key_path TEXT,
  llm_anthropic_api_key_path TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER organisation_settings_updated_at
  BEFORE UPDATE ON public.organisation_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create settings when an organisation is created
CREATE OR REPLACE FUNCTION handle_new_organisation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.organisation_settings (organisation_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER on_organisation_created
  AFTER INSERT ON public.organisations
  FOR EACH ROW EXECUTE FUNCTION handle_new_organisation();
