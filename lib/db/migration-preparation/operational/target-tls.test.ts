import test from "node:test";
import assert from "node:assert/strict";
import type { Client } from "pg";
import { assertTarget, HOST } from "./target";

function fixture(row = { database: "postgres", role: "postgres", tls: false }) {
  const queries: string[] = [];
  const socket = {
    encrypted: true,
    authorized: true,
    authorizationError: null as string | null,
    getPeerCertificate: () => ({
      raw: Buffer.from("synthetic-certificate"), subjectaltname: `DNS:${HOST}`,
    }),
    getProtocol: () => "TLSv1.3",
  };
  const client = {
    connection: { stream: socket },
    query: async (sql: string) => { queries.push(sql); return { rows: [row] }; },
  } as unknown as Client;
  return { client, socket, queries };
}

for (const backendSsl of [false, true]) {
  test(`verified client TLS required independently of backend ssl=${backendSsl}`, async () => {
    const { client, queries } = fixture({ database: "postgres", role: "postgres", tls: backendSsl });
    const result = await assertTarget(client);
    assert.equal(result.transport.hostnameVerified, true);
    assert.equal(result.transport.certificateAuthorized, true);
    assert.equal(result.backendReportsTls, backendSsl);
    assert.equal(queries.length, 1);
  });
}
for (const [name, patch] of [
  ["unencrypted", { encrypted: false }],
  ["untrusted certificate", { authorized: false }],
  ["authorization error", { authorizationError: "synthetic-error" }],
  ["obsolete protocol", { getProtocol: () => "TLSv1.0" }],
  ["wrong hostname", { getPeerCertificate: () => ({
    raw: Buffer.from("synthetic"), subjectaltname: "DNS:wrong.example.invalid",
  }) }],
  ["no certificate", { getPeerCertificate: () => ({}) }],
] as const) {
  test(`reject ${name} before SQL even with backend ssl=true`, async () => {
    const { client, socket, queries } = fixture({ database: "postgres", role: "postgres", tls: true });
    Object.assign(socket, patch);
    await assert.rejects(assertTarget(client), /CLIENT_TLS_NOT_VERIFIED/);
    assert.equal(queries.length, 0);
  });
}
for (const [name, row] of [
  ["database", { database: "other", role: "postgres", tls: false }],
  ["role", { database: "postgres", role: "other", tls: false }],
] as const) {
  test(`still reject wrong ${name} with verified TLS`, async () => {
    const { client } = fixture(row);
    await assert.rejects(assertTarget(client), /TARGET_IDENTITY_NOT_CONFIRMED/);
  });
}
