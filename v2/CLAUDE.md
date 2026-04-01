# Ragstar v2

This is the new Ragstar implementation using NextJS + Supabase + Vercel AI SDK.

## Stack

| Component | Technology |
|-----------|------------|
| Frontend + API | Next.js 16 (App Router) |
| Database | Supabase (PostgreSQL + pgvector) |
| Authentication | Supabase Auth |
| LLM Integration | Vercel AI SDK |
| Background Jobs | Supabase Edge Functions / Inngest |
| File Storage | Supabase Storage |
| Secrets | Supabase Vault |

## Project Structure

```
v2/
├── src/
│   ├── app/
│   │   ├── (auth)/           # Sign-in/sign-up pages
│   │   ├── (marketing)/      # Landing pages
│   │   ├── dashboard/        # Main app dashboard
│   │   ├── api/              # API routes
│   │   │   ├── chat/         # Vercel AI SDK streaming
│   │   │   ├── dbt-projects/
│   │   │   ├── models/
│   │   │   ├── organisations/
│   │   │   ├── integrations/
│   │   │   └── mcp/          # MCP protocol
│   │   └── layout.tsx
│   ├── components/
│   │   ├── layout/           # PageLayout, AppShell, etc.
│   │   ├── ui/               # shadcn/ui components
│   │   └── chat/             # Chat interface components
│   ├── lib/
│   │   ├── supabase/         # Supabase client (server/client)
│   │   ├── ai/               # AI tools, embeddings, prompts
│   │   ├── dbt/              # dbt parsing utilities
│   │   └── slack/            # Slack integration
│   └── types/                # TypeScript types
├── supabase/
│   ├── config.toml           # Supabase local config
│   ├── migrations/           # SQL migrations
│   └── functions/            # Edge functions
├── package.json
├── next.config.ts
└── .env.local
```

## Development

```bash
# Install dependencies
pnpm install

# Start Supabase locally
supabase start

# Run Next.js dev server
pnpm dev
```

## Key Patterns

### Supabase Clients

- Use `createClient()` from `@/lib/supabase/server` in Server Components and API routes
- Use `createClient()` from `@/lib/supabase/client` in Client Components

### API Routes

- All API routes are in `src/app/api/`
- Use Supabase for database operations
- Implement RLS policies for security

### AI Integration

- Use Vercel AI SDK for streaming responses
- Tools defined in `src/lib/ai/tools.ts`
- Embeddings use OpenAI `text-embedding-3-large` (3072 dimensions)

### Authentication

- Supabase Auth handles user management
- Middleware refreshes sessions automatically
- RLS policies enforce data access

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
```

## References

See `MIGRATION_PLAN.md` in the repo root for detailed migration documentation.
