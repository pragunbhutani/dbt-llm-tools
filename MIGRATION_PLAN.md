# Ragstar Migration Plan: Django + NextJS → NextJS + Supabase

**Version:** 2.0
**Date:** March 2026
**Status:** Migration Complete — all phases done, v2 is the active codebase

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Architecture Overview](#2-current-architecture-overview)
3. [Target Architecture](#3-target-architecture)
4. [Migration Strategy](#4-migration-strategy)
5. [Component-by-Component Migration](#5-component-by-component-migration)
6. [Database Migration](#6-database-migration)
7. [Authentication Migration](#7-authentication-migration)
8. [AI/LLM Workflow Migration](#8-aillm-workflow-migration)
9. [API Routes Migration](#9-api-routes-migration)
10. [Integrations Migration](#10-integrations-migration)
11. [Secrets Management](#11-secrets-management)
12. [Background Jobs & Queues](#12-background-jobs--queues)
13. [MCP Server Migration](#13-mcp-server-migration)
14. [Migration Phases](#14-migration-phases)
15. [Risks & Mitigations](#15-risks--mitigations)
16. [Open Questions](#16-open-questions)

---

## 1. Executive Summary

### Goal
Migrate Ragstar from a microservices architecture (Django backend + NextJS frontend + Redis/Celery + MCP server) to a simplified serverless architecture using **NextJS only** with **Supabase** as the backend-as-a-service and **Vercel AI SDK** for LLM interactions.

### Benefits
- **Simplified deployment:** Single Next.js app vs 6+ Docker containers
- **Reduced operational complexity:** No Celery, Redis, or custom MCP server to maintain
- **Better developer experience:** One language (TypeScript), one framework
- **Cost efficiency:** Serverless scaling vs always-on containers
- **Faster iteration:** Vercel AI SDK provides streaming, tool calling, and multi-provider support out of the box

### Key Trade-offs
- Loss of Python ecosystem (LangChain, LangGraph) - must re-implement in TypeScript
- Supabase Edge Functions have execution time limits (may affect long workflows)
- More tightly coupled to Vercel/Supabase ecosystem

---

## 2. Current Architecture Overview

### Services (Docker Compose)

| Service | Technology | Port | Purpose |
|---------|------------|------|---------|
| backend-django | Django 5.2, DRF, uvicorn | 8000 | REST API, business logic |
| frontend-nextjs | Next.js 16, React 19 | 3000 | Admin UI, Auth |
| db | PostgreSQL 16 + pgvector | 5432 | Primary database |
| redis | Redis 7 | 6379 | Cache, Celery broker |
| celery-worker | Celery 5.5 | - | Async task execution |
| flower | Flower | 5555 | Celery monitoring |
| localstack | LocalStack | 4566 | Mock AWS (SSM for secrets) |
| mcp-server | FastMCP/Starlette | 8080 | MCP protocol for LLM clients |

### Django Apps

| App | Purpose | Key Models |
|-----|---------|------------|
| accounts | Multi-tenant user management | User, Organisation, OrganisationSettings |
| data_sources | dbt project connections | DbtProject (Cloud/GitHub/ZIP) |
| knowledge_base | dbt model metadata | Model (SQL, docs, dependencies) |
| embeddings | Vector storage | ModelEmbedding (pgvector 3072-dim) |
| llm_providers | LLM abstraction | EmbeddingService, ChatService |
| workflows | AI orchestration | Question, Conversation, ConversationPart |
| integrations | External connections | OrganisationIntegration (Slack, Snowflake, Metabase, MCP) |

### Current Data Flow

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Next.js UI    │─────▶│  Django REST    │─────▶│   PostgreSQL    │
│   (port 3000)   │      │   (port 8000)   │      │   + pgvector    │
└─────────────────┘      └────────┬────────┘      └─────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐      ┌─────────────────┐      ┌─────────────────┐
│ Redis/Celery  │      │   LLM APIs      │      │  AWS SSM        │
│   (queues)    │      │ (OpenAI/etc)    │      │  (secrets)      │
└───────────────┘      └─────────────────┘      └─────────────────┘
```

---

## 3. Target Architecture

### Proposed Stack

| Component | Technology | Notes |
|-----------|------------|-------|
| Frontend + API | Next.js 16 (App Router) | Server Components, API Routes, Server Actions |
| Database | Supabase (PostgreSQL + pgvector) | Hosted or self-hosted via Docker |
| Authentication | Supabase Auth + Auth.js | OAuth, email/password, magic links |
| LLM Integration | Vercel AI SDK | Streaming, tool calling, multi-provider |
| Background Jobs | Vercel Cron + Supabase Edge Functions | Or Inngest for complex workflows |
| File Storage | Supabase Storage | S3-compatible |
| Secrets | Vercel Environment Variables + Supabase Vault | Per-org secrets in Vault |
| Real-time | Supabase Realtime | Live conversation updates |
| MCP Server | Next.js API Routes | Custom implementation or `@modelcontextprotocol/sdk` |

### Target Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                       Next.js Application                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   Pages/     │  │  API Routes  │  │  Server Actions       │   │
│  │   Components │  │  /api/*      │  │  (form submissions)   │   │
│  └──────────────┘  └──────┬───────┘  └──────────────────────┘   │
└───────────────────────────┼──────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Supabase    │  │  Vercel AI SDK  │  │  Supabase       │
│   PostgreSQL  │  │  (LLM APIs)     │  │  Edge Functions │
│   + pgvector  │  └─────────────────┘  │  (background)   │
└───────────────┘                       └─────────────────┘
```

---

## 4. Migration Strategy

### Approach: Incremental Migration

Rather than a big-bang rewrite, migrate incrementally:

1. **Phase 1:** Set up Supabase, migrate database schema
2. **Phase 2:** Migrate authentication to Supabase Auth
3. **Phase 3:** Create Next.js API routes that mirror Django endpoints
4. **Phase 4:** Migrate LLM workflows to Vercel AI SDK
5. **Phase 5:** Migrate integrations (Slack, MCP)
6. **Phase 6:** Remove Django backend, simplify Docker setup

### Feature Parity Checklist

- [x] User registration/login
- [x] Organization management
- [ ] dbt project import (Cloud, GitHub, ZIP)
- [ ] Model browsing and search
- [ ] Semantic search (embeddings)
- [ ] Question answering workflow
- [ ] Conversation history
- [ ] Slack integration
- [ ] MCP server for Claude/LLM clients
- [ ] Snowflake/warehouse connections
- [ ] Per-org LLM API keys

---

## 5. Component-by-Component Migration

### 5.1 accounts → Supabase Auth + Custom Tables

**Current (Django):**
- Custom `User` model (email-based, UUID primary key)
- `Organisation` model for multi-tenancy
- `OrganisationSettings` for org-level config
- JWT tokens via Simple JWT

**Target (Supabase):**

```sql
-- Users managed by Supabase Auth (auth.users)
-- Extend with custom profile table

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.organisation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organisation_id, user_id)
);

CREATE TABLE public.organisation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID UNIQUE REFERENCES organisations(id) ON DELETE CASCADE,
  llm_provider TEXT DEFAULT 'openai',
  llm_model TEXT DEFAULT 'gpt-4o',
  embedding_provider TEXT DEFAULT 'openai',
  embedding_model TEXT DEFAULT 'text-embedding-3-large',
  -- API keys stored in Supabase Vault, not here
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_settings ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their organisations
CREATE POLICY "Users can view own organisations" ON organisations
  FOR SELECT USING (
    id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );
```

**Auth.js Integration:**
```typescript
// src/lib/auth.ts
import NextAuth from "next-auth";
import { SupabaseAdapter } from "@auth/supabase-adapter";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  providers: [
    // Credentials, OAuth providers, etc.
  ],
});
```

---

### 5.2 data_sources → Next.js API Routes + Supabase

**Current:** Django app with `DbtProject` model, services for Cloud/GitHub import

**Target:**

```sql
CREATE TABLE public.dbt_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL, -- 'cloud', 'github', 'upload'

  -- dbt Cloud specific
  dbt_cloud_account_id TEXT,
  dbt_cloud_project_id TEXT,
  dbt_cloud_environment_id TEXT,

  -- GitHub specific
  github_repo_url TEXT,
  github_branch TEXT DEFAULT 'main',

  -- Common
  target_schema TEXT,
  status TEXT DEFAULT 'pending',
  last_synced_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**API Route Example:**
```typescript
// src/app/api/data-sources/dbt-projects/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's organisation
  const { data: membership } = await supabase
    .from('organisation_members')
    .select('organisation_id')
    .eq('user_id', user.id)
    .single();

  const { data: projects } = await supabase
    .from('dbt_projects')
    .select('*')
    .eq('organisation_id', membership.organisation_id);

  return NextResponse.json(projects);
}
```

---

### 5.3 knowledge_base → Supabase Table

**Current:** Django `Model` with dbt metadata, SQL, documentation

**Target:**

```sql
CREATE TABLE public.dbt_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  dbt_project_id UUID REFERENCES dbt_projects(id) ON DELETE CASCADE,

  -- Identification
  name TEXT NOT NULL,
  unique_id TEXT NOT NULL, -- dbt unique_id
  path TEXT,

  -- Metadata
  database_name TEXT,
  schema_name TEXT,
  materialization TEXT,

  -- Content
  raw_sql TEXT,
  compiled_sql TEXT,

  -- Documentation
  yml_description TEXT,
  llm_description TEXT,
  column_definitions JSONB,

  -- Relationships
  upstream_models TEXT[], -- Array of unique_ids

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organisation_id, unique_id)
);

CREATE INDEX idx_dbt_models_org ON dbt_models(organisation_id);
CREATE INDEX idx_dbt_models_project ON dbt_models(dbt_project_id);
CREATE INDEX idx_dbt_models_name ON dbt_models(name);
```

---

### 5.4 embeddings → pgvector in Supabase

**Current:** Django `ModelEmbedding` with pgvector (3072 dimensions)

**Target:**

```sql
-- Enable pgvector extension (already available in Supabase)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE public.model_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  dbt_project_id UUID REFERENCES dbt_projects(id) ON DELETE CASCADE,
  model_id UUID REFERENCES dbt_models(id) ON DELETE CASCADE,

  document_text TEXT NOT NULL,
  embedding vector(3072), -- OpenAI text-embedding-3-large

  can_be_used_for_answers BOOLEAN DEFAULT FALSE,
  is_processing BOOLEAN DEFAULT FALSE,

  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW index for fast similarity search
CREATE INDEX idx_embeddings_vector ON model_embeddings
  USING hnsw (embedding vector_cosine_ops);

-- Function for semantic search
CREATE OR REPLACE FUNCTION search_models(
  query_embedding vector(3072),
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
AS $$
BEGIN
  RETURN QUERY
  SELECT
    me.model_id,
    dm.name,
    me.document_text,
    1 - (me.embedding <=> query_embedding) AS similarity
  FROM model_embeddings me
  JOIN dbt_models dm ON dm.id = me.model_id
  WHERE me.organisation_id = org_id
    AND me.can_be_used_for_answers = TRUE
    AND 1 - (me.embedding <=> query_embedding) > similarity_threshold
  ORDER BY me.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

## 6. Database Migration

### Migration Steps

1. **Export Django schema:**
   ```bash
   cd backend_django
   uv run python manage.py inspectdb > schema_dump.py
   ```

2. **Export data:**
   ```bash
   pg_dump -h localhost -U ragstar -d ragstar \
     --data-only --exclude-table=django_* --exclude-table=auth_* \
     > data_export.sql
   ```

3. **Create Supabase project:**
   - Create new project at [supabase.com](https://supabase.com) or use local Docker
   - Enable pgvector extension
   - Run schema creation scripts (see Section 5)

4. **Transform and import data:**
   - Map Django model fields to Supabase tables
   - Handle UUID transformations
   - Import embeddings separately (large data)

5. **Verify:**
   - Row counts match
   - Foreign key integrity
   - Vector search works

### Local Development with Supabase

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Initialize local project
supabase init

# Start local Supabase
supabase start

# Apply migrations
supabase db push
```

**supabase/config.toml:**
```toml
[db]
port = 54322
shadow_port = 54320
major_version = 15

[api]
enabled = true
port = 54321

[auth]
enabled = true
site_url = "http://localhost:3000"
```

---

## 7. Authentication Migration

### Current Flow (Django + Auth.js)

1. User submits credentials to Next.js
2. Auth.js CredentialsProvider calls Django `/api/token/`
3. Django validates and returns JWT access + refresh tokens
4. Tokens stored in Auth.js session
5. Next.js attaches Bearer token to API requests

### Target Flow (Supabase Auth)

```
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│   Next.js UI     │──────▶│   Supabase Auth  │──────▶│    Supabase      │
│   + Auth.js      │       │   (GoTrue)       │       │    PostgreSQL    │
└──────────────────┘       └──────────────────┘       └──────────────────┘
```

### Implementation

**1. Install packages:**
```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

**2. Create Supabase clients:**
```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}
```

**3. Middleware for session refresh:**
```typescript
// src/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
```

**4. Update sign-in page:**
```typescript
// src/app/(auth)/signin/page.tsx
'use client';

import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const supabase = createClient();

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSignIn}>
      {/* Form fields */}
    </form>
  );
}
```

---

## 8. AI/LLM Workflow Migration

### Current: LangGraph + LangChain (Python)

The current `question_answerer` workflow uses:
- LangGraph state machines
- PostgreSQL checkpointer for conversation state
- LangChain for LLM abstraction
- Celery for async execution

### Target: Vercel AI SDK (TypeScript)

**Install:**
```bash
pnpm add ai @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google
```

### Workflow Rewrite: Question Answerer

**1. Define tools:**
```typescript
// src/lib/ai/tools.ts
import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { embedText } from './embeddings';

export const searchModelsTool = tool({
  description: 'Search for dbt models semantically based on a query',
  parameters: z.object({
    query: z.string().describe('The search query'),
    limit: z.number().default(10).describe('Maximum results to return'),
  }),
  execute: async ({ query, limit }, { organisationId }) => {
    const supabase = await createClient();

    // Generate embedding for query
    const embedding = await embedText(query);

    // Search using pgvector
    const { data: models } = await supabase.rpc('search_models', {
      query_embedding: embedding,
      org_id: organisationId,
      match_count: limit,
    });

    return models;
  },
});

export const fetchModelDetailsTool = tool({
  description: 'Fetch detailed information about specific dbt models',
  parameters: z.object({
    modelIds: z.array(z.string()).describe('Model IDs to fetch'),
  }),
  execute: async ({ modelIds }, { organisationId }) => {
    const supabase = await createClient();

    const { data: models } = await supabase
      .from('dbt_models')
      .select('*')
      .eq('organisation_id', organisationId)
      .in('id', modelIds);

    return models;
  },
});
```

**2. Create streaming API route:**
```typescript
// src/app/api/chat/route.ts
import { streamText, convertToCoreMessages } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createClient } from '@/lib/supabase/server';
import { searchModelsTool, fetchModelDetailsTool } from '@/lib/ai/tools';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Get user's org
  const { data: membership } = await supabase
    .from('organisation_members')
    .select('organisation_id, organisations(organisation_settings(*))')
    .eq('user_id', user.id)
    .single();

  const { messages, conversationId } = await req.json();

  // Get org's LLM settings
  const settings = membership.organisations.organisation_settings;

  const result = streamText({
    model: openai(settings.llm_model || 'gpt-4o'),
    system: `You are an AI data analyst assistant. You help users understand their dbt data models and write SQL queries.

When asked a question:
1. First search for relevant models using the search_models tool
2. Fetch detailed information about the most relevant models
3. Use this context to provide accurate answers and SQL queries

Always explain which models you're using and why.`,
    messages: convertToCoreMessages(messages),
    tools: {
      search_models: searchModelsTool,
      fetch_model_details: fetchModelDetailsTool,
    },
    toolChoice: 'auto',
    maxSteps: 5, // Allow multiple tool calls
    onFinish: async ({ text, toolCalls, usage }) => {
      // Save conversation to database
      await saveConversation(supabase, {
        conversationId,
        organisationId: membership.organisation_id,
        userId: user.id,
        messages,
        response: text,
        toolCalls,
        usage,
      });
    },
  });

  return result.toDataStreamResponse();
}
```

**3. Frontend chat component:**
```typescript
// src/components/chat/chat-interface.tsx
'use client';

import { useChat } from 'ai/react';

export function ChatInterface({ conversationId }: { conversationId: string }) {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    body: { conversationId },
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`p-4 rounded-lg ${
              message.role === 'user' ? 'bg-blue-100 ml-auto' : 'bg-gray-100'
            }`}
          >
            {message.content}
            {message.toolInvocations?.map((tool) => (
              <div key={tool.toolCallId} className="mt-2 text-sm text-gray-600">
                Used tool: {tool.toolName}
              </div>
            ))}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about your data..."
          className="w-full p-2 border rounded"
          disabled={isLoading}
        />
      </form>
    </div>
  );
}
```

### Embedding Generation

```typescript
// src/lib/ai/embeddings.ts
import { embed, embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: openai.embedding('text-embedding-3-large'),
    value: text,
  });
  return embedding;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: openai.embedding('text-embedding-3-large'),
    values: texts,
  });
  return embeddings;
}
```

---

## 9. API Routes Migration

### Mapping Django Endpoints to Next.js API Routes

| Django Endpoint | Next.js Route | Method |
|-----------------|---------------|--------|
| `/api/accounts/me/` | `/api/users/me` | GET |
| `/api/accounts/organisations/` | `/api/organisations` | GET, POST |
| `/api/accounts/settings/` | `/api/organisations/[id]/settings` | GET, PUT |
| `/api/data_sources/dbt-projects/` | `/api/dbt-projects` | GET, POST |
| `/api/data_sources/dbt-projects/{id}/sync/` | `/api/dbt-projects/[id]/sync` | POST |
| `/api/knowledge_base/models/` | `/api/models` | GET |
| `/api/knowledge_base/search/` | `/api/models/search` | POST |
| `/api/workflows/ask/` | `/api/chat` | POST |
| `/api/workflows/conversations/` | `/api/conversations` | GET, POST |
| `/api/embeddings/` | `/api/embeddings` | GET, POST |
| `/api/integrations/{key}/` | `/api/integrations/[key]` | GET, PUT |

### Example: dbt Projects API

```typescript
// src/app/api/dbt-projects/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireAuth, requireOrganisation } from '@/lib/api-middleware';

export async function GET() {
  const supabase = await createClient();
  const { user, organisationId } = await requireOrganisation(supabase);

  const { data: projects, error } = await supabase
    .from('dbt_projects')
    .select(`
      *,
      dbt_models(count)
    `)
    .eq('organisation_id', organisationId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { user, organisationId } = await requireOrganisation(supabase);

  const body = await req.json();

  const { data: project, error } = await supabase
    .from('dbt_projects')
    .insert({
      organisation_id: organisationId,
      name: body.name,
      source_type: body.sourceType,
      dbt_cloud_account_id: body.dbtCloudAccountId,
      dbt_cloud_project_id: body.dbtCloudProjectId,
      // ... other fields
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(project, { status: 201 });
}
```

---

## 10. Integrations Migration

### 10.1 Slack Integration

**Current:** Django handles Slack webhooks, OAuth, event processing

**Target:** Next.js API routes + Supabase Edge Functions

```typescript
// src/app/api/integrations/slack/events/route.ts
import { NextResponse } from 'next/server';
import { verifySlackRequest } from '@/lib/slack/verify';
import { processSlackEvent } from '@/lib/slack/events';

export async function POST(req: Request) {
  const body = await req.text();
  const headers = Object.fromEntries(req.headers.entries());

  // Verify request is from Slack
  const isValid = verifySlackRequest(body, headers);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(body);

  // Handle URL verification challenge
  if (event.type === 'url_verification') {
    return NextResponse.json({ challenge: event.challenge });
  }

  // Process event asynchronously (Slack expects fast response)
  // Use Supabase Edge Function or Vercel background function
  await processSlackEvent(event);

  return NextResponse.json({ ok: true });
}
```

**Slack OAuth:**
```typescript
// src/app/api/integrations/slack/oauth/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  // Exchange code for tokens
  const response = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      code: code!,
    }),
  });

  const data = await response.json();

  // Store tokens in Supabase Vault
  // ... (see Secrets Management section)

  return NextResponse.redirect('/dashboard/integrations?slack=success');
}
```

### 10.2 GitHub Integration

Similar pattern - use Next.js API routes for OAuth flow.

### 10.3 Snowflake Connection

```typescript
// src/lib/snowflake/client.ts
import snowflake from 'snowflake-sdk';

export async function testSnowflakeConnection(config: {
  account: string;
  username: string;
  password: string;
  warehouse: string;
  database: string;
}) {
  return new Promise((resolve, reject) => {
    const connection = snowflake.createConnection(config);

    connection.connect((err, conn) => {
      if (err) {
        reject(err);
      } else {
        conn.destroy((destroyErr) => {
          if (destroyErr) reject(destroyErr);
          else resolve({ success: true });
        });
      }
    });
  });
}
```

---

## 11. Secrets Management

### Current: AWS Parameter Store (SSM)

Secrets stored at paths like:
```
/ragstar/{environment}/org-{org_id}/{resource_type}/{resource_id}/credentials
```

### Target: Supabase Vault + Environment Variables

**1. Environment variables (global secrets):**
- `OPENAI_API_KEY` (fallback)
- `ANTHROPIC_API_KEY` (fallback)
- `SLACK_CLIENT_SECRET`
- etc.

**2. Supabase Vault (per-org secrets):**
```typescript
// src/lib/secrets.ts
import { createClient } from '@/lib/supabase/server';

export async function storeOrgSecret(
  organisationId: string,
  key: string,
  value: string
) {
  const supabase = await createClient();

  // Use Supabase Vault to store encrypted secrets
  const { error } = await supabase.rpc('vault.create_secret', {
    secret: value,
    name: `org_${organisationId}_${key}`,
  });

  if (error) throw error;
}

export async function getOrgSecret(
  organisationId: string,
  key: string
): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('vault.read_secret', {
    name: `org_${organisationId}_${key}`,
  });

  if (error) return null;
  return data;
}
```

**Vault setup:**
```sql
-- Enable vault extension
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- Grant access to authenticated users
GRANT ALL ON SCHEMA vault TO authenticated;
```

---

## 12. Background Jobs & Queues

### Current: Celery + Redis

Used for:
- dbt project sync (long-running)
- Embedding generation (batch processing)
- Slack response handling (async)
- Model interpretation (LLM calls)

### Target Options

**Option A: Vercel Background Functions**
```typescript
// For tasks under 5 minutes
export const maxDuration = 300; // 5 minutes

export async function POST(req: Request) {
  // Long-running task
}
```

**Option B: Supabase Edge Functions**
```typescript
// supabase/functions/sync-dbt-project/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const { projectId } = await req.json();

  // Long-running sync logic

  return new Response(JSON.stringify({ success: true }));
});
```

**Option C: Inngest (Recommended for complex workflows)**
```typescript
// src/inngest/functions.ts
import { inngest } from './client';

