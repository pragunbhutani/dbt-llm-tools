# Ragstar — AI Data Analyst for dbt Projects

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

Ragstar connects to your **dbt** project, builds a knowledge base from your models and documentation, and lets anyone ask data questions in plain English — in Slack. The web dashboard is for administration and conversation review; the MCP endpoint exposes the knowledge base to compatible clients.

---

## Features

- **dbt Project Sync** — connect via dbt Cloud API or GitHub to import models and docs
- **Knowledge Base** — semantic search over your dbt model descriptions and columns
- **Slack agent** — ask questions in natural language; the assistant searches your models and drafts SQL
- **Slack Bot** — mention the bot in any channel to get AI-powered answers (no env vars required — credentials entered via the UI)
- **MCP Server** — expose your knowledge base to Claude Desktop, Cursor, or any MCP client
- **Multi-provider LLM** — choose OpenAI, Anthropic, or Google for chat

---

## Quick Start

Use **Node.js 24**. The Slack agent now uses **eve**; see the [migration guide](./v2/EVE_MIGRATION.md) for the new webhook URL and setup sequence.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (running)
- [Supabase CLI](https://supabase.com/docs/guides/cli) — `brew install supabase/tap/supabase`
- [pnpm](https://pnpm.io/installation) — `npm install -g pnpm`

### 1. Install dependencies

```bash
cd v2
pnpm install
```

### 2. Start local Supabase

```bash
supabase start
```

This starts a local Supabase instance and prints your keys:

```
API URL: http://127.0.0.1:54321
anon key: eyJ...
service_role key: eyJ...
Studio URL: http://127.0.0.1:54323
```

### 3. Configure environment

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in at minimum:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from above>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from above>

# At least one LLM provider key:
OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=...
# GOOGLE_GENERATIVE_AI_API_KEY=...
```

> **Note:** OpenAI is also required for embeddings (`text-embedding-3-large`) even if you use Anthropic or Google for chat.

### 4. Run the app

```bash
pnpm dev
```

- App: http://localhost:3000
- Supabase Studio: http://localhost:54323

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only) |
| `OPENAI_API_KEY` | Yes | Used for embeddings; also for chat if using OpenAI |
| `ANTHROPIC_API_KEY` | No | Required if using Anthropic for chat |
| `GOOGLE_GENERATIVE_AI_API_KEY` | No | Required if using Google for chat |
| `NEXT_PUBLIC_APP_URL` | Recommended | Canonical URL of your deployment (e.g. `https://ragstar.mycompany.com`). On Vercel, `VERCEL_URL` is used automatically if this is not set. |
| `GITHUB_CLIENT_ID` | No | Required for GitHub OAuth (private repo access) |
| `GITHUB_CLIENT_SECRET` | No | Required for GitHub OAuth |

### Production / Self-hosted

Set `NEXT_PUBLIC_APP_URL` to your public URL so that webhook endpoints (Slack events, GitHub OAuth callback) resolve correctly.

On Vercel, `VERCEL_URL` is injected automatically per deployment so `NEXT_PUBLIC_APP_URL` is only needed if you're using a custom domain.

---

## Connecting Integrations

### Slack

No environment variables needed. Ragstar uses credentials you enter directly in the UI:

1. Go to **Slack** and click **Connect Slack**
2. The guided dialog walks you through creating a Slack app — you can paste the generated app manifest directly into the Slack API dashboard
3. Enter your **Bot User OAuth Token** and **Signing Secret** and save

After saving credentials, copy the Events endpoint from the dialog into Slack’s Event Subscriptions and save it. Existing apps must update their Request URL to the new eve endpoint.

### GitHub

Enables access to private repositories when connecting dbt projects.

1. Create a GitHub OAuth App at https://github.com/settings/developers
   - Set the callback URL to `<your-app-url>/api/integrations/github/callback`
2. Add `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` to your environment
3. Go to **Settings → Integrations** and click **Connect GitHub** to authorise

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend + API | Next.js 16 (App Router) |
| Database | Supabase (PostgreSQL + pgvector) |
| Authentication | Supabase Auth |
| Agent runtime | eve (Slack) + Vercel AI SDK 7 |
| Styling | TailwindCSS + shadcn/ui |

---

## Repository Structure

```
ragstar/
├── v2/                         # Current implementation (Next.js + Supabase)
│   ├── src/
│   │   ├── app/                # Pages and API routes
│   │   │   ├── (auth)/         # Sign-in / sign-up
│   │   │   ├── dashboard/      # Main app UI
│   │   │   └── api/            # REST + streaming API routes
│   │   ├── components/         # shadcn/ui + feature components
│   │   └── lib/                # Supabase clients, AI tools, Slack, utilities
│   ├── supabase/
│   │   ├── migrations/         # SQL migrations (run automatically by Supabase CLI)
│   │   └── functions/          # Edge functions
│   └── .env.example
│
├── v1/                         # Legacy implementation (Django + Celery + LangGraph) — archived
├── docs/                       # GitHub Pages documentation
└── LICENSE
```

---

## Contributing

Please open an issue first for major changes. PRs are welcome.

---

## License

Ragstar is released under the MIT License — see [LICENSE](./LICENSE).
