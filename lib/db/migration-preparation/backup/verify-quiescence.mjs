// Manual point-6 diagnostic only. No backup, writer termination or source changes.
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";
import { connectionConfig,verifyPrimaryIdentity,verifyClientTls } from "./source-guard.mjs";
import { observeQuiescence } from "./quiescence.mjs";

let client;
try {
  if(process.argv.length!==4 ||
      process.argv[2]!=="--authorized-phase6-readonly-check" ||
      process.argv[3]!=="--writers-stopped-confirmed") throw Error("PHASE6_AUTHORIZATION_AND_EXTERNAL_STOP_REQUIRED");
  const raw=process.env.REPLIT_PROD_BACKUP_URL;
  const config=connectionConfig(raw,new URL(raw).hostname);
  const require=createRequire(new URL("../../package.json",import.meta.url));
  const {Client}=require("pg");
  client=new Client(config);
  client.on("error",()=>{});
  await client.connect();
  const identity=await verifyPrimaryIdentity(client);
  const samples=[];
  for(let index=0;index<2;index++) {
    verifyClientTls(client);
    // Each observation starts and ends its own transaction; no cached activity snapshot.
    const sample=await observeQuiescence(client);
    samples.push(sample);
    if(!sample.clear) break;
    if(index===0) await delay(5000);
  }
  const clear=samples.length===2 && samples.every(sample=>sample.clear);
  console.log(JSON.stringify({status:clear
    ?"TWO_CLEAR_READONLY_SAMPLES_EXTERNAL_WRITER_STOP_ATTESTED"
    :"QUIESCENCE_BLOCKED_NO_EXPORT_STARTED",
    clientTlsProtocol:identity.transport.protocol,
    externalWriterStopAttested:true,externalFenceProvenBySql:false,
    samples,backupStarted:false,sourceModified:false}));
  if(!clear) process.exitCode=2;
} catch {
  console.error("PHASE6_METADATA_CHECK_BLOCKED; no credential, query text or application data printed.");
  process.exitCode=1;
} finally {
  if(client) {
    try { await client.end(); } catch { process.exitCode=1; }
  }
}
