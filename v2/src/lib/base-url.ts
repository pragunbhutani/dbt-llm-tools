/**
 * Returns the canonical base URL of this deployment, used for building
 * callback URLs, webhook endpoints, etc.
 *
 * Priority:
 *  1. NEXT_PUBLIC_APP_URL  — set this on custom domains / self-hosted installs
 *  2. VERCEL_URL           — injected automatically by Vercel per deployment
 *  3. host request header  — fallback for local dev (pass from a Server Component)
 */
export function getBaseUrl(requestHost?: string): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  if (requestHost) {
    const protocol = requestHost.startsWith("localhost") ? "http" : "https";
    return `${protocol}://${requestHost}`;
  }

  return "http://localhost:3000";
}
