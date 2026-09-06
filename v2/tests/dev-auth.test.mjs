import { test } from "node:test";
import assert from "node:assert/strict";
import { canUseDevAuth, isLoopbackUrl } from "../src/lib/auth/dev-policy.ts";
import { getSlackSetupState } from "../src/lib/admin/readiness.ts";

const env = { NODE_ENV: "development", DEV_AUTH_BYPASS: "true", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321" };
const request = (url = "http://localhost:3000/api/dev-auth", headers = {}) => new Request(url, { headers });
test("local auth requires explicit opt-in and a local database", () => {
  assert.equal(canUseDevAuth(env, request()), true);
  assert.equal(canUseDevAuth({ ...env, DEV_AUTH_BYPASS: undefined }, request()), false);
  assert.equal(canUseDevAuth({ ...env, NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co" }, request()), false);
});
test("production, test, and hosted runs cannot activate local auth", () => {
  for (const NODE_ENV of ["production", "test", undefined]) assert.equal(canUseDevAuth({ ...env, NODE_ENV }, request()), false);
  assert.equal(canUseDevAuth({ ...env, VERCEL: "1" }, request()), false);
});
test("remote URLs, forwarded hosts, and cross-origin requests fail closed", () => {
  assert.equal(canUseDevAuth(env, request("https://example.com/api/dev-auth")), false);
  for (const headers of [{ host: "example.com" }, { "x-forwarded-host": "example.com" },
    { origin: "https://example.com" }, { "sec-fetch-site": "cross-site" }, { origin: "http://localhost:3001" }]) {
    assert.equal(canUseDevAuth(env, request(undefined, headers)), false);
  }
  assert.equal(canUseDevAuth(env, request(undefined, { origin: "http://localhost:3000" })), true);
});
test("loopback parsing rejects hostname lookalikes and userinfo", () => {
  for (const url of ["http://localhost.evil.test", "http://localhost@evil.test", "http://user@localhost", "file:///localhost", "invalid"]) assert.equal(isLoopbackUrl(url), false);
  assert.equal(isLoopbackUrl("http://[::1]:54321"), true);
});
test("saved credentials never imply that messages have arrived", () => {
  assert.equal(getSlackSetupState(false, null, null), "not_configured");
  assert.equal(getSlackSetupState(true, null, "2026-09-05T10:00:00Z"), "credentials_saved");
  assert.equal(getSlackSetupState(true, "2026-09-05T09:00:00Z", "2026-09-05T10:00:00Z"), "credentials_saved");
  assert.equal(getSlackSetupState(true, "2026-09-05T11:00:00Z", "2026-09-05T10:00:00Z"), "activity_observed");
});
