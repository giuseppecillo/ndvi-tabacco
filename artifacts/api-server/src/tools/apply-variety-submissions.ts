/** Manual owner-authorized migration. Never imported by application startup. */
import {readFileSync,writeFileSync} from "node:fs";
import {Client} from "pg";
import {checkServerIdentity,type TLSSocket} from "node:tls";
import {inventoryConfig} from "../../../../lib/db/migration-preparation/inventory/guard";
import {SUPABASE_RUNTIME_CA} from "../../../../lib/db/src/supabase-runtime-ca";

async function main(){
  let client:Client|undefined,transaction=false,committed=false;
  let stage="authorization";
  try{
    if(process.argv[2]!=="--apply-approved-variety-table"||process.argv.length!==3)throw Error("EXPLICIT_APPROVAL_REQUIRED");
    const host="aws-0-eu-west-1.pooler.supabase.com";
    const secret=process.env.SUPABASE_QA_ADMIN_URL;
    if(!secret||process.env.NODE_TLS_REJECT_UNAUTHORIZED==="0")throw Error("SECURE_CONNECTION_REQUIRED");
    client=new Client(inventoryConfig(secret,{projectRef:"bhnaarbzpmcniesxyldx",host},SUPABASE_RUNTIME_CA));
    client.on("error",()=>{});
    await client.connect();
    const socket=(client as unknown as {connection:{stream:TLSSocket}}).connection.stream;
    if(!socket.encrypted||!socket.authorized||checkServerIdentity(host,socket.getPeerCertificate()))throw Error("TLS_REQUIRED");
    await client.query("BEGIN");
    transaction=true;
    await client.query("SET LOCAL lock_timeout='5s'");
    await client.query("SET LOCAL statement_timeout='30s'");
    stage="preconditions";
    const identity=(await client.query("SELECT current_database() AS db,current_user::text AS role,pg_is_in_recovery() AS replica")).rows[0];
    if(identity.db!=="postgres"||identity.role!=="postgres"||identity.replica!==false)throw Error("UNEXPECTED_DATABASE_IDENTITY");
    const existing=(await client.query("SELECT to_regclass('agronomy_catalogue.variety_submissions') AS object,to_regnamespace('agronomy_catalogue') AS schema")).rows[0];
    if(!existing.schema||existing.object)throw Error("UNEXPECTED_EXISTING_OBJECTS");
    const roles=(await client.query("SELECT rolname FROM pg_roles WHERE rolname IN ('app_runtime','app_readonly','app_migrator','anon','authenticated','service_role')")).rows;
    if(roles.length!==6)throw Error("EXPECTED_ROLES_REQUIRED");
    stage="create_authorized_table";
    await client.query(readFileSync("lib/db/migration-preparation/catalogue/variety-submissions.sql","utf8"));
    await client.query("REVOKE ALL ON agronomy_catalogue.variety_submissions FROM anon,authenticated,service_role,app_readonly,app_runtime");
    await client.query("GRANT SELECT,INSERT,UPDATE ON agronomy_catalogue.variety_submissions TO app_runtime");
    await client.query("GRANT ALL ON agronomy_catalogue.variety_submissions TO app_migrator");
    stage="verify_before_commit";
    const denied=(await client.query(`SELECT r,has_table_privilege(r,'agronomy_catalogue.variety_submissions','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS granted
      FROM unnest(ARRAY['anon','authenticated','service_role','app_readonly']) r`)).rows;
    if(denied.some(r=>r.granted))throw Error("UNEXPECTED_DATA_API_PRIVILEGES");
    const runtime=(await client.query(`SELECT has_table_privilege('app_runtime','agronomy_catalogue.variety_submissions','SELECT') AS read,
      has_table_privilege('app_runtime','agronomy_catalogue.variety_submissions','INSERT') AS insert,
      has_table_privilege('app_runtime','agronomy_catalogue.variety_submissions','UPDATE') AS update,
      has_table_privilege('app_runtime','agronomy_catalogue.variety_submissions','DELETE,TRUNCATE') AS erase,
      relrowsecurity AS rls,relforcerowsecurity AS forced FROM pg_class WHERE oid='agronomy_catalogue.variety_submissions'::regclass`)).rows[0];
    if(!runtime.read||!runtime.insert||!runtime.update||runtime.erase||!runtime.rls||!runtime.forced)throw Error("PRIVILEGE_CHECK_FAILED");
    const count=(await client.query("SELECT count(*)::int AS n FROM agronomy_catalogue.variety_submissions")).rows[0].n;
    if(count!==0)throw Error("TABLE_NOT_EMPTY");
    await client.query("COMMIT");transaction=false;committed=true;
    const report={status:"applied",table:"agronomy_catalogue.variety_submissions",tlsVerified:true,
      rls:true,forcedRls:true,runtime:"SELECT INSERT UPDATE",dataApiPrivileges:false,
      createdRecords:0,existingDataUntouched:true,connectionConfigurationUnchanged:true};
    writeFileSync("generated-artifacts/variety-submissions-migration.json",JSON.stringify(report,null,2)+"\n");
    console.log(JSON.stringify(report));
  }catch(error){
    if(client&&transaction)await client.query("ROLLBACK").catch(()=>{});
    const e=error as {code?:string;message?:string};
    console.error(JSON.stringify({status:"blocked",stage,committed,sqlstate:/^[A-Z0-9]{5}$/.test(e.code??"")?e.code:null,
      reason:/^[A-Z_]+$/.test(e.message??"")?e.message:"OPERATION_FAILED"}));
    process.exitCode=1;
  }finally{if(client)await client.end();}
}
void main();
