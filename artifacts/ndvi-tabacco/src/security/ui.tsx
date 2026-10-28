import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import { useClerk } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMyAccountQueryKey, useGetMyAccount, type Account } from "@workspace/api-client-react";
import { LanguageSelector } from "../i18n/LanguageSelector";
import { getLocale, t, useLanguage } from "../i18n/runtime";

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

// Keep the dropdown open when the brand takes the user to the default module:
// each page renders its own TopBar instance.
let dropdownOpen = false;
const dropdownListeners = new Set<() => void>();
const subscribeDropdown = (listener: () => void) => {
  dropdownListeners.add(listener);
  return () => { dropdownListeners.delete(listener); };
};
function setDropdownOpen(next: boolean | ((previous: boolean) => boolean)) {
  dropdownOpen = typeof next === "function" ? next(dropdownOpen) : next;
  dropdownListeners.forEach(listener => listener());
}

export function TopBar({ account }: { account?: Account | null }) {
  useLanguage();
  const out = useSignOutAll();
  const open = useSyncExternalStore(subscribeDropdown, () => dropdownOpen, () => false);
  const setOpen = setDropdownOpen;
  const [, navigate] = useLocation();
  const btnRef = useRef<HTMLButtonElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const ready = !!(account && account.status === "active" && account.privacyAcknowledged);
  useEffect(() => {
    const onBack = () => setOpen(false);
    window.addEventListener("popstate", onBack);
    return () => window.removeEventListener("popstate", onBack);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btnRef.current?.focus(); } };
    const onDown = (e: PointerEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onDown); };
  }, [open]);
  const onBrand = () => {
    if (ready) {
      navigate("/user-portal");
      window.dispatchEvent(new CustomEvent("nitrocrop:open-home"));
    }
    setOpen(o => !o);
  };
  const close = () => setOpen(false);
  return (
    <header className="nc-topbar sticky top-0 z-30" data-nav-open={open ? "true" : "false"}>
      <div ref={wrapRef} className="nc-topbar-inner mx-auto max-w-6xl px-3 py-2 sm:px-4">
        <button
          ref={btnRef}
          type="button"
          onClick={onBrand}
          aria-expanded={open}
          aria-controls="nc-topnav"
          aria-haspopup="true"
          aria-label={`NitroCrop NDVI - ${open ? t("Chiudi il menu") : t("Apri il menu")}`}
          data-testid="button-brand-menu"
          className="nc-brand-btn"
        >
          <img src={taurusLogo} alt="" className="h-9 w-auto shrink-0 rounded-md bg-[#fff8ea] p-0.5" />
          <span className="nc-display truncate text-lg font-semibold">NitroCrop NDVI</span>
          <ChevronDown aria-hidden="true" className={`h-5 w-5 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
        <div className="hidden sm:block"><LanguageSelector /></div>
        {open && (
          <nav id="nc-topnav" aria-label="NitroCrop NDVI" className="nc-dropdown" data-testid="nav-dropdown">
            <NavItems account={account} ready={ready} out={out} close={close} />
          </nav>
        )}
      </div>
    </header>
  );
}

function NavItems({ account, ready, out, close }: { account?: Account | null; ready: boolean; out: () => Promise<void>; close: () => void }) {
  useLanguage();
  const items: { href: string; label: string; show: boolean; id: string }[] = [
    { href: "/user-portal", label: "Rilievo e Mappe", show: ready, id: "portal" },
    { href: "/user-portal?module=maps", label: "Elaborazioni e Mappe", show: ready, id: "maps" },
    { href: "/instructions", label: "Istruzioni", show: ready, id: "instructions" },
    { href: "/account", label: "Il mio account", show: !!account, id: "account" },
    { href: "/admin", label: "Amministrazione", show: account?.role === "admin" && account.status === "active", id: "admin" },
    { href: "/privacy", label: "Privacy", show: true, id: "privacy" },
  ];
  const [location] = useLocation();
  const isMaps = new URLSearchParams(useSearch()).get("module") === "maps";
  const current = (href: string) => {
    if (href === "/user-portal") return location === "/user-portal" && !isMaps;
    if (href === "/user-portal?module=maps") return location === "/user-portal" && isMaps;
    return location === href;
  };
  return (
    <ul className="flex flex-col gap-1">
      {items.filter(i => i.show).map(i => (
        <li key={i.id}>
          <Link href={i.href} onClick={close} aria-current={current(i.href) ? "page" : undefined} className="nc-dd-item" data-testid={`link-nav-${i.id}`}>{t(i.label)}</Link>
        </li>
      ))}
      <li><a href={`mailto:${TECHNICAL_SUPPORT_CONTACT}`} onClick={close} className="nc-dd-item" data-testid="link-nav-support">{t("Scrivi al supporto tecnico")}</a></li>
      <li className="nc-dd-sep px-3 py-2 sm:hidden"><LanguageSelector /></li>
      <li className="nc-dd-sep">
        <button type="button" onClick={() => { close(); void out(); }} className="nc-dd-item w-full text-left" data-testid="button-signout">{t("Esci")}</button>
      </li>
    </ul>
  );
}

export function fmtDate(s: string) {
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleString(getLocale(), { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Rome" });
}
