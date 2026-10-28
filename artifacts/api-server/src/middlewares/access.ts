import type { RequestHandler } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import pool from "../lib/db";
import { PRIVACY_VERSION } from "../lib/security-db";
import { getClerkProxyHost } from "./clerkProxyMiddleware";
import { safeBrowserOrigin } from "../lib/origin-policy";

export interface LocalAccount {
  id: string;
  clerk_user_id: string | null;
  email: string;
  name: string;
  role: "admin" | "user";
  status: "active" | "suspended" | "deleting";
  privacy_version: string | null;
  created_at: Date;
}

export const requireAccount: RequestHandler = async (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Accedi con le tue credenziali." });
    return;
  }
  res.setHeader("Cache-Control", "private, no-store");
  try {
    let result = await pool.query<LocalAccount>("SELECT * FROM app_users WHERE clerk_user_id=$1", [userId]);
    if (!result.rowCount) {
      // Only verified primary emails may bind to an administrator-authorized row.
      // No automatic application account creation on public sign-up.
      const identity = await clerkClient.users.getUser(userId);
      const primary = identity.emailAddresses.find(e => e.id === identity.primaryEmailAddressId);
      if (primary?.verification?.status === "verified") {
        result = await pool.query<LocalAccount>(
          `UPDATE app_users SET clerk_user_id=$1
           WHERE email=$2 AND clerk_user_id IS NULL AND status='active' RETURNING *`,
          [userId, primary.emailAddress.toLowerCase()],
        );
        // A concurrent first request may have completed the bind already.
        if (!result.rowCount) {
          result = await pool.query<LocalAccount>("SELECT * FROM app_users WHERE clerk_user_id=$1", [userId]);
        }
      }
    }
    const account = result.rows[0];
    if (!account || account.status !== "active") {
      res.status(403).json({ error: "Accesso non autorizzato o account sospeso. Contatta l’amministratore." });
      return;
    }
    res.locals.account = account;
    next();
  } catch (error) {
    // A recently deleted Clerk session may still have a short-lived valid JWT.
    // Treat the missing identity as unauthenticated, not a service outage.
    if ((error as { status?: number }).status === 404) {
      res.status(401).json({ error: "Account non disponibile. Accedi nuovamente." });
      return;
    }
    req.log.error("Account authorization failed");
    res.status(503).json({ error: "Impossibile verificare l’accesso. Riprova." });
  }
};

export const requireAdmin: RequestHandler = (_req, res, next) => {
  if (res.locals.account?.role !== "admin") {
    res.status(403).json({ error: "Funzione riservata all’amministratore." });
    return;
  }
  next();
};

export const requirePrivacyAck: RequestHandler = (_req, res, next) => {
  if (res.locals.account?.privacy_version !== PRIVACY_VERSION) {
    res.status(403).json({ error: "Leggi l’informativa privacy prima di utilizzare il registro." });
    return;
  }
  next();
};

// Same-origin cookie auth must not allow cross-site state-changing requests.
// Reject requests without an Origin too; all browser UI mutations send it.
export const requireSameOrigin: RequestHandler = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const host = getClerkProxyHost(req) ?? req.get("host");
    // Invitations contain activation credentials. Never derive their redirect
    // target solely from spoofable Host/Origin headers on a direct API request.
    const allowedHosts = new Set([
      ...(process.env.REPLIT_DOMAINS ?? "").split(",").map(value => value.trim()).filter(Boolean),
      process.env.REPLIT_DEV_DOMAIN ?? "",
      ...(process.env.NODE_ENV !== "production" ? ["localhost", "127.0.0.1"] : []),
    ]);
  const origin = safeBrowserOrigin(
    req.get("origin"), host, allowedHosts, process.env.NODE_ENV === "production",
    req.get("sec-fetch-site") === "cross-site",
  );
  if (origin) {
    res.locals.siteOrigin = origin;
    next();
  } else {
    res.status(403).json({ error: "Richiesta non consentita da questa origine." });
  }
};
