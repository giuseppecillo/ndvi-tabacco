import { useState, type ReactNode } from "react";
import { Link, Redirect } from "wouter";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMyAccountQueryKey, useAcknowledgePrivacy, type Account } from "@workspace/api-client-react";
import { Btn, Card, ErrorNote, Eyebrow, Skeleton, TopBar, errStatus, errText, useMyAccount, useSignOutAll } from "./ui";
import { SubscriptionSummary } from "./SubscriptionSummary";

function Frame({ children, account }: { children: ReactNode; account?: Account | null }) {
  return (
    <div className="min-h-[100dvh]">
      <TopBar account={account} />
      <main className="mx-auto max-w-3xl px-4 py-12">{children}</main>
    </div>
  );
}

function Blocked({ title, body, error, onRetry }: { title: string; body: string; error?: unknown; onRetry?: () => void }) {
  const out = useSignOutAll();
  return (
    <Frame>
      <Card className="nc-rise">
        <Eyebrow>Accesso non disponibile</Eyebrow>
        <h1 className="nc-display mt-2 text-3xl font-semibold text-[var(--nc-leaf)]">{title}</h1>
        <p className="mt-3 text-[var(--nc-muted)] leading-relaxed">{body}</p>
        {error !== undefined && <p className="nc-mono mt-4 text-xs text-[var(--nc-danger)]">{errText(error)}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          {onRetry && <Btn onClick={onRetry}>Verifica di nuovo</Btn>}
          <Btn variant="ghost" onClick={() => void out()}>Esci</Btn>
        </div>
      </Card>
    </Frame>
  );
}

function PrivacyAck({ account }: { account: Account }) {
  const [checked, setChecked] = useState(false);
  const qc = useQueryClient();
  const ack = useAcknowledgePrivacy({
    mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getGetMyAccountQueryKey() }) },
  });
  return (
    <Frame account={account}>
      <Card className="nc-rise">
        <Eyebrow>Informativa versione {account.privacyVersion}</Eyebrow>
        <h1 className="nc-display mt-2 text-3xl font-semibold text-[var(--nc-leaf)]">Prima di aprire i tuoi campi</h1>
        <p className="mt-3 text-[var(--nc-muted)] leading-relaxed">
          Le misure GPS e le osservazioni NDVI sono dati riservati. Ti chiediamo di confermare di aver letto
          l'informativa sul trattamento dei dati. Non è un consenso di marketing: registriamo solo la presa visione
          della versione corrente.
        </p>
        <Link href="/privacy" className="mt-4 inline-block font-semibold text-[var(--nc-wheat)] underline">Leggi l'informativa completa</Link>
        <label className="mt-6 flex items-start gap-3 rounded-xl border border-[var(--nc-line)] bg-[var(--nc-paper)] p-4 cursor-pointer">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--nc-leaf)]" checked={checked} onChange={e => setChecked(e.target.checked)} />
          <span className="text-sm">Ho letto l'informativa privacy (versione <span className="nc-mono">{account.privacyVersion}</span>) e ne ho preso visione.</span>
        </label>
        {ack.isError && <div className="mt-4"><ErrorNote error={ack.error} /></div>}
        <div className="mt-6">
          <Btn disabled={!checked || ack.isPending} onClick={() => ack.mutate({ data: { version: account.privacyVersion } })}>
            {ack.isPending ? "Registrazione..." : "Conferma e continua"}
          </Btn>
        </div>
      </Card>
    </Frame>
  );
}

/**
 * Renders children only for a signed-in, active, approved account.
 * requireAck: also requires current privacy acknowledgment.
 */
export function AccountGate({ children, requireAck = true, requireAdmin = false, requireSubscription = true }: {
  children: (account: Account) => ReactNode; requireAck?: boolean; requireAdmin?: boolean; requireSubscription?: boolean;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const q = useMyAccount(!!isSignedIn);

  if (!isLoaded) return <Frame><Skeleton rows={4} /></Frame>;
  if (!isSignedIn) return <Redirect to="/" />;
  if (q.isError) {
    const s = errStatus(q.error);
    if (s === 403) return <Blocked title="Account non autorizzato" body="Il tuo accesso non è stato approvato o è stato sospeso dall'amministratore. I dati agronomici restano protetti finché l'accesso non viene riattivato." error={q.error} onRetry={() => void q.refetch()} />;
    if (s === 401) return <Blocked title="Sessione scaduta" body="Esci e accedi di nuovo per continuare." error={q.error} />;
    return <Blocked title="Impossibile verificare l'account" body="Per sicurezza i dati non vengono mostrati finché la verifica non riesce." error={q.error} onRetry={() => void q.refetch()} />;
  }
  if (q.isPending || !q.data) return <Frame><Skeleton rows={4} /></Frame>;
  const account = q.data;
  if (account.status !== "active") {
    return <Blocked title={account.status === "deleting" ? "Account in eliminazione" : "Account sospeso"} body="L'accesso ai dati è bloccato. Contatta l'amministratore della tua azienda." onRetry={() => void q.refetch()} />;
  }
  if (requireAdmin && account.role !== "admin") return <Redirect to="/user-portal" />;
  if (requireSubscription && account.subscriptionExpired) return (
    <Frame account={account}>
      <h1 className="mb-4 text-2xl font-semibold">Rinnova il tuo abbonamento</h1>
      <SubscriptionSummary account={account} />
      <p className="mt-4">L’accesso ai rilievi è sospeso fino al rinnovo da parte dell’amministratore. I dati restano conservati e puoi ancora esercitare i tuoi diritti privacy.</p>
      <Link href="/account" className="mt-4 inline-block font-semibold underline">Il mio account e richieste privacy</Link>
      <Btn className="ml-4 mt-4" onClick={() => void q.refetch()}>Verifica rinnovo</Btn>
    </Frame>
  );
  if (requireAck && !account.privacyAcknowledged) return <PrivacyAck account={account} />;
  return <>{children(account)}</>;
}
