# Ragstar v2

AI-powered data analyst for dbt-based data teams. Slack is the conversation interface; the web app is for administration and conversation review.

See [local development](./LOCAL_DEVELOPMENT.md) for passwordless local admin entry with `pnpm dev:local`.

The Slack agent now uses eve. See [Eve migration and setup](./EVE_MIGRATION.md) for the updated Slack endpoint, Node.js requirements, and validation commands.

## Tech Stack

- **Next.js 16** - React framework with App Router
- **Supabase** - PostgreSQL database with pgvector, authentication, and edge functions
- **eve + Vercel AI SDK 7** - Durable Slack agent with dbt retrieval tools
- **TailwindCSS** - Styling
- **shadcn/ui** - UI components

## Getting Started

### Prerequisites

- Node.js 24
- pnpm
- Supabase CLI (`brew install supabase/tap/supabase`)

### Setup

```bash
# Install dependencies
pnpm install

# Start local Supabase
supabase start

# Apply database migrations
supabase db push

# Start development server
pnpm dev
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | From `supabase start` output |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | From `supabase start` output |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | From `supabase start` output |
| `OPENAI_API_KEY` | Yes* | Required for embeddings; also used for chat |
| `ANTHROPIC_API_KEY` | No | Required if using Anthropic models for chat |
| `GOOGLE_GENERATIVE_AI_API_KEY` | No | Required if using Google models for chat |
| `SLACK_CLIENT_ID` | No | For Slack bot integration |
| `SLACK_CLIENT_SECRET` | No | For Slack bot integration |
| `SLACK_SIGNING_SECRET` | No | For Slack event verification |
| `GITHUB_CLIENT_ID` | No | For GitHub OAuth (private repos) |
| `GITHUB_CLIENT_SECRET` | No | For GitHub OAuth (private repos) |

\* OpenAI is always required because it provides the embedding model (`text-embedding-3-large`).

## Project Structure

See `CLAUDE.md` for detailed project structure and development guidelines.

## Migration from v1

This is a complete rewrite of Ragstar, migrating from:
- Django + Celery + Redis → Next.js API routes + Supabase
- LangGraph/LangChain → Vercel AI SDK
- AWS SSM → Supabase Vault

See `MIGRATION_PLAN.md` in the repo root for full migration documentation.
