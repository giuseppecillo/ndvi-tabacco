import test from "node:test";
import assert from "node:assert/strict";
import { X509Certificate } from "node:crypto";
import { readFileSync } from "node:fs";
import {runtimeConnectionConfig,RUNTIME_HOST,RUNTIME_PROJECT} from "../../src/runtime-connection-config";
import {SUPABASE_RUNTIME_CA} from "../../src/supabase-runtime-ca";
import {createMigrationPause} from "../../../../artifacts/api-server/src/middlewares/migrationPause";
import {preparedAppSource,preparedDatabaseSource} from "./prepared-wiring.mjs";
import {verifyRuntimeIdentity} from "../../src/runtime-identity";
import {TLSSocket} from "node:tls";
import {verifyProductionRuntimePreflight} from "../../src/production-runtime-preflight";
import {runtimePreflightErrorCode} from "../../src/runtime-preflight-errors";

const runtimeUrl=`postgresql://app_runtime.${RUNTIME_PROJECT}:synthetic-password@${RUNTIME_HOST}:5432/postgres`;
test("source mode preserves the existing connection and ignores inactive target credentials",()=>{
  assert.deepEqual(runtimeConnectionConfig({DATABASE_URL:"synthetic-source",NITROCROP_RUNTIME_DATABASE_URL:runtimeUrl}),
    {connectionString:"synthetic-source"});
});
test("runtime is pinned to the approved session pooler and dedicated nonadmin role",()=>{
  const config=runtimeConnectionConfig({NITROCROP_DB_BACKEND:"supabase",NITROCROP_RUNTIME_DATABASE_URL:runtimeUrl});
  assert.equal(config.user,`app_runtime.${RUNTIME_PROJECT}`);
  assert.equal(config.host,RUNTIME_HOST);
  assert.equal(config.port,5432);
  const ssl=config.ssl as {rejectUnauthorized:boolean;servername:string};
  assert.equal(ssl.rejectUnauthorized,true);assert.equal(ssl.servername,RUNTIME_HOST);
  assert.equal(config.connectionString,undefined);
});
test("admin, migrator, readonly, other projects and TLS downgrades fail closed",()=>{
  const bad=[
    runtimeUrl.replace("app_runtime.","postgres."),
    runtimeUrl.replace("app_runtime.","app_migrator."),
    runtimeUrl.replace("app_runtime.","app_readonly."),
    runtimeUrl.replace(RUNTIME_PROJECT,"aaaaaaaaaaaaaaaaaaaa"),
    runtimeUrl.replace(":5432/",":6543/"),
    runtimeUrl+"?sslmode=disable",
    runtimeUrl+"?sslmode=require",
    runtimeUrl+"?sslrootcert=/untrusted",
  ];
  for(const url of bad) assert.throws(()=>runtimeConnectionConfig({
    NITROCROP_DB_BACKEND:"supabase",NITROCROP_RUNTIME_DATABASE_URL:url,
  }));
  assert.throws(()=>runtimeConnectionConfig({NITROCROP_DB_BACKEND:"supabase",DATABASE_URL:"source"}));
});
test("bundled certificate matches the already approved CA fixture",()=>{
  const original=readFileSync(new URL("../inventory/fixtures/supabase-root-2021.pem",import.meta.url),"utf8");
  assert.equal(new X509Certificate(original).fingerprint256,new X509Certificate(SUPABASE_RUNTIME_CA).fingerprint256);
});
function request(path:string,id:string|null,env:NodeJS.ProcessEnv) {
  let next=0,status=0;
  const middleware=createMigrationPause(env,()=>id);
  const response={setHeader(){},status(value:number){status=value;return this;},json(){}};
  middleware({path} as Parameters<typeof middleware>[0],
    response as unknown as Parameters<typeof middleware>[1],()=>{next++;});
  return {next,status};
}
test("unconfigured maintenance is inactive and health remains available",()=>{
  assert.deepEqual(request("/api/osservazioni",null,{}),{next:1,status:0});
  assert.deepEqual(request("/api/healthz",null,{NITROCROP_MIGRATION_PAUSE:"1"}),{next:1,status:0});
});
test("maintenance blocks GET-capable account and observation paths before account middleware",()=>{
  for(const path of ["/api","/api/me","/api/osservazioni","/api/admin/users"])
    assert.deepEqual(request(path,null,{NITROCROP_MIGRATION_PAUSE:"1"}),{next:0,status:503});
});
test("pilot access requires the verified Clerk identity, not public path or headers",()=>{
  const env={NITROCROP_MIGRATION_PAUSE:"1",NITROCROP_MIGRATION_QA_CLERK_IDS:"user_SyntheticPilot1234"};
  assert.equal(request("/api/me","user_SyntheticPilot1234",env).next,1);
  assert.equal(request("/api/me","user_AnotherPilot12345",env).status,503);
  assert.equal(request("/api/me",null,env).status,503);
});
test("bad maintenance configuration never silently opens traffic",()=>{
  assert.throws(()=>createMigrationPause({NITROCROP_MIGRATION_PAUSE:"true"},()=>null));
  assert.throws(()=>createMigrationPause({NITROCROP_MIGRATION_QA_CLERK_IDS:"*"},()=>null));
});
test("candidate wiring is exact, default-off and after Clerk but before account routes",()=>{
  const source=readFileSync(new URL("../../../../artifacts/api-server/src/app.ts",import.meta.url),"utf8");
  const wired=preparedAppSource(source);
  assert.ok(wired.indexOf("app.use(createMigrationPause")>wired.indexOf("app.use(clerkMiddleware"));
  assert.ok(wired.indexOf("app.use(createMigrationPause")<wired.indexOf('app.use("/api", router)'));
  assert.equal(wired,source);
  const db=readFileSync(new URL("../../src/index.ts",import.meta.url),"utf8");
  assert.match(preparedDatabaseSource(db),/new Pool\(runtimeConnectionConfig\(process\.env\)\)/);
  assert.equal(preparedDatabaseSource(db),db);
});

