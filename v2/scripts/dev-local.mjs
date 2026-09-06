import { spawn, spawnSync } from "node:child_process";

if (Number(process.versions.node.split(".")[0]) !== 24) {
  console.error("Ragstar requires Node.js 24. Switch Node versions before running dev:local.");
  process.exit(1);
}
const result = spawnSync("supabase", ["status", "--output", "json"], { encoding: "utf8", timeout: 10000 });
if (result.status !== 0) {
  console.error("Start Docker and run `supabase start` in v2, then retry `pnpm dev:local`.");
  process.exit(1);
}
let local;
try { local = JSON.parse(result.stdout); } catch {
  console.error("Could not read local Supabase status. Check `supabase status`.");
  process.exit(1);
}
if (!local.API_URL || !local.ANON_KEY || !local.SERVICE_ROLE_KEY ||
    !["localhost", "127.0.0.1", "[::1]"].includes(new URL(local.API_URL).hostname)) {
  console.error("Local Supabase must provide a loopback API URL and local API keys.");
  process.exit(1);
}
const port = process.env.PORT ?? "3000";
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", port], {
  stdio: "inherit",
  env: { ...process.env, DEV_AUTH_BYPASS: "true",
    NEXT_PUBLIC_SUPABASE_URL: local.API_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: local.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: local.SERVICE_ROLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? `http://localhost:${port}`,
  },
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", code => process.exit(code ?? 0));
