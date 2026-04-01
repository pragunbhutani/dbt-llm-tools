# Agent Archetypes Reference

This document provides common patterns and archetypes for Slack agents. Use this as a reference when generating custom implementation plans based on user requirements.

## Implementation Plan Template

When generating a plan, use this structure:

```markdown
## Implementation Plan: [Agent Name]

### Overview
[1-2 sentence description of what this agent does]

### Core Features
1. **[Feature 1]** - [Description]
2. **[Feature 2]** - [Description]
3. **[Feature 3]** - [Description]

### Slash Commands
| Command | Description | Example |
|---------|-------------|---------|
| `/command` | What it does | `/command arg` |

### Event Handlers

**If using Chat SDK:**
- [ ] `bot.onNewMention` - [What happens when @mentioned]
- [ ] `bot.onSubscribedMessage` - [Follow-up message handling]
- [ ] `bot.onReaction` - [If applicable]
- [ ] `bot.onSlashCommand` - [Slash command handling]

**If using Bolt for JavaScript:**
- [ ] `app.event('app_mention')` - [What happens when @mentioned]
- [ ] `app.message()` - [Follow-up message handling]
- [ ] `app.command()` - [Slash command handling]
- [ ] `app.action()` - [Button/interactive handling]

### AI Tools (if using AI)
| Tool | Purpose | Parameters |
|------|---------|------------|
| `toolName` | What it does | `param1`, `param2` |

### Scheduled Jobs (if applicable)
| Schedule | Action |
|----------|--------|
| `0 9 * * 1-5` | Description |

### State Management
- [ ] Stateless (simple request/response)
- [ ] **Chat SDK:** `@chat-adapter/state-redis` for thread-level persistence
- [ ] **Bolt:** Vercel Workflow for durable multi-turn state
- [ ] Database (persistent storage)
  - Upstash Redis for Chat SDK state adapter or general caching
  - Vercel Blob for file/document storage
  - AWS Aurora via Vercel Marketplace for relational data
  - NOTE: Do NOT recommend Vercel KV (deprecated)

### UI Components
**Chat SDK:** JSX components (`<Card>`, `<Button>`, `<Modal>`)
**Bolt:** Block Kit JSON

- [ ] Cards / rich messages
- [ ] Modal dialogs
- [ ] Home tab

### Files to Create/Modify

**If using Chat SDK:**
- `lib/bot.tsx` - Bot instance and event handlers
- `lib/tools/[tool].ts` - AI tool definitions
- `app/api/webhooks/[platform]/route.ts` - Webhook route
- `app/api/cron/[job]/route.ts` - Cron endpoints (if applicable)

**If using Bolt for JavaScript:**
- `server/bolt/app.ts` - Bolt app instance
- `server/listeners/events/[event].ts` - Event handlers
- `server/listeners/commands/[command].ts` - Slash command handlers
- `server/lib/ai/tools.ts` - AI tool definitions
- `server/api/slack/events.post.ts` - Events endpoint
- `server/api/cron/[job].get.ts` - Cron endpoints (if applicable)
```

---

## Archetype 1: Standup / Reminder Bot

**Use case:** Collects updates from team members on a schedule and summarizes them.

### Typical Features
- Scheduled prompts at specific times (e.g., 9 AM on weekdays)
- DM-based response collection
- Summary generation and posting to channels
- Tracking who has/hasn't responded

### Example Plan

```markdown
## Implementation Plan: Standup Bot

### Overview
A bot that collects daily standup updates from team members and posts a summary to a channel.

### Core Features
1. **Scheduled Prompts** - DM team members at 9 AM asking for their update
2. **Response Collection** - Accept free-form or structured responses
3. **Summary Generation** - AI-generated summary of all responses
4. **Status Tracking** - Track who has/hasn't responded

### Slash Commands
| Command | Description | Example |
|---------|-------------|---------|
| `/standup` | Submit your standup update manually | `/standup Working on API integration` |
| `/standup-status` | Check who has submitted today | `/standup-status` |
| `/standup-configure` | Configure standup time/channel | `/standup-configure #team 9:00` |

### Event Handlers
- [x] `onSubscribedMessage` - Collect standup responses in DM threads
- [x] `onNewMention` - Answer questions about standup status

### AI Tools
| Tool | Purpose | Parameters |
|------|---------|------------|
| `summarize_standups` | Generate summary of all responses | `responses[]` |
| `parse_update` | Extract blockers/accomplishments | `updateText` |

