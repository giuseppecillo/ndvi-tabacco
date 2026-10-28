import type { Account } from "@workspace/api-client-react";

export function SubscriptionSummary({ account, compact = false }: { account: Account; compact?: boolean }) {
  const expiry = account.subscriptionExpiresAt;
  const expired = account.subscriptionExpired;
  return (
    <section aria-label="Stato abbonamento" className={`rounded-xl border px-4 py-3 ${expired ? "border-red-300 bg-red-50 text-red-900" : "border-emerald-200 bg-emerald-50 text-emerald-950"} ${compact ? "text-sm" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong>{account.subscriptionExempt ? "Amministratore · senza scadenza" : expired ? "Abbonamento scaduto · 0 giorni rimanenti" : `${account.subscriptionDaysRemaining} ${account.subscriptionDaysRemaining === 1 ? "giorno rimanente" : "giorni rimanenti"}`}</strong>
        {!account.subscriptionExempt && <span>Durata: {account.subscriptionDurationDays ?? "—"} giorni</span>}
      </div>
      {!account.subscriptionExempt && <p className="mt-1">
        {expiry ? `Scadenza: ${new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Rome" }).format(new Date(expiry))} (ora italiana).` : "Scadenza non configurata."}
        {expired && " Contatta l’amministratore per rinnovare. I tuoi rilievi non vengono cancellati."}
      </p>}
    </section>
  );
}
