# Slack Agent Setup Wizard

Interactive wizard for building and deploying Slack agents on Vercel using the [Chat SDK](https://www.chat-sdk.dev/). This wizard guides users through the complete setup process from project creation to production deployment.

## Key Feature: Custom Implementation Planning

When starting a new project, the wizard generates a **custom implementation plan** tailored to the specific agent the user wants to build. Instead of a generic template setup, users get:

- Specific slash commands for their use case
- Appropriate AI tools and capabilities
- Right-sized state management
- Concrete file paths to create

This plan is presented for approval before any code is scaffolded, allowing users to refine the scope before implementation.

## How to Use

The wizard is divided into 7 phases. Based on the user's request and project state, determine which phase to start with:

### Command Arguments

- `new` - Start fresh with Phase 1 (new project)
- `configure` - Start with Phase 2 or 3 (existing project)
- `deploy` - Start with Phase 5 (deploy to production)
- `test` - Start with Phase 6 (set up testing)
- (no argument) - Auto-detect based on project state

### Phase Detection

Check the project state to determine the appropriate starting phase:

| Condition | Starting Phase |
|-----------|----------------|
| No `package.json` with `chat` | Phase 1 - New project |
| Has project but `manifest.json` not customized | Phase 2 - Create Slack app |
| Has project but no `.env` file | Phase 3 - Configure environment |
| Has `.env` but not tested locally | Phase 4 - Test locally |
| Tested locally but not deployed | Phase 5 - Deploy to production |
| Deployed but no tests | Phase 6 - Set up testing |

### Wizard Phases

1. **[Project Setup](./1-project-setup.md)** - Understand purpose, generate implementation plan
1b. **[Approve Plan](./1b-approve-plan.md)** - Review and approve custom implementation plan
2. **[Create Slack App](./2-create-slack-app.md)** - Customize manifest, create app in Slack
3. **[Configure Environment](./3-configure-environment.md)** - Set up .env with credentials
4. **[Test Locally](./4-test-locally.md)** - Dev server + ngrok tunnel
5. **[Deploy to Production](./5-deploy-production.md)** - Vercel deployment
6. **[Set Up Testing](./6-setup-testing.md)** - Vitest configuration (optional)

## Context to Maintain

Throughout the wizard, track these user choices for use in later phases:

- **Agent purpose** - What the bot does (used for naming and manifest)
- **Implementation plan** - The approved custom plan with features, commands, and tools
- **Project name** - Directory name for the project
- **LLM provider choice** - AI Gateway, direct provider, or none
- **Slack credentials** - Bot token and signing secret (never display full values)
- **Deployment URL** - Vercel URL for production
- **Deployment protection status** - Whether bypass secret is needed

## Quick Reference

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start local dev server (port 3000) |
| `ngrok http 3000` | Expose local server to internet |
| `pnpm lint` | Check for linting errors |
| `pnpm lint --write` | Auto-fix lint issues |
| `pnpm test` | Run test suite |
| `pnpm typecheck` | TypeScript validation |
| `vercel` | Deploy to Vercel |

## Environment Variables Summary

| Variable | Required | Where to Get It |
|----------|----------|-----------------|
| `SLACK_BOT_TOKEN` | Yes | Slack App > Install App |
| `SLACK_SIGNING_SECRET` | Yes | Slack App > Basic Information |
| `REDIS_URL` | Yes (production) | Upstash or any Redis provider |
| `NGROK_AUTH_TOKEN` | Local only | ngrok.com dashboard |
| `OPENAI_API_KEY` | Only if using direct OpenAI | platform.openai.com/api-keys |
| `ANTHROPIC_API_KEY` | Only if using direct Anthropic | console.anthropic.com/settings/keys |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Only if using direct Google | aistudio.google.com/apikey |

**Using Vercel AI Gateway?** No AI API keys needed - it handles authentication automatically when deployed on Vercel.
