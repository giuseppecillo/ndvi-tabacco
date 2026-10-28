/**
 * One-shot administrator setup. The password must come from Replit Secrets,
 * never a source file, command argument, log or default password.
 */
import { clerkClient } from "@clerk/express";
import pool from "../lib/db";
import { bootstrapEmail } from "../lib/security-db";

async function main() {
  const password = process.env.NITROCROP_ADMIN_PASSWORD;
  if (!password) throw new Error("Inserire la nuova password tramite il modulo sicuro dei Segreti.");
  const { rows } = await pool.query(
    "SELECT id,email,role,clerk_user_id FROM app_users WHERE id=(SELECT value FROM security_state WHERE key='initial_admin')",
  );
  const admin = rows[0];
  if (!admin || admin.role !== "admin" || admin.email !== bootstrapEmail()) {
    throw new Error("L’autorizzazione amministrativa iniziale non corrisponde alla configurazione.");
  }
  const matches = await clerkClient.users.getUserList({ emailAddress: [admin.email], limit: 2 });
  if (matches.data.length > 1) throw new Error("Identità ambigua: usare l’attivazione via email.");
  const existing = matches.data[0];
  if (admin.clerk_user_id && admin.clerk_user_id !== existing?.id) {
    throw new Error("Identità amministrativa non corrispondente. Nessuna modifica eseguita.");
  }
  const identity = existing
    ? await clerkClient.users.updateUser(existing.id, { password, signOutOfOtherSessions: true })
    : await clerkClient.users.createUser({ emailAddress: [admin.email], password });
  await pool.query("UPDATE app_users SET clerk_user_id=$2 WHERE id=$1 AND role='admin'", [admin.id, identity.id]);
  console.info("Credenziali amministrative aggiornate nel gestore di autenticazione.");
}
try {
  await main();
} catch (error) {
  // Provider diagnostics can contain submitted values; print only known codes.
  const providerErrors = (error as { errors?: { code?: string }[] }).errors;
  console.error(providerErrors?.length
    ? `Password non accettata dal gestore: ${providerErrors.map(e => e.code ?? "validation_error").join(", ")}.`
    : "Configurazione amministrativa non completata. Verificare il segreto e l’autorizzazione iniziale.");
  process.exitCode = 1;
} finally {
  await pool.end();
}