### Scheduled Jobs
| Schedule | Action |
|----------|--------|
| `0 9 * * 1-5` | Send standup prompts to all team members |
| `0 10 * * 1-5` | Post summary to configured channel |

### State Management
- [x] Chat SDK state - Track daily responses per thread
- [x] Database (persistent storage) - Track configuration, history

### UI Components (JSX)
- [x] `<Card>` with `<Button>` - Quick response buttons
- [x] `<Modal>` - Configuration modal

### Files to Create/Modify (Chat SDK)
- `lib/bot.tsx` - Bot instance, mention/message handlers
- `lib/tools/summarize-standups.ts`
- `lib/standup/scheduler.ts`
- `lib/standup/storage.ts`
- `app/api/webhooks/[platform]/route.ts`
- `app/api/cron/standup-prompt/route.ts`
- `app/api/cron/standup-summary/route.ts`

### Files to Create/Modify (Bolt)
- `server/bolt/app.ts` - Bolt app instance
- `server/listeners/events/app-mention.ts`
- `server/listeners/commands/standup.ts`
- `server/lib/ai/tools.ts`
- `server/api/slack/events.post.ts`
- `server/api/cron/standup-prompt.get.ts`
- `server/api/cron/standup-summary.get.ts`
```

---

## Archetype 2: Support / Help Desk Bot

**Use case:** Handles support requests, tracks tickets, and can escalate to humans.

### Typical Features
- Ticket creation and tracking
- Knowledge base search
- Escalation to human agents
- Status updates and notifications

### Example Plan

```markdown
## Implementation Plan: Support Assistant

### Overview
An AI-powered support bot that answers questions, creates tickets, and escalates to humans when needed.

### Core Features
1. **Knowledge Base Search** - Search documentation to answer questions
2. **Ticket Creation** - Create tickets in external system
3. **Escalation** - Route complex issues to human agents
4. **Status Tracking** - Check and update ticket status

### Slash Commands
| Command | Description | Example |
|---------|-------------|---------|
| `/support` | Ask a support question | `/support How do I reset my password?` |
| `/ticket` | Create a support ticket | `/ticket Login not working on mobile` |
| `/ticket-status` | Check ticket status | `/ticket-status #1234` |

### Event Handlers
- [x] `onNewMention` - Answer support questions in channels
- [x] `onSubscribedMessage` - Multi-turn support conversations

### AI Tools
| Tool | Purpose | Parameters |
|------|---------|------------|
| `search_knowledge_base` | Search docs for answers | `query` |
| `create_ticket` | Create ticket in system | `title`, `description`, `priority` |
| `get_ticket_status` | Check ticket status | `ticketId` |
| `escalate_to_human` | Route to human agent | `ticketId`, `reason` |

### State Management
- [x] Chat SDK state - Multi-turn conversation history
- [x] Database (persistent storage) - Ticket tracking

### UI Components (JSX)
- [x] `<Card>` with `<Button>` - Ticket actions, escalation button
- [x] `<Modal>` - Ticket creation form

### Files to Create/Modify (Chat SDK)
- `lib/bot.tsx` - Bot instance, handlers
- `lib/tools/search-knowledge-base.ts`
- `lib/tools/create-ticket.ts`
- `lib/tools/escalate.ts`
- `app/api/webhooks/[platform]/route.ts`

### Files to Create/Modify (Bolt)
- `server/bolt/app.ts`, `server/listeners/events/app-mention.ts`
- `server/lib/ai/tools.ts`
- `server/api/slack/events.post.ts`
```

---

## Archetype 3: Information / Lookup Bot

**Use case:** Fetches and formats information from external APIs.

### Typical Features
- External API integration
- Formatted responses with JSX components
- Caching for performance
- Multiple data sources

### Example Plan

```markdown
## Implementation Plan: Weather Bot

### Overview
A bot that provides weather information for any location using an external weather API.

### Core Features
1. **Current Weather** - Get current conditions for a location
2. **Forecast** - Get multi-day forecast
3. **Alerts** - Weather alerts and warnings
4. **Location Memory** - Remember user's preferred locations

### Slash Commands
| Command | Description | Example |
|---------|-------------|---------|
| `/weather` | Get current weather | `/weather San Francisco` |
| `/forecast` | Get 5-day forecast | `/forecast New York` |
| `/weather-alerts` | Get active alerts | `/weather-alerts California` |
| `/weather-set-default` | Set default location | `/weather-set-default Seattle` |

### Event Handlers
- [x] `onNewMention` - Answer weather questions in channels
- [x] `onSubscribedMessage` - Follow-up weather queries

