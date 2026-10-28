import assert from "node:assert/strict";
import test from "node:test";
import { safeBrowserOrigin } from "./origin-policy";

const allowed = new Set(["nitrocrop.example", "localhost"]);
test("accepts same-origin HTTPS for a configured hostname", () => {
  assert.equal(safeBrowserOrigin("https://nitrocrop.example", "nitrocrop.example", allowed, true, false), "https://nitrocrop.example");
});
test("rejects missing, null, cross-site and untrusted origins", () => {
  for (const origin of [undefined, "null", "https://attacker.example", "https://nitrocrop.example.attacker.example"]) {
    assert.equal(safeBrowserOrigin(origin, "nitrocrop.example", allowed, true, false), null);
  }
  assert.equal(safeBrowserOrigin("https://nitrocrop.example", "nitrocrop.example", allowed, true, true), null);
});
test("rejects forged matching Host and Origin outside the hostname allowlist", () => {
  assert.equal(safeBrowserOrigin("https://attacker.example", "attacker.example", allowed, true, false), null);
});
test("rejects insecure production redirects but permits local development", () => {
  assert.equal(safeBrowserOrigin("http://nitrocrop.example", "nitrocrop.example", allowed, true, false), null);
  assert.equal(safeBrowserOrigin("http://localhost", "localhost", allowed, false, false), "http://localhost");
});
