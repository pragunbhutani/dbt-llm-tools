import crypto from "crypto";

/**
 * Verifies a Slack request signature.
 * Returns true if the signature is valid, false otherwise.
 */
export async function verifySlackSignature(
  request: Request,
  body: string,
  signingSecret: string
): Promise<boolean> {
  const timestamp = request.headers.get("x-slack-request-timestamp");
  const signature = request.headers.get("x-slack-signature");

  if (!timestamp || !/^\d+$/.test(timestamp) || !signature || !/^v0=[a-f0-9]{64}$/.test(signature)) return false;

  // Reject requests older than 5 minutes to prevent replay attacks
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 300) return false;

  const sigBasestring = `v0:${timestamp}:${body}`;
  const hmac = crypto
    .createHmac("sha256", signingSecret)
    .update(sigBasestring)
    .digest("hex");
  const mySignature = `v0=${hmac}`;

  return crypto.timingSafeEqual(
    Buffer.from(mySignature, "utf8"),
    Buffer.from(signature, "utf8")
  );
}
