/**
 * Manual, owner-authorized catalogue-only deployment. Never imported by app.
 * Reads only the dedicated Supabase admin Secret internally; never logs it.
 */
import {readFileSync,writeFileSync} from "node:fs";
import {resolve} from "node:path";
import {checkServerIdentity,type TLSSocket} from "node:tls";
import {Client} from "pg";
import {inventoryConfig} from "../../../../lib/db/migration-preparation/inventory/guard";
import {SUPABASE_RUNTIME_CA} from "../../../../lib/db/src/supabase-runtime-ca";
import {catalogueRecords,catalogueVersion,catalogueCounts,assertCatalogueRows} from "../lib/catalogue-manifest";

const HOST="aws-0-eu-west-1.pooler.supabase.com";
const PROJECT="bhnaarbzpmcniesxyldx";
async function main() {
  let client:Client|undefined; let transaction=false;let stage="approval";
  let rollbackConfirmed=false;let commitConfirmed=false;
  try {
    const verifyOnly=process.argv.length===3&&process.argv[2]==="--verify-catalogue-only";
    if(!verifyOnly&&(process.argv.length!==3||process.argv[2]!=="--apply-approved-excel-catalogue"))
      throw new Error("EXPLICIT_CATALOGUE_APPROVAL_REQUIRED");
    if(process.env.NODE_TLS_REJECT_UNAUTHORIZED==="0")throw new Error("TLS_DISABLED");
    const secret=process.env.SUPABASE_QA_ADMIN_URL;
    if(!secret)throw new Error("DEDICATED_ADMIN_SECRET_MISSING");
    const config=inventoryConfig(secret,{projectRef:PROJECT,host:HOST},SUPABASE_RUNTIME_CA);
    config.application_name=verifyOnly?"nitrocrop_catalogue_readonly_check":"nitrocrop_approved_catalogue_import";
    client=new Client(config);client.on("error",()=>{});
    stage="connection";await client.connect();
    const socket=(client as unknown as {connection:{stream:TLSSocket}}).connection.stream;
    if(!socket.encrypted||!socket.authorized||socket.authorizationError||
      checkServerIdentity(HOST,socket.getPeerCertificate())||
      !["TLSv1.2","TLSv1.3"].includes(socket.getProtocol()??""))
      throw new Error("VERIFIED_TLS_REQUIRED");
    await client.query(`BEGIN ISOLATION LEVEL REPEATABLE READ ${verifyOnly?"READ ONLY":"READ WRITE"}`);transaction=true;
    await client.query("SET LOCAL lock_timeout='5s'");
    await client.query("SET LOCAL statement_timeout='30s'");
    const assertReadOnly=async()=>{
      const state=await client!.query("SELECT current_setting('transaction_read_only') AS ro");
      if(state.rows[0]?.ro!=="on")throw new Error("READ_ONLY_TRANSACTION_REQUIRED");
    };
    if(verifyOnly)await assertReadOnly();
    stage="identity";
    const identity=await client.query("SELECT current_database() AS db,current_user::text AS role,pg_is_in_recovery() AS replica");
    if(identity.rows[0]?.db!=="postgres"||identity.rows[0]?.role!=="postgres"||identity.rows[0]?.replica!==false)
      throw new Error("SUPABASE_PRIMARY_ADMIN_IDENTITY_REQUIRED");
    if(verifyOnly){
      stage="readonly_full_catalogue_comparison";
      await assertReadOnly();
      const stored=await client.query("SELECT crop,variety,model,parameters,record_hash FROM agronomy_catalogue.model_profiles WHERE version=$1",[catalogueVersion]);
      assertCatalogueRows(stored.rows);
      await client.query("ROLLBACK");transaction=false;rollbackConfirmed=true;
      const report={status:"verified-without-changes",version:catalogueVersion,profiles:catalogueRecords.length,
        tls:{ca:true,hostname:true,protocol:socket.getProtocol()},readOnly:true,rollbackConfirmed:true,
        supabaseWrites:false,existingClientData:"not-read-or-modified",applicationConnection:"unchanged",published:false};
      writeFileSync(resolve("generated-artifacts/catalogue-readonly-result.json"),JSON.stringify(report,null,2)+"\n");
      console.log(JSON.stringify(report));
      return;
    }
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended('nitrocrop:agronomy-catalogue',0))");
    stage="existing_objects";
    const namespace=await client.query(`SELECT pg_get_userbyid(nspowner) AS owner FROM pg_namespace WHERE nspname='agronomy_catalogue'`);
    if(namespace.rows.length&&!["postgres","app_migrator"].includes(namespace.rows[0].owner))
      throw new Error("UNEXPECTED_CATALOGUE_SCHEMA_OWNER");
    const existing=await client.query("SELECT to_regclass('agronomy_catalogue.model_profiles') IS NOT NULL AS exists");
    if(!existing.rows[0].exists) {
      stage="create_catalogue_only";
      await client.query(readFileSync(resolve("lib/db/migration-preparation/catalogue/models-schema.sql"),"utf8"));
    }
    stage="structural_guards";
    const shape=await client.query(`SELECT attname||':'||format_type(atttypid,atttypmod)||':'||attnotnull::text AS col
      FROM pg_attribute WHERE attrelid='agronomy_catalogue.model_profiles'::regclass AND attnum>0 AND NOT attisdropped ORDER BY attnum`);
    if(JSON.stringify(shape.rows.map(r=>r.col))!==JSON.stringify([
      "version:text:true","crop:text:true","variety:text:true","model:text:true","parameters:jsonb:true","record_hash:text:true"]))
      throw new Error("UNEXPECTED_CATALOGUE_COLUMNS");
    const safety=await client.query(`SELECT c.relrowsecurity AS rls,c.relforcerowsecurity AS force,
      pg_get_userbyid(c.relowner) AS owner,
      EXISTS(SELECT FROM pg_trigger WHERE tgrelid=c.oid AND NOT tgisinternal) AS triggers,
      EXISTS(SELECT FROM pg_constraint WHERE conrelid=c.oid AND contype='f') AS foreign_keys,
      EXISTS(SELECT FROM pg_rewrite WHERE ev_class=c.oid) AS rules
      FROM pg_class c WHERE oid='agronomy_catalogue.model_profiles'::regclass`);
    const guard=safety.rows[0];
    if(!guard?.rls||!guard.force||guard.owner!=="postgres"||guard.triggers||guard.foreign_keys||guard.rules)
      throw new Error("UNEXPECTED_CATALOGUE_STRUCTURE");
    const policies=await client.query(`SELECT policyname,roles::text[] AS roles,cmd,qual,with_check FROM pg_policies
      WHERE schemaname='agronomy_catalogue' AND tablename='model_profiles' ORDER BY policyname`);
    const expected=[
      ["catalogue_admin",["postgres"],"ALL","true","true"],
      ["catalogue_migrator",["app_migrator"],"ALL","true","true"],
      ["catalogue_readonly",["app_readonly"],"SELECT","true",null],
      ["catalogue_runtime",["app_runtime"],"SELECT","true",null],
    ];
    if(JSON.stringify(policies.rows.map(p=>[p.policyname,p.roles,p.cmd,p.qual,p.with_check]))!==JSON.stringify(expected))
      throw new Error("UNEXPECTED_CATALOGUE_POLICIES");
    const permissions=await client.query(`SELECT
      has_table_privilege('app_runtime','agronomy_catalogue.model_profiles','SELECT') AS runtime_read,
      has_table_privilege('app_runtime','agronomy_catalogue.model_profiles','INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS runtime_write,
      EXISTS(SELECT FROM unnest(ARRAY['anon','authenticated','service_role']) AS r(role_name)
        WHERE has_table_privilege(role_name,'agronomy_catalogue.model_profiles','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')) AS api_access`);
    if(!permissions.rows[0].runtime_read||permissions.rows[0].runtime_write||permissions.rows[0].api_access)
      throw new Error("CATALOGUE_PERMISSIONS_FAILED");
    stage="insert_immutable_release";
    const before=await client.query("SELECT crop,variety,model,parameters,record_hash FROM agronomy_catalogue.model_profiles WHERE version=$1",[catalogueVersion]);
    if(before.rows.length)assertCatalogueRows(before.rows);
    else await client.query(`INSERT INTO agronomy_catalogue.model_profiles(version,crop,variety,model,parameters,record_hash)
      SELECT $1,x.crop,x.variety,x.model,x.parameters,x.record_hash FROM jsonb_to_recordset($2::jsonb)
      AS x(crop text,variety text,model text,parameters jsonb,record_hash text)`,
      [catalogueVersion,JSON.stringify(catalogueRecords)]);
    stage="full_comparison_before_commit";
    const after=await client.query("SELECT crop,variety,model,parameters,record_hash FROM agronomy_catalogue.model_profiles WHERE version=$1",[catalogueVersion]);
    assertCatalogueRows(after.rows);
    stage="commit";await client.query("COMMIT");transaction=false;commitConfirmed=true;
    const report={status:"applied-and-fully-compared",version:catalogueVersion,profiles:catalogueRecords.length,
      counts:catalogueCounts,tls:{ca:true,hostname:true,protocol:socket.getProtocol()},
      runtimeReadOnly:true,dataApiAccess:false,rls:true,transactionCommitted:true,
      existingClientData:"not-read-or-modified",applicationConnection:"unchanged",published:false};
    writeFileSync(resolve("generated-artifacts/catalogue-360-result.json"),JSON.stringify(report,null,2)+"\n");
    console.log(JSON.stringify(report));
  }catch(error){
    if(client&&transaction)try{await client.query("ROLLBACK");rollbackConfirmed=true;}catch{}
    const code=(error as {code?:string})?.code;
    const message=(error as Error)?.message;
    console.error(JSON.stringify({status:"blocked",stage,
      reason:/^[A-Z_]{5,80}$/.test(message??"")?message:"CATALOGUE_OPERATION_FAILED",
      sqlstate:/^[A-Z0-9]{5}$/.test(code??"")?code:null,rollbackConfirmed,commitConfirmed,automaticRetry:false}));
    process.exitCode=1;
  }finally{if(client)try{await client.end();}catch{console.error("CATALOGUE_CONNECTION_CLOSE_FAILED");process.exitCode=1;}}
}
void main();