export const syncDbtProject = inngest.createFunction(
  { id: 'sync-dbt-project' },
  { event: 'dbt/project.sync' },
  async ({ event, step }) => {
    const { projectId } = event.data;

    // Step 1: Download manifest
    const manifest = await step.run('download-manifest', async () => {
      return await downloadDbtManifest(projectId);
    });

    // Step 2: Parse models
    const models = await step.run('parse-models', async () => {
      return parseManifest(manifest);
    });

    // Step 3: Generate embeddings (can be parallelized)
    await step.run('generate-embeddings', async () => {
      await generateEmbeddings(models);
    });

    return { modelsProcessed: models.length };
  }
);
```

---

## 13. MCP Server Migration

### Current: Standalone FastMCP Server (Python)

- Runs on port 8080
- OAuth 2.0 + PKCE
- Proxies to Django API
- Exposes tools: `list_dbt_models`, `search_dbt_models`, `get_model_details`, `get_project_summary`

### Target: Next.js API Routes with MCP Protocol

**Option A: Use `@modelcontextprotocol/sdk`**
```typescript
// src/app/api/mcp/route.ts
import { McpServer } from '@modelcontextprotocol/sdk/server';

const server = new McpServer({
  name: 'ragstar',
  version: '1.0.0',
});

server.tool('list_dbt_models', async (params, context) => {
  // Implementation
});

