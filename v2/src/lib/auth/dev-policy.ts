type DevEnvironment = {
  NODE_ENV?: string;
  DEV_AUTH_BYPASS?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  VERCEL?: string;
};

export function isLoopbackUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
      !url.username && !url.password;
  } catch { return false; }
}

export function canUseDevAuth(env: DevEnvironment, request: Request): boolean {
  if (env.NODE_ENV !== "development" || env.DEV_AUTH_BYPASS !== "true" || env.VERCEL ||
      !isLoopbackUrl(env.NEXT_PUBLIC_SUPABASE_URL ?? "") || !isLoopbackUrl(request.url)) return false;
  for (const header of ["host", "x-forwarded-host"]) {
    const host = request.headers.get(header);
    if (host && !isLoopbackUrl(`http://${host}`)) return false;
  }
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return false;
  return request.headers.get("sec-fetch-site") !== "cross-site";
}
