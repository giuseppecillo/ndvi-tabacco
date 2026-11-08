import { getGetMyUsageQueryKey, useGetMyUsage, type Account, type UserUsage } from "@workspace/api-client-react";
import { t, useLanguage } from "../i18n/runtime";
import { PlanBadge, UsageDetails, daysUntil, fmtDay, stateSentence } from "./PlanUsage";
import { ErrorNote } from "./ui";

const TONE: Record<UserUsage["state"], string> = {
  active: "border-[var(--nc-leaf)]/30 bg-[#eef4e6]",
  scheduled: "border-[#55602b]/30 bg-[#f1f2e4]",
  expired: "border-[var(--nc-danger)]/40 bg-[#f9ebe5]",
  unassigned: "border-dashed border-[#c9a24a]/70 bg-[#fbf3df]",
  exempt: "border-[var(--nc-line)] bg-[#fbf8f1]",
};

function Body({ usage, account, compact }: { usage: UserUsage; account: Account; compact: boolean }) {
  const sentence = stateSentence(usage);
  const left = usage.state === "active" ? daysUntil(usage.expiresAt) : null;
  return (
    <section aria-label={t("Stato contratto")} data-testid={`summary-plan-${usage.userId}`} className={`rounded-xl border px-4 py-3 text-[var(--nc-ink)] ${TONE[usage.state]} ${compact ? "text-sm" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PlanBadge usage={usage} />
        {usage.state === "active" && <span className="nc-mono min-w-0 text-xs [overflow-wrap:anywhere]">{fmtDay(usage.startsOn)} – {fmtDay(usage.expiresAt)}{left != null && <strong data-testid={`text-days-left-${usage.userId}`}> · {left === 1 ? t("1 giorno rimanente") : t(`${Math.max(0, left)} giorni rimanenti`)}</strong>}</span>}
      </div>
      {usage.state === "unassigned" && !account.subscriptionExempt && <p className="nc-mono mt-1 text-xs" data-testid={`text-legacy-expiry-${usage.userId}`}>{t("Accesso legacy")}: {account.subscriptionExpiresAt ? `${t("Scadenza")} ${fmtDay(account.subscriptionExpiresAt)}${account.subscriptionDaysRemaining != null ? ` · ${account.subscriptionExpired ? t("Scaduto") : t(`${account.subscriptionDaysRemaining} giorni rimanenti`)}` : ""}` : t("Scadenza non configurata.")}</p>}
      {sentence && <p className={`mt-2 text-sm ${usage.state === "expired" ? "font-medium text-[var(--nc-danger)]" : ""}`}>{sentence}</p>}
      {usage.state !== "exempt" && <div className="mt-3"><UsageDetails usage={usage} showPeriods={!compact || usage.periods.length > 1} /></div>}
    </section>
  );
}

function SelfUsage({ account }: { account: Account }) {
  const q = useGetMyUsage({ query: { queryKey: getGetMyUsageQueryKey(), refetchInterval: 15000, refetchOnWindowFocus: true, retry: false } });
  if (q.isPending) return <div className="nc-skel h-24" aria-busy="true" aria-label={t("Consumi in caricamento")} />;
  if (q.isError) return <div className="space-y-2"><Legacy account={account} /><ErrorNote error={q.error} onRetry={() => void q.refetch()} /></div>;
  return <Body usage={q.data} account={account} compact={false} />;
}

/** Fallback when usage is unavailable: show the account-level contract fields only. */
function Legacy({ account }: { account: Account }) {
  return (
    <section aria-label={t("Stato contratto")} className={`rounded-xl border px-4 py-3 text-sm ${account.subscriptionExpired ? "border-[var(--nc-danger)]/40 bg-[#f9ebe5]" : "border-[var(--nc-line)] bg-[#fbf8f1]"}`}>
      <strong>{account.subscriptionExempt ? t("Account amministratore: esente da piani e limiti.") : account.subscriptionExpired ? t("Scaduto") : t("Consumi non disponibili.")}</strong>
      {!account.subscriptionExempt && account.subscriptionExpiresAt && <span className="nc-mono ml-2 text-xs">{t("Scadenza")}: {fmtDay(account.subscriptionExpiresAt)}</span>}
    </section>
  );
}

/**
 * Contract and usage summary. Pass `usage` when already loaded (admin list);
 * otherwise the signed-in user's own usage is fetched.
 */
export function SubscriptionSummary({ account, usage, compact = false }: { account: Account; usage?: UserUsage | null; compact?: boolean }) {
  useLanguage();
  if (usage) return <Body usage={usage} account={account} compact={compact} />;
  if (compact) return <Legacy account={account} />;
  return <SelfUsage account={account} />;
}
