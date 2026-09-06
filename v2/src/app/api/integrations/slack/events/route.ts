// Existing installations must update their Request URL in Settings → Integrations.
export async function POST() {
  return Response.json({
    error: "Slack has moved to eve. Update the Request URL using Ragstar Settings → Integrations.",
  }, { status: 410 });
}
