import { eveChannel } from "eve/channels/eve";

// Slack is the agent interface. The existing admin UI uses Supabase sessions.
// Do not expose a second, unauthenticated route to organisation data.
export default eveChannel({ auth: [] });
