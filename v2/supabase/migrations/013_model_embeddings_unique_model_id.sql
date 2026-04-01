-- Add unique constraint on model_id so upsert(onConflict: "model_id") works.
-- One embedding row per dbt model — duplicates are replaced, not appended.
-- Delete any duplicates first (keep the most recently updated row).
DELETE FROM public.model_embeddings
WHERE id NOT IN (
  SELECT DISTINCT ON (model_id) id
  FROM public.model_embeddings
  WHERE model_id IS NOT NULL
  ORDER BY model_id, updated_at DESC
);

ALTER TABLE public.model_embeddings
  ADD CONSTRAINT model_embeddings_model_id_unique UNIQUE (model_id);
