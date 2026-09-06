import { createAdminClient } from "../supabase/admin";
import { requireSlackTeam, type AgentIdentity } from "./identity";

export async function loadSlackWorkspace(teamId: string | undefined) {
  if (!teamId) throw new Error("Slack workspace is missing.");
  const { data, error } = await createAdminClient()
    .from("organisation_settings")
    .select("*")
    .eq("slack_team_id", teamId)
    .single();
  if (error || !data?.slack_bot_token || !data.slack_signing_secret) {
    throw new Error("Slack workspace is not connected to Ragstar.");
  }
  return data;
}

export function workspaceForCaller(auth: AgentIdentity | null) {
  // Resolve on every tool call so a disconnected installation loses access.
  return loadSlackWorkspace(requireSlackTeam(auth));
}