### AI Tools
| Tool | Purpose | Parameters |
|------|---------|------------|
| `get_current_weather` | Fetch current conditions | `location` |
| `get_forecast` | Fetch multi-day forecast | `location`, `days` |
| `get_weather_alerts` | Fetch active alerts | `region` |

### State Management
- [ ] Stateless (simple request/response) - Most queries are one-shot
- [x] Chat SDK state - User location preferences per thread

### UI Components (JSX)
- [x] `<Card>` - Formatted weather cards
- [ ] `<Modal>` - Not needed

### Files to Create/Modify (Chat SDK)
- `lib/bot.tsx` - Bot instance, handlers
- `lib/tools/get-weather.ts`
- `lib/weather/api-client.ts`
- `lib/weather/formatters.tsx`
- `app/api/webhooks/[platform]/route.ts`

### Files to Create/Modify (Bolt)
- `server/bolt/app.ts`, `server/listeners/commands/weather.ts`
- `server/lib/ai/tools.ts`
- `server/api/slack/events.post.ts`
```

---

## Archetype 4: Conversational AI Bot

**Use case:** General-purpose conversational assistant with multi-turn dialogue.

### Typical Features
- Multi-turn conversation with context
- Tool calling for actions
- Memory of past interactions
- Personality customization

### Example Plan

```markdown
## Implementation Plan: AI Assistant

### Overview
A conversational AI assistant that can help with various tasks through natural dialogue.

### Core Features
1. **Multi-turn Conversations** - Maintains context across messages
2. **Tool Calling** - Performs actions based on conversation
3. **Conversation Memory** - Remembers past interactions via thread state
4. **Customizable Personality** - Adjustable system prompt

### Slash Commands
| Command | Description | Example |
|---------|-------------|---------|
| `/ask` | Start a conversation | `/ask Help me write an email` |

### Event Handlers
- [x] `onNewMention` - Respond to @mentions with AI
- [x] `onSubscribedMessage` - Full conversations in threads

### AI Tools
| Tool | Purpose | Parameters |
|------|---------|------------|
| `search_web` | Search the internet | `query` |
| `calculate` | Perform calculations | `expression` |
| `set_reminder` | Create a reminder | `message`, `time` |

### State Management
- [x] Chat SDK state - Conversation history per thread
- [x] Database (persistent storage) - Long-term memory

### UI Components (JSX)
- [x] `<Card>` with `<Button>` - Action suggestions
- [ ] `<Modal>` - Not typically needed

### Files to Create/Modify (Chat SDK)
- `lib/bot.tsx` - Bot instance, mention/message handlers
- `lib/tools/search-web.ts`
- `lib/tools/calculate.ts`
- `lib/ai/agent.ts` - Agent configuration
- `app/api/webhooks/[platform]/route.ts`

### Files to Create/Modify (Bolt)
- `server/bolt/app.ts`, `server/listeners/events/app-mention.ts`
- `server/lib/ai/agent.ts`, `server/lib/ai/tools.ts`
- `server/api/slack/events.post.ts`
```

---

## Archetype 5: Automation Bot

**Use case:** Automates workflows and integrates with external services.

### Typical Features
- Slash commands for actions
- Interactive confirmations
- Webhook integrations
- Scheduled automations

### Example Plan

```markdown
## Implementation Plan: Deploy Bot

### Overview
A bot that helps manage deployments, CI/CD pipelines, and release workflows.

### Core Features
1. **Deployment Triggers** - Start deployments via slash command
2. **Status Monitoring** - Check deployment status
3. **Rollback Support** - Quick rollback to previous versions
4. **Notifications** - Post updates to channels

### Slash Commands
| Command | Description | Example |
|---------|-------------|---------|
| `/deploy` | Trigger a deployment | `/deploy staging` |
| `/deploy-status` | Check deployment status | `/deploy-status production` |
| `/rollback` | Rollback to previous version | `/rollback production` |
| `/releases` | List recent releases | `/releases` |

### Event Handlers
- [x] `onNewMention` - Answer deployment questions
- [x] `onAction` - Handle confirmation buttons

### AI Tools
| Tool | Purpose | Parameters |
|------|---------|------------|
| `trigger_deployment` | Start a deployment | `environment`, `branch` |
| `get_deployment_status` | Check status | `deploymentId` |
| `rollback_deployment` | Trigger rollback | `environment`, `version` |
| `list_releases` | Get recent releases | `count` |

### State Management
- [ ] Stateless (simple request/response) - Commands are atomic

