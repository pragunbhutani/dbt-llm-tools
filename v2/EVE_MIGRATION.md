# Ragstar agent migration

Ragstar continues in `ragstar/v2`. The sibling `ragstar-ts` is an older scaffold.
The Next.js admin app retains Supabase authentication, project ingestion,
knowledge management, integration settings, and conversation history.

The Slack agent now lives in `agent/` and runs through eve. Its typed tools reuse
the existing semantic model search and model-detail lookup. Each tool resolves
the organisation from the verified Slack workspace, including on later turns.
Model/provider credentials continue to come from Settings → LLM Providers.
No AI Gateway key is necessary when using these direct provider credentials.

## Local setup

1. Use Node.js 24 (`.node-version`), then run `pnpm install` in `v2`.
2. Start Supabase and apply the existing migrations, including
   `014_slack_signing_secret.sql`. Configure `.env.local` as before.
3. Run `pnpm dev`. `withEve` runs the agent alongside Next.js.
4. Configure a model provider and import/embed a dbt project in the admin UI.
5. Expose the Next.js origin through your development tunnel for Slack webhooks.
6. On the Slack page, create a Slack app from the manifest, install it,
   and save its bot token and signing secret in Ragstar. Then set Slack's Events
   Request URL to the organisation-specific URL displayed in the dialog.
   Credentials must be saved before Slack can verify this URL.

Existing installations must replace `/api/integrations/slack/events` with the
displayed `/eve/v1/slack?organisation_id=...` URL and add the new event/scope
subscriptions from the manifest. The old endpoint returns 410 with a migration
message. Mentions and DMs start conversations; public-channel thread replies
continue an active eve session when `message.channels` is subscribed. Reinstall
the Slack app after changing scopes. Private-channel mentions require the bot to
be invited; unmentioned private-channel follow-ups are not enabled by this manifest.

The URL's organisation id selects a signing secret for the setup challenge only.
Events select their installation using the body workspace id and must pass HMAC
verification before being handled. Unknown or disconnected workspaces fail closed.
Events whose content workspace differs from their installation workspace (some
Slack Connect deliveries) are rejected until explicit shared-channel access is added.
The generic eve HTTP session channel rejects all callers; Slack is the configured
agent interface. Ordinary clarifying questions are answered as Slack thread replies.

## Scope

The eve agent answers dbt questions, retrieves columns/SQL/dependencies, and drafts
SQL. It does not execute warehouse SQL, change dbt repositories, or browse the web.
The web chat has been retired: its page redirects to conversation review and its
API returns 410. Slack is the only agent conversation channel. Each Slack question and final answer is recorded in the
existing Conversations UI, with the eve session id in answer metadata. Eve owns
the durable thread context. Existing historical chats are not imported into eve.

## Verification and deployment

Run `pnpm test`, `pnpm typecheck`, `pnpm build:agent`, and `pnpm build` using Node 24.
For local production, run `pnpm build:agent` before `pnpm build && pnpm start`.
On Vercel, `withEve` generates the agent service for the same project. Deploy from
`v2`, configure Supabase environment variables, and set the Slack Request URL to
the production origin after deployment. Keep development and production Slack
installations separate to avoid routing real questions into a development agent.

Before rollout, exercise a mention, a thread follow-up, a DM, a duplicate delivery,
an invalid signature, and disconnection of a workspace. Verify answers reference
the imported models and appear in Conversations. Test two workspaces to verify
tenant isolation. Slack delivery and live model calls require configured credentials.

Official references: [eve Next.js integration](https://github.com/vercel/eve/blob/main/docs/guides/frontend/nextjs.mdx),
[Slack channel](https://github.com/vercel/eve/blob/main/docs/channels/slack.mdx),
[tool authoring](https://github.com/vercel/eve/blob/main/docs/tools/overview.mdx).
