import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useClerk } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMyAccountQueryKey, useGetMyAccount, type Account } from "@workspace/api-client-react";
import { LanguageSelector } from "../i18n/LanguageSelector";
import { getLocale, t } from "../i18n/runtime";

export const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
export const taurusLogo = `${import.meta.env.BASE_URL}taurus-logo.png`;
export const PRIVACY_CONTACT = "privacy@taurusagsolution.com";
export const SUPPORT_CONTACT = "password@taurusagsolution.com";
export const TECHNICAL_SUPPORT_CONTACT = "support@taurusagsolution.com";

export function TechnicalSupport({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-col items-start gap-2 text-sm">
      <a
        href={`mailto:${TECHNICAL_SUPPORT_CONTACT}`}
        className="inline-flex items-center justify-center rounded-full bg-[var(--nc-leaf)] px-4 py-2 text-center font-semibold text-[var(--nc-paper)] hover:bg-[var(--nc-leaf-2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--nc-leaf)]"
      >
        Scrivi al supporto tecnico
      </a>
      {!compact && (
        <span className="break-all text-[var(--nc-muted)] select-text">{TECHNICAL_SUPPORT_CONTACT}</span>
      )}
    </div>
  );
}

export function errText(e: unknown): string {
  const d = (e as { data?: unknown } | null)?.data;
  if (d && typeof d === "object" && typeof (d as { error?: unknown }).error === "string") {
    return t((d as { error: string }).error);
  }
  if (e instanceof Error && e.message) return t(e.message);
  return t("Errore imprevisto. Riprova.");
}
export function errStatus(e: unknown): number | undefined {
  const s = (e as { status?: unknown } | null)?.status;
  return typeof s === "number" ? s : undefined;
}

export function useMyAccount(enabled: boolean) {
  return useGetMyAccount({
    query: {
      queryKey: getGetMyAccountQueryKey(),
      enabled,
      retry: false,
      refetchInterval: 15000,
      refetchOnWindowFocus: true,
    },
  });
}

export function Btn({
  children, onClick, variant = "primary", disabled, type = "button", className = "",
}: {
  children: ReactNode; onClick?: () => void; variant?: "primary" | "ghost" | "danger" | "wheat";
  disabled?: boolean; type?: "button" | "submit"; className?: string;
}) {
  const v = {
    primary: "bg-[var(--nc-leaf)] text-[var(--nc-paper)] hover:bg-[var(--nc-leaf-2)]",
    ghost: "bg-transparent text-[var(--nc-leaf)] border border-[var(--nc-line)] hover:bg-[var(--nc-paper-2)]",
    danger: "bg-[var(--nc-danger)] text-[var(--nc-paper)] hover:opacity-90",
    wheat: "bg-[var(--nc-wheat)] text-[var(--nc-ink)] hover:opacity-90",
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 min-h-[44px] rounded-full px-5 py-2.5 text-sm font-semibold transition active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed ${v} ${className}`}>
      {children}
    </button>
  );
}

export function ErrorNote({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-[var(--nc-danger)]/40 bg-[#f7e3dc] px-4 py-3 text-sm text-[var(--nc-danger)] flex items-start justify-between gap-3">
      <span>{errText(error)}</span>
      {onRetry && <button onClick={onRetry} className="font-semibold underline shrink-0">Riprova</button>}
    </div>
  );
}

export function OkNote({ children }: { children: ReactNode }) {
  return <div role="status" className="rounded-xl border border-[var(--nc-leaf)]/30 bg-[#e3eedb] px-4 py-3 text-sm text-[var(--nc-leaf)]">{children}</div>;
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Caricamento">
      {Array.from({ length: rows }).map((_, i) => <div key={i} className="nc-skel h-12" />)}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-[var(--nc-line)] bg-[#fbf8f1] p-6 shadow-[0_1px_0_rgba(31,61,43,.06),0_12px_30px_-18px_rgba(31,61,43,.35)] ${className}`}>{children}</section>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="nc-mono text-[11px] uppercase tracking-[0.18em] text-[var(--nc-wheat)]">{children}</p>;
}

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <img src={taurusLogo} alt="Taurus Agriculture Solution" className="h-10 w-auto" />
      <span className="nc-display text-lg font-semibold text-[var(--nc-leaf)]">NitroCrop NDVI</span>
    </Link>
  );
}

export function useSignOutAll() {
  const { signOut } = useClerk();
  const qc = useQueryClient();
  return async () => {
    qc.clear();
    await signOut({ redirectUrl: basePath || "/" });
  };
}

export function TopBar({ account }: { account?: Account | null }) {
  const out = useSignOutAll();
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  useEffect(() => { setOpen(false); }, [location]);
  const link = "inline-flex min-h-[44px] items-center rounded-full px-3 py-2 text-sm text-[var(--nc-leaf)] hover:bg-[var(--nc-paper-2)] lg:min-h-0 lg:py-1.5";
  const ready = account && account.status === "active" && account.privacyAcknowledged;
  return (
    <header className="border-b border-[var(--nc-line)] bg-[var(--nc-paper)]/90 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0"><Brand /></div>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-controls="nc-topnav"
          aria-label={open ? t("Chiudi il menu") : t("Apri il menu")}
          data-testid="button-menu"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--nc-line)] px-4 text-sm font-semibold text-[var(--nc-leaf)] lg:hidden"
        >
          <span aria-hidden="true" className="flex w-4 flex-col gap-[3px]">
            <span className={`h-[2px] bg-current transition ${open ? "translate-y-[5px] rotate-45" : ""}`} />
            <span className={`h-[2px] bg-current transition ${open ? "opacity-0" : ""}`} />
            <span className={`h-[2px] bg-current transition ${open ? "-translate-y-[5px] -rotate-45" : ""}`} />
          </span>
          Menu
        </button>
        <nav className="hidden flex-wrap items-center justify-end gap-1 lg:flex">
          <NavItems account={account} ready={!!ready} link={link} out={out} />
        </nav>
      </div>
      {open && (
        <nav id="nc-topnav" className="border-t border-[var(--nc-line)] bg-[var(--nc-paper)] px-4 pb-4 pt-2 lg:hidden">
          <div className="mx-auto grid max-w-6xl gap-1 sm:grid-cols-2">
            <NavItems account={account} ready={!!ready} link={`${link} w-full`} out={out} />
          </div>
        </nav>
      )}
    </header>
  );
}

function NavItems({ account, ready, link, out }: { account?: Account | null; ready: boolean; link: string; out: () => Promise<void> }) {
  return (
    <>
      {ready && <Link href="/user-portal" className={link}>Rilievo e Mappe</Link>}
      {ready && <Link href="/instructions" className={link}>Istruzioni</Link>}
      {account && <Link href="/account" className={link}>Il mio account</Link>}
      {account?.role === "admin" && account.status === "active" && <Link href="/admin" className={link}>Amministrazione</Link>}
      <Link href="/privacy" className={link}>Privacy</Link>
      <div className="py-1"><TechnicalSupport compact /></div>
      <div className="py-1"><LanguageSelector /></div>
      <button onClick={() => void out()} className="ml-1 min-h-[44px] rounded-full border border-[var(--nc-line)] px-4 py-2 text-sm font-semibold text-[var(--nc-leaf)] hover:bg-[var(--nc-paper-2)] lg:min-h-0 lg:py-1.5">Esci</button>
    </>
  );
}

export function fmtDate(s: string) {
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleString(getLocale(), { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Rome" });
}
