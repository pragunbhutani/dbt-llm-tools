export type SlackSetupState = "not_configured" | "credentials_saved" | "activity_observed";
export function getSlackSetupState(configured: boolean, lastActivity: string | null, updatedAt: string | null): SlackSetupState {
  if (!configured) return "not_configured";
  // Credentials saved alone do not prove that Slack delivers messages.
  if (lastActivity && updatedAt && Date.parse(lastActivity) >= Date.parse(updatedAt)) return "activity_observed";
  return "credentials_saved";
}
export const slackSetupLabels: Record<SlackSetupState, string> = {
  not_configured: "Not configured", credentials_saved: "Awaiting a Slack message", activity_observed: "Slack activity received",
};
