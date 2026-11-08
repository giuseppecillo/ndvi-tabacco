/** Explicitly authorized, catalogue-independent plan schema activation only. */
import {createHash} from "node:crypto";
import {readFileSync,writeFileSync} from "node:fs";
import {checkServerIdentity,type TLSSocket} from "node:tls";
import {Client} from "pg";
import {inventoryConfig} from "../../../../lib/db/migration-preparation/inventory/guard";
import {SUPABASE_RUNTIME_CA} from "../../../../lib/db/src/supabase-runtime-ca";

async function main(){
  let client:Client|undefined;let transaction=false;let committed=false;
  let stage="approval";let rollbackConfirmed=false;
  try{
    if(process.argv.length!==3||process.argv[2]!=="--apply-approved-user-plans")
      throw new Error("EXPLICIT_PLAN_SCHEMA_APPROVAL_REQUIRED");
    if(process.env.NODE_TLS_REJECT_UNAUTHORIZED==="0")throw new Error("TLS_DISABLED");
    const secret=process.env.SUPABASE_QA_ADMIN_URL;
    if(!secret)throw new Error("DEDICATED_ADMIN_SECRET_MISSING");
    const host="aws-0-eu-west-1.pooler.supabase.com";
    const config=inventoryConfig(secret,{projectRef:"bhnaarbzpmcniesxyldx",host},SUPABASE_RUNTIME_CA);
    config.application_name="nitrocrop_approved_plan_schema";
    client=new Client(config);client.on("error",()=>{});
    stage="connect";await client.connect();
    const socket=(client as unknown as{connection:{stream:TLSSocket}}).connection.stream;
    if(!socket.encrypted||!socket.authorized||socket.authorizationError||
      checkServerIdentity(host,socket.getPeerCertificate())||
      !["TLSv1.2","TLSv1.3"].includes(socket.getProtocol()??""))throw new Error("VERIFIED_TLS_REQUIRED");
    await client.query("BEGIN READ WRITE");transaction=true;
    await client.query("SET LOCAL lock_timeout='5s'");
    await client.query("SET LOCAL statement_timeout='30s'");
    stage="identity";
    const identity=await client.query("SELECT current_database() AS db,current_user::text AS role,pg_is_in_recovery() AS replica");
    if(identity.rows[0]?.db!=="postgres"||identity.rows[0]?.role!=="postgres"||identity.rows[0]?.replica!==false)
      throw new Error("SUPABASE_PRIMARY_ADMIN_IDENTITY_REQUIRED");
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended('nitrocrop:plans-schema',0))");
    const before=await client.query("SELECT to_regclass('public.app_plan_state') IS NOT NULL AS exists");
    if(before.rows[0]?.exists)throw new Error("PLAN_TABLE_ALREADY_EXISTS_REVIEW_REQUIRED");
    const roles=await client.query("SELECT rolname,rolcanlogin FROM pg_roles WHERE rolname IN ('app_runtime','app_readonly','app_migrator') ORDER BY rolname");
    if(roles.rows.length!==3||roles.rows.some(r=>r.rolname!=="app_runtime"&&r.rolcanlogin))
      throw new Error("EXPECTED_NOLOGIN_ROLES_REQUIRED");
    stage="approved_schema";
    // Existing authorized migrator membership only; no GRANT or LOGIN change.
    // New table and its FK are created by the owner of the app schema.
    await client.query("SET LOCAL ROLE app_migrator");
    const source=readFileSync("lib/db/migration-preparation/USER_PLANS_MANUAL.sql","utf8");
    if((source.match(/^BEGIN;$/gm)??[]).length!==1||(source.match(/^COMMIT;$/gm)??[]).length!==1)
      throw new Error("SCHEMA_TRANSACTION_LAYOUT_CHANGED");
    await client.query(source.replace(/^BEGIN;$/m,"").replace(/^COMMIT;$/m,""));
    stage="additional_privilege_checks";
    const extras=await client.query(`SELECT
      has_table_privilege('app_runtime','public.app_plan_state','TRUNCATE,REFERENCES,TRIGGER') AS runtime_extra,
      has_table_privilege('app_readonly','public.app_plan_state','INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS readonly_write,
      has_table_privilege('app_readonly','public.app_plan_state','SELECT') AS readonly_select`);
    if(extras.rows[0].runtime_extra||extras.rows[0].readonly_write||!extras.rows[0].readonly_select)
      throw new Error("UNEXPECTED_PLAN_PRIVILEGES");
    const afterRoles=await client.query("SELECT rolname,rolcanlogin FROM pg_roles WHERE rolname IN ('app_runtime','app_readonly','app_migrator') ORDER BY rolname");
    if(JSON.stringify(afterRoles.rows)!==JSON.stringify(roles.rows))throw new Error("ROLE_STATE_CHANGED");
    stage="commit";await client.query("COMMIT");transaction=false;committed=true;
    const report={status:"created-and-protected",table:"public.app_plan_state",createdEmpty:true,
      owner:"app_migrator",rls:true,forceRls:true,policies:3,
      runtime:"SELECT INSERT UPDATE DELETE only",readonly:"SELECT only; NOLOGIN",
      migrator:"NOLOGIN unchanged",dataApiAccess:false,
      tls:{ca:true,hostname:true,protocol:socket.getProtocol()},
      sqlSha256:createHash("sha256").update(source).digest("hex"),transactionCommitted:true,
      usersAssigned:0,existingClientData:"not-read-or-modified",applicationConnection:"unchanged",published:false};
    writeFileSync("generated-artifacts/user-plans-activation-result.json",JSON.stringify(report,null,2)+"\n");
    console.log(JSON.stringify(report));
  }catch(error){
    if(client&&transaction)try{await client.query("ROLLBACK");rollbackConfirmed=true;}catch{}
    const message=(error as Error)?.message;const code=(error as{code?:string})?.code;
    console.error(JSON.stringify({status:"blocked",stage,
      reason:/^[A-Z_]{5,80}$/.test(message??"")?message:"PLAN_SCHEMA_OPERATION_FAILED",
      sqlstate:/^[A-Z0-9]{5}$/.test(code??"")?code:null,rollbackConfirmed,committed,automaticRetry:false}));
    process.exitCode=1;
  }finally{if(client)try{await client.end();}catch{console.error("PLAN_SCHEMA_CONNECTION_CLOSE_FAILED");process.exitCode=1;}}
}
void main();
