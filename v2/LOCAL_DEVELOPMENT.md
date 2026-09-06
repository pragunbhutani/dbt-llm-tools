# Local development

Use Node.js 24. In `ragstar/v2`:

```sh
pnpm install
# Start Docker first.
supabase start
pnpm dev:local
```

Open `http://localhost:3000/sign-in` and choose **Enter local workspace**. The
shortcut creates a dedicated local administrator and a Local workspace, then
sets a normal Supabase session cookie. No password, email, or manual organisation
creation is needed. Repeating sign-in reuses the same user and workspace.

`dev:local` reads credentials from `supabase status` and passes them to Next.js.
It overrides any hosted Supabase values in `.env.local` for this process only;
it does not rewrite that file. Use `PORT=3017 pnpm dev:local` for another port.

For manual configuration, set `DEV_AUTH_BYPASS=true` alongside loopback Supabase
credentials and run `pnpm dev`. Automation can POST to `/api/dev-auth` on the
local origin and retain its response cookies. The endpoint returns no tokens or
passwords. GET returns whether the shortcut is enabled for the current request.

The shortcut is disabled unless all of these hold: explicit opt-in, development
mode, loopback app URL, loopback Supabase URL, and no Vercel deployment marker.
Cross-origin browser requests and forwarded remote hosts are rejected. Production
builds retain normal authentication even if the flag is set. Row-level security
continues to use the local user's real session. This shortcut needs local
Supabase; it does not provide an offline mock database.

## Slack development

Slack is the only agent conversation interface. `/dashboard/chat` redirects to
conversation review; `/api/chat` returns 410. Conversations are inspected through
the admin UI and take place in Slack. MCP remains a knowledge API, not an agent
chat channel.

Configure provider credentials and a dbt project in the local workspace, then
configure Slack from the top-level Slack page. For webhook delivery, expose the
app through an HTTPS tunnel. In Slack, replace the localhost origin in the
displayed events endpoint with the public tunnel origin, preserving its path
and query string. Keep `NEXT_PUBLIC_APP_URL` on localhost for the auth shortcut
and sign in there; the tunnel cannot invoke the shortcut. Use a development Slack installation, since its event URL determines
where real Slack questions are delivered.

Saved Slack credentials are shown separately from recorded Slack activity.
Activity is compared against the most recent organisation-settings update;
after settings change, ask a new question in Slack to confirm delivery again.
This status describes observed activity, not continuous health monitoring.

## Checks

```sh
pnpm test
pnpm typecheck
pnpm build:agent
pnpm build
```
