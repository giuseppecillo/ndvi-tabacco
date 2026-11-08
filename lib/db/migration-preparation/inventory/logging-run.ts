// Manual authorized read-only entrypoint. Never imported by the application.
import {spawnSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {
  assertCleanEnvironment, cleanInventoryEnvironment, inventoryConfig,
  InventoryBlocked, redactReport, safeFailure,
} from "./guard";
import {readLoggingMetadata, withCatalogConnection} from "./catalog";
import {verifyTargetTls, HOST, PROJECT} from "../operational/target";

async function worker() {
  assertCleanEnvironment(process.env);
  const target={projectRef:PROJECT,host:HOST};
  if(process.env.SUPABASE_QA_PROJECT_REF!==PROJECT ||
     process.env.SUPABASE_QA_EXPECTED_HOST!==HOST) throw new InventoryBlocked("TARGET_MISMATCH");
  const secret=process.env.SUPABASE_QA_ADMIN_URL??"";
  const config=inventoryConfig(secret,target,process.env.SUPABASE_QA_CA_PEM);
  if(!process.env.SUPABASE_QA_CA_PEM) throw new InventoryBlocked("PUBLIC_CA_REQUIRED");
  const {Client}=await import("pg");
  const client=new Client(config);
  let tls:ReturnType<typeof verifyTargetTls>|undefined;
  const metadata=await withCatalogConnection(client,()=>{
    tls=verifyTargetTls(client);
  },()=>readLoggingMetadata(client));
  console.log(redactReport({
    status:"logging_metadata_complete",capturedAt:new Date().toISOString(),
    target,tls,metadata,rollbackCompleted:true,connectionClosed:true,
  },secret));
}
function parent() {
  if(process.argv.length!==3 || process.argv[2]!=="--authorized-logging-metadata-readonly") {
    throw new InventoryBlocked("LOGGING_METADATA_APPROVAL_REQUIRED");
  }
  const secret=process.env.SUPABASE_QA_ADMIN_URL??"";
  const ca=readFileSync(new URL("./fixtures/supabase-root-2021.pem",import.meta.url),"utf8");
  const env=cleanInventoryEnvironment(secret,{projectRef:PROJECT,host:HOST},ca);
  const child=spawnSync(process.execPath,[process.argv[1],"--worker-logging"],{
    env,encoding:"utf8",timeout:45000,maxBuffer:65536,stdio:["ignore","pipe","pipe"],
  });
  if(child.error || child.signal) throw new InventoryBlocked("ISOLATED_PROCESS_FAILED");
  let report:{status?:string;reason?:string};
  try {report=JSON.parse(child.stdout);} catch {throw new InventoryBlocked("LOGGING_OUTPUT_INVALID");}
  if(child.status!==0 || report.status!=="logging_metadata_complete") {
    // Child uses safeFailure; never forward arbitrary output or driver details.
    console.log(redactReport(report,secret));
    process.exitCode=1;
    return;
  }
  console.log(redactReport(report,secret));
}
Promise.resolve().then(()=>process.argv[2]==="--worker-logging"?worker():parent())
  .catch(error=>{console.log(JSON.stringify(safeFailure(error)));process.exitCode=1;});
