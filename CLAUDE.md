# Project Description

Ragstar is an LLM-powered AI data analyst for Data Engineering teams that work with dbt to manage their analytics codebases. Users connect their dbt projects (Cloud or GitHub) to build a knowledge base, then use AI workflows to ask questions about their data and get queries or insights via the web dashboard or Slack.

The migration from Django + NextJS (v1) to NextJS + Supabase (v2) is **complete**. Active development is in `v2/`.

# Repository Structure

```
ragstar/
├── v1/                    # Legacy: Django + NextJS + Celery/Redis (read-only)
│
├── v2/                    # Current: NextJS + Supabase + Vercel AI SDK
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/          # Sign-in, sign-up pages
│   │   │   ├── auth/callback/   # OAuth code exchange
│   │   │   ├── dashboard/       # Main app (projects, knowledge base, chat, settings)
│   │   │   └── api/             # API routes (chat, dbt-projects, models, mcp, integrations)
│   │   ├── components/          # shadcn/ui + layout + feature components
│   │   ├── lib/                 # Supabase clients, AI tools, embeddings, prompts, Slack
│   │   └── types/database.ts    # TypeScript DB types (generated from Supabase schema)
│   ├── supabase/
│   │   ├── config.toml          # Local dev config
│   │   └── migrations/          # 9 SQL migration files
│   ├── .env.example             # Environment variable template
│   └── package.json
│
├── docs/                  # GitHub Pages documentation
├── MIGRATION_PLAN.md      # Migration documentation
└── LICENSE
```

# Migration Progress

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1: Foundation | **COMPLETE** | Next.js init, Supabase config, DB migrations, auth, routing |
| Phase 2: Core APIs | **COMPLETE** | dbt projects, knowledge base, models, settings, dashboard |
| Phase 3: AI Workflows | **COMPLETE** | Vercel AI SDK, embeddings, chat with tool calling |
| Phase 4: Integrations | **COMPLETE** | MCP server, Slack bot, GitHub OAuth |
| Phase 5: Cleanup | **COMPLETE** | Documentation updated, v1 archived |

**Prerequisites for local development:** Docker running + Supabase CLI installed (`brew install supabase/tap/supabase`), then `cd v2 && supabase start && cp .env.example .env.local` and fill in keys.

# Active Development

**Focus: v2 (NextJS + Supabase)**

New development should happen in `v2/`. The v1 codebase is in maintenance mode.

## v2 Stack

| Component | Technology |
|-----------|------------|
| Frontend + API | Next.js 16 (App Router) |
| Database | Supabase (PostgreSQL + pgvector) |
| Authentication | Supabase Auth |
| LLM Integration | Vercel AI SDK |
| Background Jobs | Supabase Edge Functions / Inngest |
| Styling | TailwindCSS + shadcn/ui |

## v2 Development Guidelines

### Package Management
- Use `pnpm` for package management
- Run commands from within `v2/` directory

### Supabase
- Use `supabase start` to run local Supabase
- Migrations go in `v2/supabase/migrations/`
- Edge functions go in `v2/supabase/functions/`

### API Routes
- All API routes in `src/app/api/`
- Use Supabase client for database operations
- Implement RLS policies for security

### AI Integration
- Use Vercel AI SDK for LLM interactions
- Tools defined in `src/lib/ai/tools.ts`
- Embeddings use OpenAI `text-embedding-3-large` (3072 dimensions)

### Authentication
- Supabase Auth handles user management
- Middleware refreshes sessions automatically
- RLS policies enforce data access

### Components
- Use shadcn/ui components from `src/components/ui/`
- Layout components in `src/components/layout/`
- Use TailwindCSS only (no custom CSS)

# v1 Reference (Legacy)

The v1 codebase in `v1/` uses:
- Django REST API with Celery/Redis for background jobs
- LangGraph/LangChain for AI workflows
- AWS SSM (LocalStack) for secrets
- Docker Compose for orchestration

See `v1/CLAUDE.md` for v1-specific guidelines.

# General Rules

- When adding packages, use the command line without version pinning (`pnpm add <pkg>` or `uv add <pkg>`) to always get the latest
- Use comments when necessary but avoid unnecessary breadcrumb comments
- For v2: Use TypeScript, App Router patterns, and server components where possible
- For v1: Follow existing Django patterns and run commands with `uv run`

# Migration Reference

See `MIGRATION_PLAN.md` for:
- Database schema migration details
- API route mappings (Django → Next.js)
- Authentication migration
- AI workflow migration (LangGraph → Vercel AI SDK)
- Integration migration (Slack, MCP)