### UI Components (JSX)
- [x] `<Card>` with `<Button>` - Confirm/cancel buttons
- [x] `<Modal>` - Deployment configuration

### Files to Create/Modify (Chat SDK)
- `lib/bot.tsx` - Bot instance, command/action handlers
- `lib/tools/trigger-deployment.ts`
- `lib/tools/get-deployment-status.ts`
- `lib/deploy/github-client.ts`
- `app/api/webhooks/[platform]/route.ts`

### Files to Create/Modify (Bolt)
- `server/bolt/app.ts`, `server/listeners/commands/deploy.ts`
- `server/lib/ai/tools.ts`
- `server/lib/deploy/github-client.ts`
- `server/api/slack/events.post.ts`
```

---

## Archetype 6: Notification / Alerting Bot

**Use case:** Monitors systems and sends alerts to Slack channels.

### Typical Features
- Webhook receiver for external events
- Alert routing to appropriate channels
- Alert acknowledgment and silencing
- Escalation rules

### Example Plan

```markdown
## Implementation Plan: Alert Bot

### Overview
A bot that receives alerts from monitoring systems and routes them to appropriate channels.

### Core Features
1. **Alert Ingestion** - Receive webhooks from monitoring systems
2. **Smart Routing** - Route alerts to appropriate channels based on rules
3. **Acknowledgment** - Team members can ack alerts
4. **Escalation** - Escalate unacknowledged alerts

### Slash Commands
| Command | Description | Example |
|---------|-------------|---------|
| `/alert-ack` | Acknowledge an alert | `/alert-ack #12345` |
| `/alert-silence` | Silence alerts for a service | `/alert-silence api-server 1h` |
| `/alert-status` | View active alerts | `/alert-status` |
| `/on-call` | Show who's on call | `/on-call` |

### Event Handlers
- [x] `onReaction` - Ack alerts with emoji reactions
- [x] `onAction` - Handle ack/silence buttons

### Scheduled Jobs
| Schedule | Action |
|----------|--------|
| `*/5 * * * *` | Check for unacked alerts, escalate if needed |

### State Management
- [x] Database (persistent storage) - Alert state, ack status, routing rules

### UI Components (JSX)
- [x] `<Card>` with `<Button>` - Ack/silence buttons on alerts
- [x] `<Modal>` - Alert configuration

### Files to Create/Modify (Chat SDK)
- `lib/bot.tsx` - Bot instance, reaction/action handlers
- `app/api/webhooks/alerts/route.ts` - External alert ingestion
- `app/api/webhooks/[platform]/route.ts` - Slack webhook
- `lib/alerts/router.ts`
- `lib/alerts/escalation.ts`
- `app/api/cron/alert-escalation/route.ts`

### Files to Create/Modify (Bolt)
- `server/bolt/app.ts`, `server/listeners/actions/alert-ack.ts`
- `server/listeners/commands/alert.ts`
- `server/lib/alerts/router.ts`, `server/lib/alerts/escalation.ts`
- `server/api/slack/events.post.ts`
- `server/api/cron/alert-escalation.get.ts`
```

---

## Pattern Recognition Guide

Use these signals to determine which archetype(s) apply:

| User says... | Likely Archetype |
|-------------|------------------|
| "standup", "daily", "check-in", "status update" | Standup/Reminder |
| "support", "help desk", "tickets", "customer" | Support/Help Desk |
| "weather", "lookup", "API", "fetch", "data" | Information/Lookup |
| "chat", "assistant", "conversation", "AI" | Conversational AI |
| "deploy", "CI/CD", "automate", "workflow" | Automation |
| "alert", "monitor", "notify", "on-call" | Notification/Alerting |

### Hybrid Agents

Many real-world agents combine multiple archetypes. For example:
- **Support + Conversational** - AI-powered support with multi-turn dialogue
- **Automation + Alerting** - Deploy bot that also sends deployment notifications
- **Information + Conversational** - Weather bot with natural language queries

When users describe hybrid needs, combine relevant features from multiple archetypes.

---

## Implementation Complexity Guide

When generating plans, indicate complexity to set expectations:

| Complexity | Characteristics | Example |
|------------|-----------------|---------|
| **Simple** | 1-2 slash commands, no database, no scheduled jobs | Weather lookup |
| **Medium** | Multiple commands, basic state, JSX components | Ticket system |
| **Complex** | Multi-turn workflows, database, scheduled jobs, webhooks | Full standup bot |

Include a complexity indicator in your generated plans to help users understand scope.
