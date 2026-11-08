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
  assert.doesNotMatch(source,/app\.use\(createMigrationPause/);
  const db=readFileSync(new URL("../../src/index.ts",import.meta.url),"utf8");
  assert.match(preparedDatabaseSource(db),/new Pool\(runtimeConnectionConfig\(process\.env\)\)/);
  assert.match(db,/new Pool\(\{ connectionString: process\.env\.DATABASE_URL \}\)/);
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
