import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifySlackSignature } from "../src/lib/slack/verify.ts";
import { parseSlackEnvelope, requireSlackTeam } from "../src/lib/agent/identity.ts";

const secret = "test-signing-secret";
const body = JSON.stringify({ type: "event_callback", team_id: "T123", event: { text: "revenue" } });
function signedRequest(text = body, timestamp = String(Math.floor(Date.now() / 1000))) {
  const signature = "v0=" + createHmac("sha256", secret).update(`v0:${timestamp}:${text}`).digest("hex");
  return new Request("https://ragstar.example/eve/v1/slack", {
    headers: { "x-slack-request-timestamp": timestamp, "x-slack-signature": signature },
  });
}

test("valid signatures authenticate the exact raw body and secret", async () => {
  const request = signedRequest();
  assert.equal(await verifySlackSignature(request, body, secret), true);
  assert.equal(await verifySlackSignature(request, body + " ", secret), false);
  assert.equal(await verifySlackSignature(request, body, "another-workspace-secret"), false);
});

test("malformed signatures and timestamps reject without throwing", async () => {
  for (const signature of ["", "v0=short", "v0=" + "z".repeat(64), "v0=" + "a".repeat(66)]) {
    const request = signedRequest();
    request.headers.set("x-slack-signature", signature);
    assert.equal(await verifySlackSignature(request, body, secret), false);
  }
  for (const timestamp of ["NaN", "", "1e10", "123junk"]) {
    assert.equal(await verifySlackSignature(signedRequest(body, timestamp), body, secret), false);
  }
});

test("expired and future-dated signed requests reject", async () => {
  for (const offset of [-600, 600]) {
    const timestamp = String(Math.floor(Date.now() / 1000) + offset);
    assert.equal(await verifySlackSignature(signedRequest(body, timestamp), body, secret), false);
  }
});

test("only a verified Slack human identity can select a tool workspace", () => {
  const auth = { authenticator: "slack-webhook", principalType: "user", attributes: { team_id: "T123" } };
  assert.equal(requireSlackTeam(auth), "T123");
  for (const invalid of [null, { ...auth, authenticator: "anonymous" },
    { ...auth, principalType: "service" }, { ...auth, attributes: { team_id: ["T123"] } },
    { ...auth, attributes: { organisation_id: "chosen-by-model" } }]) {
    assert.throws(() => requireSlackTeam(invalid), /authenticated Slack/);
  }
});

test("workspace hints parse from JSON events and form interactions", () => {
  assert.equal(parseSlackEnvelope(body, "application/json").teamId, "T123");
  const form = new URLSearchParams({ payload: JSON.stringify({ type: "block_actions", team: { id: "T456" } }) });
  assert.equal(parseSlackEnvelope(form.toString(), "application/x-www-form-urlencoded").teamId, "T456");
  assert.throws(() => parseSlackEnvelope("not json", "application/json"));
  assert.throws(() => parseSlackEnvelope("null", "application/json"));
  assert.throws(() => parseSlackEnvelope(JSON.stringify({
    team_id: "T123", event: { team_id: "T456" },
  }), "application/json"), /Cross-workspace/);
});
