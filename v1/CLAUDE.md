# Ragstar v1 (Legacy)

This folder contains the original Ragstar implementation using Django + NextJS + Redis/Celery.

**Status:** This is the legacy codebase that is being migrated to v2 (NextJS + Supabase).

For the new implementation, see `/v2/`.

## Running v1

```bash
cd v1
docker-compose up
```

## Structure

- `backend_django/` - Django REST API with DRF, Celery, LangGraph workflows
- `frontend_nextjs/` - Next.js 15 frontend with Auth.js
- `mcp_server/` - FastMCP server for Claude/LLM client connections
- `config_examples/` - Example configuration files
- `docker-compose.yml` - Docker orchestration for all services

## Services

| Service | Port | Description |
|---------|------|-------------|
| backend-django | 8000 | Django REST API |
| frontend-nextjs | 3000 | Next.js Frontend |
| mcp-server | 8080 | MCP Protocol Server |
| db | 5432 | PostgreSQL + pgvector |
| redis | 6379 | Cache & Celery broker |
| celery-worker | - | Async task execution |
| flower | 5555 | Celery monitoring |
| localstack | 4566 | Mock AWS (SSM) |

## Notes

- This codebase uses Python + TypeScript
- Background jobs run via Celery + Redis
- Secrets stored in AWS Parameter Store (LocalStack for dev)
- See the main `MIGRATION_PLAN.md` at the repo root for migration details
