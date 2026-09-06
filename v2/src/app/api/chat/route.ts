export async function POST() {
  return Response.json({ error: "Ragstar conversations take place in Slack. The web app is for administration and review." }, { status: 410 });
}
