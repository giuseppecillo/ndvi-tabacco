// Manual authorized synthetic tests only. Never commit or change application URLs.
import { randomUUID } from "node:crypto";
import { targetClient,assertTarget,verifyTargetTls } from "./target";
import { makePhase5Plan,APP_ROLES,API_ROLES } from "./phase5-cases.mjs";
import { captureState,validateState,ownerCounts,assertNoProbeObjects,requireCheck,tableNames } from "./phase5-state";

type CaseResult={name:string;role:string;status:string;sqlstate:string|null};
async function main() {
  requireCheck(process.argv.length===3 && process.argv[2]==="--authorized-synthetic-phase5",
    "SPECIFIC_PHASE5_AUTHORIZATION_REQUIRED");
  const plan=makePhase5Plan(randomUUID().replaceAll("-",""));
  const results:CaseResult[]=[];
  const loids:number[]=[];
  const client=targetClient();
  client.on("error",()=>{});
  let before:Awaited<ReturnType<typeof captureState>>|undefined;
  let transaction=false,rollbackConfirmed=false,explicitDeleteVerified=false;
  let stage="connection",errorCode:string|null=null;
  let tlsProtocol:string|null=null;
  let failed=false;
  const deadline=Date.now()+240_000;
  try {
    await client.connect();
    tlsProtocol=verifyTargetTls(client).protocol;
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ WRITE");
    transaction=true;
    await client.query(`SET LOCAL statement_timeout='4000ms';
      SET LOCAL lock_timeout='1000ms'; SET LOCAL idle_in_transaction_session_timeout='15000ms'`);
    stage="preconditions";
    await assertTarget(client);
    before=await captureState(client);
    validateState(before);
    await client.query("SET LOCAL ROLE app_migrator");
    await client.query(`LOCK TABLE ${tableNames.map(t=>`public."${t}"`).join(",")} IN SHARE ROW EXCLUSIVE MODE`);
    await client.query("SET LOCAL ROLE postgres");
    requireCheck((await ownerCounts(client)).every(row=>row.n==="0"),"TARGET_NOT_EMPTY");
    await assertNoProbeObjects(client,plan.probe,plan.temp,[]);
    stage="temporary_set_grants";
    for(const role of ["app_runtime","app_readonly"]) {
      const can=await client.query("SELECT pg_has_role(current_user,$1,'SET') AS allowed",[role]);
      if(!can.rows[0]?.allowed) {
        await client.query(`GRANT ${role} TO postgres WITH SET TRUE`);
      }
    }
    stage="synthetic_fixtures";
    await client.query("SET LOCAL ROLE app_migrator");
    for(const fixture of plan.fixtures) await client.query(fixture.sql,fixture.parameters);
    await client.query("SET LOCAL ROLE postgres");
    stage="cases";
    for(const trial of plan.cases) {
      requireCheck(Date.now()<deadline,"TEST_DEADLINE");
      requireCheck([...APP_ROLES,...API_ROLES].includes(trial.role),"UNAPPROVED_ROLE");
      let actionStarted=false,actionSucceeded=false,observedCode:string|null=null;
      let verificationError=false;
      try {
        const setup=await client.query(`SAVEPOINT p5_case; SET LOCAL ROLE ${trial.role};
          SELECT current_user::text AS role,current_setting('transaction_read_only') AS mode`);
        const last=(setup as unknown as Array<{rows:Record<string,string>[]} >).at(-1);
        requireCheck(last?.rows[0]?.role===trial.role && last.rows[0].mode==="off","CASE_ROLE_OR_MODE");
        actionStarted=true;
        const result=trial.parameters.length
          ? await client.query(trial.sql,trial.parameters) : await client.query(trial.sql);
        actionSucceeded=true;
        if(trial.affected!==undefined) requireCheck(result.rowCount===trial.affected,"ROW_EFFECT_MISMATCH");
        if(trial.scalar!==undefined) requireCheck(result.rows[0]?.n===trial.scalar,"ROW_VISIBILITY_MISMATCH");
        if(trial.anonymized) requireCheck(result.rows[0]?.anonymized===null,"ANONYMIZATION_FAILED");
        if(trial.checkCascade) {
          const cascade=await client.query(`SELECT
            (SELECT count(*)::int FROM public.osservazioni WHERE owner_id=$1) AS observations,
            (SELECT count(*)::int FROM public.privacy_requests WHERE user_id=$1) AS requests`,[trial.checkCascade]);
          requireCheck(cascade.rows[0]?.observations===0 && cascade.rows[0]?.requests===0,"CASCADE_FAILED");
        }
        if(trial.largeObject) {
          const oid=Number(result.rows[0]?.qa_oid);
          requireCheck(Number.isInteger(oid) && oid>0 && oid<=0xffffffff,"INVALID_TEST_LO_OID");
          loids.push(oid);
        }
      } catch(error) {
        const code=(error as {code?:unknown})?.code;
        observedCode=typeof code==="string" && /^[0-9A-Z]{5}$/.test(code)?code:null;
        verificationError=!actionStarted || actionSucceeded || observedCode!=="42501";
      } finally {
        // Restores the role as well as each case's data/DDL effects.
        await client.query("ROLLBACK TO SAVEPOINT p5_case; RELEASE SAVEPOINT p5_case");
      }
      const pass=trial.expect==="allow" ? actionSucceeded && !verificationError :
        !verificationError && (trial.expect==="probe" || !actionSucceeded);
      const finding=pass && trial.expect==="probe" && actionSucceeded;
      results.push({name:trial.name,role:trial.role,
        status:!pass?"FAIL":finding?"GLOBAL_PRIVILEGE_FINDING":"PASS",sqlstate:observedCode});
      if(trial.largeObject || trial.expect==="probe" || trial.name.includes("probe")) {
        await assertNoProbeObjects(client,plan.probe,plan.temp,loids);
      }
      requireCheck(pass,"CORE_CASE_FAILED");
    }
    stage="explicit_fixture_deletion";
    await client.query("SET LOCAL ROLE app_migrator");
    for(const table of ["osservazioni","privacy_requests","security_events","security_state","app_users"]) {
      const identifiers=plan.ids.find(row=>row.table===table)!;
      await client.query(`DELETE FROM public."${table}" WHERE "${identifiers.key}"=ANY($1::text[])`,[identifiers.values]);
    }
    await client.query("SET LOCAL ROLE postgres");
    requireCheck((await ownerCounts(client)).every(row=>row.n==="0"),"EXPLICIT_DELETE_FAILED");
    explicitDeleteVerified=true;
    await assertNoProbeObjects(client,plan.probe,plan.temp,loids);
  } catch(error) {
    failed=true;
    const code=(error as {code?:unknown})?.code;
    errorCode=typeof code==="string" && /^[0-9A-Z]{5}$/.test(code)?code:null;
  } finally {
    try {
      if(transaction) { await client.query("ROLLBACK"); rollbackConfirmed=true; }
    } catch { failed=true; }
    finally {
      try { await client.end(); } catch { failed=true; }
    }
  }
  // Only a fresh read-only cleanup check follows; never retry the write tests.
  let cleanupVerified=false;
  if(before && transaction) {
    const verify=targetClient();
    verify.on("error",()=>{});
    let readonly=false;
    try {
      await verify.connect();
      verifyTargetTls(verify);
      await verify.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      readonly=true;
      const probe=await verify.query("SELECT current_setting('transaction_read_only') AS mode");
      requireCheck(probe.rows[0]?.mode==="on","CLEANUP_NOT_READONLY");
      await assertTarget(verify);
      const after=await captureState(verify);
      requireCheck(JSON.stringify(after)===JSON.stringify(before),"METADATA_OR_MEMBERSHIP_CHANGED");
      requireCheck((await ownerCounts(verify)).every(row=>row.n==="0"),"FIXTURES_REMAIN");
      await assertNoProbeObjects(verify,plan.probe,plan.temp,loids);
      cleanupVerified=true;
    } catch { failed=true; }
    finally {
      try { if(readonly) await verify.query("ROLLBACK"); } catch { cleanupVerified=false;failed=true; }
      try { await verify.end(); } catch { cleanupVerified=false;failed=true; }
    }
  }
  const findings=results.filter(row=>row.status==="GLOBAL_PRIVILEGE_FINDING");
  const status=failed || !cleanupVerified || results.length!==plan.cases.length
    ?"PHASE5_BLOCKED":findings.length?"PHASE5_CORE_PASSED_GLOBAL_ISOLATION_FAILED":"PHASE5_PASSED";
  console.log(JSON.stringify({status,stage,errorCode,plannedCases:plan.cases.length,
    clientTlsProtocol:tlsProtocol,
    executedCases:results.length,passed:results.filter(row=>row.status==="PASS").length,
    findings,failedCases:results.filter(row=>row.status==="FAIL"),
    policiesChecked:before?.policies.length??0,syntheticFixtures:plan.fixtures.length,
    explicitDeleteVerified,rollbackConfirmed,cleanupVerified,
    testLargeObjectsCreated:loids.length,
    permanentChangesConfirmedAbsent:rollbackConfirmed && cleanupVerified,sourceConnected:false,
    nextPhaseStarted:false}));
  if(status!=="PHASE5_PASSED") process.exitCode=failed || !cleanupVerified?1:2;
}
main().catch(()=>{
  console.error("PHASE5_START_BLOCKED; no credential or raw database error printed.");
  process.exitCode=1;
});