server.tool('search_dbt_models', async (params, context) => {
  // Implementation
});

export async function POST(req: Request) {
  return server.handle(req);
}
```

**Option B: Custom Implementation**

The MCP protocol is JSON-RPC 2.0 based. You can implement it manually:

```typescript
// src/app/api/mcp/route.ts
export async function POST(req: Request) {
  const { jsonrpc, method, params, id } = await req.json();

  let result;
  switch (method) {
    case 'tools/list':
      result = getToolsList();
      break;
    case 'tools/call':
      result = await callTool(params.name, params.arguments);
      break;
    // ... other methods
  }

  return Response.json({ jsonrpc: '2.0', result, id });
}
```

**OAuth for MCP:**
- Use Supabase Auth OAuth provider
- Or implement custom OAuth server in Next.js API routes

---

## 14. Migration Phases

### Phase 1: Foundation (Week 1-2) — COMPLETE

1. **Set up Supabase project** ✅
   - Next.js 16 initialized with TypeScript, Tailwind, App Router
   - Supabase config.toml created (local dev, email confirmations disabled)
   - `.env.local` / `.env.example` with placeholder values
   - shadcn/ui initialized (button, card, input, label)

2. **Create database schema** ✅
   - 6 SQL migration files in `v2/supabase/migrations/`:
     - `001_core_tables.sql` — profiles, organisations, org_members, org_settings + triggers
     - `002_data_sources.sql` — dbt_projects
     - `003_knowledge_base.sql` — dbt_models with unique constraints
     - `004_embeddings.sql` — model_embeddings, HNSW index, search_models() function
     - `005_workflows_and_misc.sql` — conversations, conversation_parts, questions, integrations, waitlist, whitelist
     - `006_rls_policies.sql` — RLS policies for all tables with helper functions
   - TypeScript Database types manually written in `src/types/database.ts`

3. **Export and import data** (deferred — no production data yet)

4. **Set up authentication** ✅
   - Supabase Auth via `@supabase/ssr` (server + browser + admin clients)
   - Middleware for session refresh + route protection
   - Sign-in, sign-up, auth callback pages
   - Dashboard layout with org membership check
   - Onboarding page for organisation creation
   - Auto-create profile trigger on user signup
   - Auto-create org_settings trigger on org creation

### Phase 2: Core APIs (Week 3-4)

5. **Create API routes**
   - User/organisation management
   - dbt projects CRUD
   - Models and embeddings read/write

6. **Update frontend**
   - Replace Django API calls with Supabase/new API routes
   - Update authentication hooks
   - Test all existing flows

### Phase 3: AI Workflows (Week 5-6)

7. **Implement Vercel AI SDK**
   - Set up AI tools (search, fetch models)
   - Create streaming chat endpoint
   - Implement conversation storage

8. **Embedding generation**
   - Port embedding service
   - Create background job for batch processing

9. **Test Q&A workflow**
   - End-to-end testing
   - Compare with Django implementation

### Phase 4: Integrations (Week 7-8)

10. **Slack integration**
    - Port webhook handlers
    - Port OAuth flow
    - Test message handling

11. **MCP server**
    - Implement MCP protocol
    - Port OAuth/authentication
    - Test with Claude.ai

12. **Other integrations**
    - GitHub OAuth
    - Snowflake connection

### Phase 5: Cleanup (Week 9-10)

13. **Remove Django backend**
    - Delete backend_django directory
    - Update Docker Compose (optional: keep for local dev)
    - Update documentation

14. **Final testing**
    - Full regression testing
    - Performance testing
    - Security audit

15. **Deploy to production**
    - Set up Vercel project
    - Configure environment variables
    - DNS/domain setup

---

## 15. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **LangGraph workflows complex to port** | High | Start with simpler workflow, iterate. Consider keeping Python for complex workflows via serverless functions |
| **Supabase Edge Function time limits** | Medium | Use Inngest for long-running tasks, or Vercel background functions |
| **Authentication migration breaks existing sessions** | High | Plan maintenance window, communicate to users, provide re-login instructions |
| **Embedding dimension mismatch** | Medium | Keep same embedding model (text-embedding-3-large), verify dimensions |
| **MCP protocol compatibility** | Medium | Thoroughly test with Claude.ai before deprecating old server |
| **Performance regression** | Medium | Benchmark before and after, optimize Supabase queries |
| **Data loss during migration** | Critical | Multiple backups, dry-run migration on staging first |

---

## 16. Open Questions

1. **Local development:** Should we use Supabase local Docker setup or cloud for dev?
   - Recommendation: Local for speed, cloud for CI/CD

2. **Self-hosting vs managed Supabase:** What's the preference for production?
   - Cloud is easier but self-hosted gives more control

3. **Inngest vs Supabase Edge Functions:** Which for background jobs?
   - Inngest better for complex workflows, Edge Functions for simple tasks

4. **Keep any Python?** Should we maintain any Python for complex AI workflows?
   - Could run LangGraph in a serverless Python function if needed

5. **MCP OAuth:** Continue with custom OAuth or integrate with Supabase Auth?
   - Supabase Auth simpler but may need custom provider

6. **Multi-tenancy approach:** Continue with org-scoped tables or switch to separate schemas?
   - Current approach (RLS + org_id) scales well with Supabase

7. **Existing users:** Do we need to migrate user passwords or force password resets?
   - Supabase Auth uses different hashing; may need migration script or reset

---

## Appendix: File Structure (Post-Migration)

```
ragstar/
├── src/
│   ├── app/
│   │   ├── (auth)/              # Auth pages
│   │   ├── (marketing)/         # Landing pages
│   │   ├── dashboard/           # Main app
│   │   ├── api/
│   │   │   ├── auth/           # Auth.js handlers
│   │   │   ├── chat/           # Vercel AI SDK streaming
│   │   │   ├── dbt-projects/
│   │   │   ├── models/
│   │   │   ├── organisations/
│   │   │   ├── integrations/
│   │   │   │   ├── slack/
│   │   │   │   └── github/
│   │   │   └── mcp/            # MCP protocol
│   │   └── layout.tsx
│   ├── components/
│   │   ├── layout/
│   │   ├── ui/
│   │   ├── chat/
│   │   └── ...
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── admin.ts
│   │   ├── ai/
│   │   │   ├── tools.ts
│   │   │   ├── embeddings.ts
│   │   │   └── prompts.ts
│   │   ├── slack/
│   │   ├── dbt/
│   │   └── utils.ts
│   └── types/
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_enable_pgvector.sql
│   │   └── ...
│   └── functions/
│       └── sync-dbt-project/
├── package.json
├── next.config.ts
├── .env.local
└── README.md
```

---

## References

- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth with Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [pgvector Supabase Guide](https://supabase.com/docs/guides/ai/vector-columns)
- [MCP Protocol Specification](https://modelcontextprotocol.io/specification)
- [Inngest Documentation](https://www.inngest.com/docs)
