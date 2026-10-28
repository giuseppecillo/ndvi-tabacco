import type { Request, Response } from "express";
import { clerkClient } from "@clerk/express";
import pool from "./db";
import { audit, PRIVACY_VERSION } from "./security-db";
import type { LocalAccount } from "../middlewares/access";
import { subscriptionInfo } from "./subscription";

export const accountJson = (a: LocalAccount) => ({
  id: a.id, email: a.email, name: a.name, role: a.role, status: a.status,
  privacyAcknowledged: a.privacy_version === PRIVACY_VERSION,
  privacyVersion: PRIVACY_VERSION, activated: !!a.clerk_user_id,
  createdAt: a.created_at.toISOString(),
  ...subscriptionInfo(a),
});

export const requestColumns = `id, user_id AS "userId", type, message, status, response, created_at AS "createdAt"`;

export async function inviteAccount(account: LocalAccount, origin: string) {
  const invited = await pool.query(
    `UPDATE app_users SET invited_at=now()
     WHERE id=$1 AND clerk_user_id IS NULL AND status='active'
       AND (invited_at IS NULL OR invited_at < now() - interval '15 minutes')
     RETURNING invitation_id`,
    [account.id],
  );
  if (!invited.rowCount) return false;
  try {
    const previousId = invited.rows[0].invitation_id;
    if (previousId) {
      try {
        await clerkClient.invitations.revokeInvitation(previousId);
      } catch (err) {
        if (![404, 400].includes((err as { status?: number }).status ?? 0)) throw err;
      }
    }
    const invitation = await clerkClient.invitations.createInvitation({
      emailAddress: account.email,
      redirectUrl: `${origin}/sign-up`,
      expiresInDays: 7,
      ignoreExisting: true,
      notify: true,
    });
    await pool.query("UPDATE app_users SET invitation_id=$2 WHERE id=$1", [account.id, invitation.id]);
    return true;
  } catch (error) {
    await pool.query("UPDATE app_users SET invited_at=NULL WHERE id=$1", [account.id]);
    throw error;
  }
}

export async function deleteAccount(req: Request, res: Response) {
  const targetId = String(req.params.id);
  const admin: LocalAccount = res.locals.account;
  const target = (await pool.query<LocalAccount>("SELECT * FROM app_users WHERE id=$1", [targetId])).rows[0];
  if (!target) return res.status(404).json({ error: "Utente non trovato." });
  if (target.role === "admin" || target.id === admin.id) {
    return res.status(400).json({ error: "Non puoi eliminare l’account amministratore." });
  }
  // Fail closed before touching external identity. On provider failure the
  // disabled account remains listed as 'deleting' so an admin can retry.
  await pool.query("UPDATE app_users SET status='deleting' WHERE id=$1", [targetId]);
  if (target.clerk_user_id) {
    try {
      await clerkClient.users.deleteUser(target.clerk_user_id);
    } catch (err) {
      if ((err as { status?: number }).status !== 404) {
        req.log.error("Identity deletion failed; account remains disabled");
        return res.status(502).json({ error: "Account disabilitato. Cancellazione dell’identità non riuscita: riprova l’eliminazione." });
      }
    }
  } else {
    // Revoke all pending invitations, not only the most recently saved ID.
    const invitations = await clerkClient.invitations.getInvitationList({ query: target.email, limit: 100 });
    for (const invitation of invitations.data) {
      if (invitation.emailAddress.toLowerCase() === target.email && invitation.status === "pending") {
        await clerkClient.invitations.revokeInvitation(invitation.id);
      }
    }
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM osservazioni WHERE owner_id=$1", [targetId]);
    await client.query("DELETE FROM app_users WHERE id=$1", [targetId]);
    // Erase past subject identifiers from audit, retaining non-personal events.
    await client.query("UPDATE security_events SET actor_id=NULL WHERE actor_id=$1", [targetId]);
    await client.query("UPDATE security_events SET target_id=NULL WHERE target_id=$1", [targetId]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  await audit(admin.id, null, "account_deleted");
  return res.json({ message: "Account, rilievi e richieste personali eliminati dai sistemi attivi. Restano soggetti alle politiche dei fornitori gli eventuali backup." });
}