const productionEnv = {
  NODE_ENV: "production", REPLIT_DEPLOYMENT: "1",
  NITROCROP_RUNTIME_PREFLIGHT: "1", NITROCROP_DB_BACKEND: "replit",
  DATABASE_URL: "synthetic-source", NITROCROP_RUNTIME_DATABASE_URL: runtimeUrl,
};
test("Production diagnostic is default-off and never touches inactive credentials",async()=>{
  const unexpected=()=>{throw Error("must not create a pool");};
  assert.equal(await verifyProductionRuntimePreflight({},unexpected),"disabled");
  assert.equal(await verifyProductionRuntimePreflight({
    ...productionEnv,NITROCROP_RUNTIME_PREFLIGHT:"0",
  },unexpected),"disabled");
});
test("Production diagnostic rejects development, flag mistakes and premature backend switch",async()=>{
  const unexpected=()=>{throw Error("must not create a pool");};
  for(const env of [
    {...productionEnv,NODE_ENV:"development"},
    {...productionEnv,REPLIT_DEPLOYMENT:undefined},
    {...productionEnv,NITROCROP_RUNTIME_PREFLIGHT:"true"},
    {...productionEnv,NITROCROP_DB_BACKEND:"supabase"},
  ]) await assert.rejects(verifyProductionRuntimePreflight(env,unexpected),/RUNTIME_PREFLIGHT_/);
});
test("Production diagnostic fails closed on missing or admin credentials, without making a pool",async()=>{
  for(const url of ["",runtimeUrl.replace("app_runtime.","postgres.")]) {
    let calls=0;
    await assert.rejects(verifyProductionRuntimePreflight({
      ...productionEnv,NITROCROP_RUNTIME_DATABASE_URL:url,
    },()=>{calls++;throw Error("must not create a pool");}),
      url ? /RUNTIME_DESTINATION_OR_ROLE_INVALID/ : /RUNTIME_SECRET_MISSING/);
    assert.equal(calls,0);
  }
});
test("Production diagnostic authenticates separately, rolls back and closes without changing the app backend",async()=>{
  const env={...productionEnv};
  const queries:string[]=[];
  let closed=0;
  const socket=Object.assign(Object.create(TLSSocket.prototype),{
    encrypted:true,authorized:true,authorizationError:null,
    getProtocol:()=>"TLSv1.3",
    getPeerCertificate:()=>({raw:Buffer.from("offline fixture"),subjectaltname:`DNS:${RUNTIME_HOST}`}),
  });
  const result=await verifyProductionRuntimePreflight(env,config=>{
    assert.equal(config.user,`app_runtime.${RUNTIME_PROJECT}`);
    assert.equal(config.connectionString,undefined);
    assert.equal(config.max,1);
    return {end:async()=>{closed++;},connect:async()=>({
      connection:{stream:socket},release(){},
      async query(sql:string){
        queries.push(sql);
        return {rows:sql.includes("pg_catalog.pg_roles")?[{
          role:"app_runtime",session_role:"app_runtime",database:"postgres",readonly:"on",
          rolsuper:false,rolcreaterole:false,rolcreatedb:false,rolbypassrls:false,
        }]:[{readonly:"on"}]};
      },
    })} as never;
  });
  assert.equal(result,"passed");
  assert.equal(closed,1);
  assert.equal(queries[0],"BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  assert.equal(queries.at(-1),"ROLLBACK");
  assert.ok(queries.every(sql=>/^(BEGIN|SELECT|ROLLBACK)/.test(sql)));
  assert.equal(env.NITROCROP_DB_BACKEND,"replit");
  assert.equal(env.DATABASE_URL,"synthetic-source");
});
test("Production diagnostic strips provider errors and always closes its pool",async()=>{
  let closed=0;
  const error=await verifyProductionRuntimePreflight(productionEnv,()=>({
    connect:async()=>{throw Error(runtimeUrl);},end:async()=>{closed++;},
  }) as never).catch(error=>error);
  assert.equal(error.message,"RUNTIME_PREFLIGHT_FAILED");
  assert.doesNotMatch(String(error.stack),/synthetic-password|postgresql:\/\//);
  assert.equal(closed,1);
});
test("Production diagnostic does not report success when pool closure fails",async()=>{
  await assert.rejects(verifyProductionRuntimePreflight(productionEnv,()=>({
    connect:async()=>{throw Error("synthetic connection failure");},
    end:async()=>{throw Error(runtimeUrl);},
  }) as never),/RUNTIME_PREFLIGHT_CLOSE_FAILED/);
});
test("safe diagnostic codes distinguish credentials, TLS and protocol failures without exposing provider details",()=>{
  for(const [code,expected] of [
    ["28P01","RUNTIME_AUTHENTICATION_FAILED"],
    ["28000","RUNTIME_AUTHORIZATION_FAILED"],
    ["SELF_SIGNED_CERT_IN_CHAIN","RUNTIME_TLS_CERTIFICATE_REJECTED"],
    ["ERR_TLS_CERT_ALTNAME_INVALID","RUNTIME_TLS_HOSTNAME_NOT_VERIFIED"],
    ["ENOTFOUND","RUNTIME_NETWORK_FAILED"],
    ["08P01","RUNTIME_SESSION_STARTUP_REJECTED"],
    ["42501","RUNTIME_METADATA_PERMISSION_DENIED"],
  ]) {
    const unsafe=Object.assign(Error(runtimeUrl),{code,detail:runtimeUrl,query:runtimeUrl});
    assert.equal(runtimePreflightErrorCode(unsafe),expected);
  }
  for(const unsafe of [
    Error(runtimeUrl),
    Object.assign(Error(runtimeUrl),{code:runtimeUrl}),
    Error(`RUNTIME_CONNECTION_INVALID ${runtimeUrl}`),
    {code:"constructor",message:runtimeUrl},
  ]) assert.equal(runtimePreflightErrorCode(unsafe),"RUNTIME_PREFLIGHT_FAILED");
  assert.equal(runtimePreflightErrorCode(Error("RUNTIME_CONNECTION_INVALID")),"RUNTIME_CONNECTION_INVALID");
});
test("Production connection rejection preserves only its safe category and still closes the diagnostic pool",async()=>{
  let closed=0;
  const error=await verifyProductionRuntimePreflight(productionEnv,()=>({
    connect:async()=>{throw Object.assign(Error(runtimeUrl),{
      code:"28P01",detail:runtimeUrl,
    });},
    end:async()=>{closed++;},
  }) as never).catch(error=>error);
  assert.equal(error.message,"RUNTIME_AUTHENTICATION_FAILED");
  assert.equal(error.cause,undefined);
  assert.doesNotMatch(String(error.stack),/synthetic-password|postgresql:\/\//);
  assert.equal(closed,1);
});
test("API startup emits the approved category, never the raw preflight error",()=>{
  const source=readFileSync(new URL("../../../../artifacts/api-server/src/index.ts",import.meta.url),"utf8");
  const handler=source.slice(source.indexOf("} catch (error)"),source.indexOf("await verifySecuritySchema()"));
  assert.match(handler,/preflightCode: runtimePreflightErrorCode\(error\)/);
  assert.doesNotMatch(handler,/error\.message|error\.stack|error\.detail|\{\s*(?:err|error)\s*\}/);
});
test("import gates restored FORCE and ACL/integrity checks before sending commit",()=>{
  const source=readFileSync(new URL("./import.ts",import.meta.url),"utf8");
  const sql=readFileSync(new URL("./import-final-checks.sql",import.meta.url),"utf8");
  assert.ok(source.indexOf('new URL("./import-final-checks.sql"')<source.indexOf('await write("COMMIT;'));
  assert.ok(source.indexOf('FORCE ROW LEVEL SECURITY;')<source.indexOf('new URL("./import-final-checks.sql"'));
  assert.match(sql,/has_column_privilege/);
  assert.match(sql,/relforcerowsecurity/);
  assert.match(sql,/bad_observations/);
  assert.match(source,/IMPORT_COMMIT_OUTCOME_REQUIRES_READONLY_CHECK/);
});
test("runtime startup preflight performs no queries in source mode",async()=>{
  await verifyRuntimeIdentity({connect(){throw Error("must not connect");}} as never,false);
});
test("runtime identity preflight rolls back success and rejects privileged identities",async()=>{
  for(const role of ["app_runtime","postgres"]) {
    const queries:string[]=[];
    let destroyed: boolean|undefined;
    const socket=Object.assign(Object.create(TLSSocket.prototype),{
      encrypted:true,authorized:true,authorizationError:null,
      getProtocol:()=>"TLSv1.3",
      getPeerCertificate:()=>({raw:Buffer.from("offline fixture"),subjectaltname:`DNS:${RUNTIME_HOST}`}),
    });
    const client={connection:{stream:socket},release(value:boolean){destroyed=value;},
      async query(sql:string) {
        queries.push(sql);
        return {rows:sql.includes("pg_catalog.pg_roles")
          ? [{role,session_role:role,database:"postgres",readonly:"on",rolsuper:false,
            rolcreaterole:false,rolcreatedb:false,rolbypassrls:false}]
          : [{readonly:"on"}]};
      }};
    const work=verifyRuntimeIdentity({connect:async()=>client} as never,true);
    if(role==="app_runtime") await work; else await assert.rejects(work,/RUNTIME_ROLE_NOT_APPROVED/);
    assert.equal(queries[0],"BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    assert.equal(queries.at(-1),"ROLLBACK");
    assert.equal(destroyed,role!=="app_runtime");
    assert.ok(queries.every(sql=>/^(BEGIN|SELECT|ROLLBACK)/.test(sql)));
  }
});
