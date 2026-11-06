import { createRoot } from "react-dom/client";
import { Link } from "wouter";
import { LanguageSelector } from "../src/i18n/LanguageSelector";
import { setLanguage, t, useLanguage } from "../src/i18n/runtime";
import { observations } from "./fixtures/idw";
import "../src/index.css";
import "../src/security/security.css";

// This entry is not part of the production build. No auth bypass or test
// identity is added to the application, and no observation API is contacted.
if (!import.meta.env.DEV) throw new Error("Synthetic IDW harness is development-only.");

const incomplete = new URLSearchParams(location.search).has("incomplete");
const initialLanguage = new URLSearchParams(location.search).get("lang");
if (initialLanguage === "it" || initialLanguage === "en" || initialLanguage === "es") {
  setLanguage(initialLanguage);
}
const fixture = observations.map((o, i) =>
  incomplete && i === 0 ? { ...o, azotoTotale: null } : o,
);
window.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input), location.href);
  const method = init?.method ?? (input instanceof Request ? input.method : "GET");
  if (url.origin === location.origin && url.pathname === "/api/osservazioni" && method === "GET") {
    return Response.json(fixture);
  }
  // Fail explicitly rather than accidentally reaching real data or a write API.
  throw new Error(`Network disabled in synthetic IDW harness: ${method} ${url.pathname}`);
};

const { default: App } = await import("../src/App");
function SyntheticApp() {
  const language = useLanguage();
  return (
  <>
    <header className="flex flex-wrap items-center justify-between gap-3 bg-amber-100 p-4">
      <strong>{language === "it" ? "QA — solo GPS sintetici" : language === "en" ? "QA — synthetic GPS only" : "QA — solo GPS sintéticos"}</strong>
      <LanguageSelector />
      <nav className="flex gap-4">
        <Link href={`?module=maps${incomplete ? "&incomplete" : ""}`}>{t("Elaborazioni e Mappe")}</Link>
        <Link href={`?module=survey${incomplete ? "&incomplete" : ""}`}>{t("Rilievo e dati")}</Link>
      </nav>
    </header>
    <App storageScope="qa-idw-synthetic-only" />
  </>
  );
}
createRoot(document.getElementById("root")!).render(<SyntheticApp />);
