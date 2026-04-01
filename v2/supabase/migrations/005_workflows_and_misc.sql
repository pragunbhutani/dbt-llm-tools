-- 005_workflows_and_misc.sql
-- Conversations, conversation parts, questions, integrations, waitlist, whitelist

-- =============================================================================
-- conversations
-- =============================================================================
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,

  -- Identification
  external_id TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('slack', 'web', 'mcp', 'api')),
  user_id TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'error', 'timeout')),
  trigger TEXT NOT NULL DEFAULT 'web_interface'
    CHECK (trigger IN ('slack_mention', 'web_interface', 'mcp_server', 'api_call')),

  -- Content
  title TEXT,
  summary TEXT,
  initial_question TEXT NOT NULL,

  -- Channel-specific
  channel_type TEXT DEFAULT 'web',
  channel_id TEXT,
  user_external_id TEXT,

  -- LLM settings
  llm_provider TEXT DEFAULT 'openai',
  llm_chat_model TEXT,
  enabled_integrations JSONB DEFAULT '[]'::jsonb,

  -- Performance metrics
  total_parts INTEGER NOT NULL DEFAULT 0,
  total_tokens_used INTEGER NOT NULL DEFAULT 0,
  total_cost DECIMAL(10, 4) NOT NULL DEFAULT 0,

  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Feedback
  user_rating SMALLINT CHECK (user_rating IS NULL OR (user_rating >= 1 AND user_rating <= 5)),
  user_feedback TEXT,

  -- Additional context
  conversation_context JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX conversations_external_id_channel_idx
  ON public.conversations (external_id, channel);
CREATE INDEX conversations_org_started_at_idx
  ON public.conversations (organisation_id, started_at);
CREATE INDEX conversations_status_idx
  ON public.conversations (status);
CREATE INDEX conversations_user_id_idx
  ON public.conversations (user_id);
CREATE INDEX conversations_org_external_id_idx
  ON public.conversations (organisation_id, external_id);

CREATE UNIQUE INDEX conversations_org_external_id_unique
  ON public.conversations (organisation_id, external_id)
  WHERE external_id IS NOT NULL;

-- =============================================================================
-- conversation_parts
-- =============================================================================
CREATE TABLE public.conversation_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,

  -- Ordering
  sequence_number INTEGER NOT NULL,

  -- Actor and message type
  actor TEXT NOT NULL CHECK (actor IN ('user', 'agent', 'system', 'llm', 'tool')),
  message_type TEXT NOT NULL CHECK (message_type IN (
    'message', 'intent_classification', 'llm_input', 'llm_output',
    'tool_call', 'tool_execution', 'tool_error',
    'slack_output', 'slack_file_output', 'workflow_completion',
    'error', 'thinking'
  )),

  -- Content
  content TEXT NOT NULL,

  -- Tool-specific
  tool_name TEXT,
  tool_input JSONB,
  tool_output JSONB,
  result_summary TEXT,

  -- Performance
  tokens_used INTEGER NOT NULL DEFAULT 0,
  cost DECIMAL(8, 4) NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX conversation_parts_conv_seq_unique
  ON public.conversation_parts (conversation_id, sequence_number);
CREATE INDEX conversation_parts_actor_idx
  ON public.conversation_parts (actor);
CREATE INDEX conversation_parts_message_type_idx
  ON public.conversation_parts (message_type);
CREATE INDEX conversation_parts_actor_message_type_idx
  ON public.conversation_parts (actor, message_type);
CREATE INDEX conversation_parts_tool_name_idx
  ON public.conversation_parts (tool_name);
CREATE INDEX conversation_parts_created_at_idx
  ON public.conversation_parts (created_at);

-- =============================================================================
-- questions (legacy Q&A, kept for compatibility)
-- =============================================================================
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,

  question_text TEXT NOT NULL,
  answer_text TEXT,

  question_embedding vector(1536),
  was_useful BOOLEAN,
  feedback TEXT,
  feedback_embedding vector(1536),
  question_metadata JSONB DEFAULT '{}'::jsonb,

  original_message_text TEXT,
  original_message_ts TEXT,
  response_message_ts TEXT,
  original_message_embedding vector(1536),
  response_file_message_ts TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX questions_organisation_id_idx ON public.questions (organisation_id);
CREATE INDEX questions_response_file_message_ts_idx ON public.questions (response_file_message_ts);

CREATE TRIGGER questions_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- question_models (M2M: which models were used for each question)
-- =============================================================================
CREATE TABLE public.question_models (
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES public.dbt_models(id) ON DELETE CASCADE,
  relevance_score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (question_id, model_id)
);

-- =============================================================================
-- organisation_integrations
-- =============================================================================
CREATE TABLE public.organisation_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  integration_key TEXT NOT NULL DEFAULT 'unknown',
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  configuration JSONB DEFAULT '{}'::jsonb,
  credentials_path TEXT,
  last_test_result JSONB DEFAULT '{}'::jsonb,
  last_tested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX organisation_integrations_org_key_unique
  ON public.organisation_integrations (organisation_id, integration_key);

CREATE TRIGGER organisation_integrations_updated_at
  BEFORE UPDATE ON public.organisation_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- waitlist_entries
-- =============================================================================
CREATE TABLE public.waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  company TEXT,
  team_size TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- signup_whitelist
-- =============================================================================
CREATE TABLE public.signup_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
