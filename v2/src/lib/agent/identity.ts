export interface AgentIdentity {
  authenticator: string;
  principalType: string;
  attributes: Readonly<Record<string, string | readonly string[]>>;
}

export function requireSlackTeam(auth: AgentIdentity | null): string {
  const teamId = auth?.attributes.team_id;
  if (auth?.authenticator !== "slack-webhook" || auth.principalType !== "user" ||
      typeof teamId !== "string" || !/^T[A-Z0-9]+$/.test(teamId)) {
    throw new Error("An authenticated Slack workspace is required.");
  }
  return teamId;
}

// Workspace selection is only a lookup hint until its signing secret verifies
// the raw body. Never use these fields as an authenticated identity.
export function parseSlackEnvelope(body: string, contentType: string) {
  const form = new URLSearchParams(body);
  const payload = contentType.includes("application/x-www-form-urlencoded")
    ? JSON.parse(form.get("payload") ?? JSON.stringify(Object.fromEntries(form)))
    : JSON.parse(body);
  if (!payload || typeof payload !== "object") throw new Error("Invalid Slack payload.");
  const teamId = payload.team_id ?? payload.team?.id;
  if (payload.event?.team_id && payload.event.team_id !== teamId) {
    throw new Error("Cross-workspace Slack events are not supported.");
  }
  return { teamId: typeof teamId === "string" ? teamId : undefined, type: payload.type };
}
