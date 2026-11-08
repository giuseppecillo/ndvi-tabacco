// Metadata-only observations; cannot fence an external writer by itself.
export const QUIESCENCE_SQL = Object.freeze({
  sessions: `SELECT backend_type,state,(xact_start IS NOT NULL) AS transaction_open
    FROM pg_catalog.pg_stat_activity
    WHERE datname=pg_catalog.current_database() AND pid<>pg_catalog.pg_backend_pid()`,
  prepared: `SELECT count(*)::int AS n FROM pg_catalog.pg_prepared_xacts
    WHERE database=pg_catalog.current_database()`,
  subscriptions: `SELECT count(*)::int AS n FROM pg_catalog.pg_subscription
    WHERE subenabled AND subdbid=(SELECT oid FROM pg_catalog.pg_database
      WHERE datname=pg_catalog.current_database())`,
  schedulers: `SELECT extname FROM pg_catalog.pg_extension
    WHERE lower(extname) IN ('pg_cron','pgagent')`,
});

export async function observeQuiescence(client) {
  let begun=false;
  const query=async sql=>{
    const probe=await client.query("SELECT pg_catalog.current_setting('transaction_read_only') AS mode");
    if(probe.rows?.length!==1 || probe.rows[0].mode!=="on") throw Error("READ_ONLY_REQUIRED");
    return client.query(sql);
  };
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    begun=true;
    const sessions=(await query(QUIESCENCE_SQL.sessions)).rows;
    const prepared=(await query(QUIESCENCE_SQL.prepared)).rows[0]?.n;
    const subscriptions=(await query(QUIESCENCE_SQL.subscriptions)).rows[0]?.n;
    const schedulers=(await query(QUIESCENCE_SQL.schedulers)).rows;
    if(!Array.isArray(sessions) || !Array.isArray(schedulers) ||
        !Number.isInteger(prepared) || !Number.isInteger(subscriptions)) throw Error("INCOMPLETE_METADATA");
    // Unknown/idle clients are not presumed harmless: they could write later.
    const otherClients=sessions.filter(row=>row.backend_type==="client backend").length;
    const unclassifiedBackends=sessions.filter(row=>
      !["client backend","autovacuum worker","walsender"].includes(row.backend_type)).length;
    const openClientTransactions=sessions.filter(row=>row.backend_type==="client backend" &&
      row.transaction_open===true).length;
    const blockers=[];
    if(otherClients) blockers.push("OTHER_CLIENT_CONNECTIONS");
    if(unclassifiedBackends) blockers.push("UNCLASSIFIED_OR_APPLY_WORKERS");
    if(prepared) blockers.push("PREPARED_TRANSACTIONS");
    if(subscriptions) blockers.push("ENABLED_LOGICAL_SUBSCRIPTIONS");
    if(schedulers.length) blockers.push("SCHEDULER_REQUIRES_EXPLICIT_INVENTORY_AND_STOP");
    return {clear:blockers.length===0,otherClients,openClientTransactions,
      unclassifiedBackends,preparedTransactions:prepared,
      enabledSubscriptions:subscriptions,schedulerExtensions:schedulers.length,blockers};
  } finally {
    if(begun) await client.query("ROLLBACK");
  }
}
