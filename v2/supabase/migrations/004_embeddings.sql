-- 004_embeddings.sql
-- Model embeddings with pgvector

CREATE TABLE public.model_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  dbt_project_id UUID REFERENCES public.dbt_projects(id) ON DELETE CASCADE,
  model_id UUID REFERENCES public.dbt_models(id) ON DELETE CASCADE,

  document_text TEXT NOT NULL,
  embedding vector(1536) NOT NULL,

  can_be_used_for_answers BOOLEAN NOT NULL DEFAULT TRUE,
  is_processing BOOLEAN NOT NULL DEFAULT FALSE,

  model_metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HNSW index for fast cosine similarity search
CREATE INDEX model_embeddings_embedding_idx
  ON public.model_embeddings
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX model_embeddings_organisation_id_idx
  ON public.model_embeddings (organisation_id);

CREATE INDEX model_embeddings_model_id_idx
  ON public.model_embeddings (model_id);

CREATE TRIGGER model_embeddings_updated_at
  BEFORE UPDATE ON public.model_embeddings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- Semantic search function
-- =============================================================================
CREATE OR REPLACE FUNCTION search_models(
  query_embedding vector(1536),
  org_id UUID,
  match_count INT DEFAULT 10,
  similarity_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  model_id UUID,
  model_name TEXT,
  document_text TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    me.model_id,
    dm.name,
    me.document_text,
    (1 - (me.embedding <=> query_embedding))::FLOAT AS similarity
  FROM public.model_embeddings me
  JOIN public.dbt_models dm ON dm.id = me.model_id
  WHERE me.organisation_id = org_id
    AND me.can_be_used_for_answers = TRUE
    AND (1 - (me.embedding <=> query_embedding)) > similarity_threshold
  ORDER BY me.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
