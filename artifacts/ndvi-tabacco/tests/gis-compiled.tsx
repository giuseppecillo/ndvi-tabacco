// Separate test-build entry, never an input to the application build.
// No authentication component, identity, API connection or real observations.
import { createRoot } from "react-dom/client";
import { LanguageSelector } from "../src/i18n/LanguageSelector";
import { setLanguage } from "../src/i18n/runtime";
import { observations } from "./fixtures/idw";
import "../src/index.css";
import "../src/security/security.css";

setLanguage("it");
window.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input), location.href);
  const method = init?.method ?? (input instanceof Request ? input.method : "GET");
  if (url.origin === location.origin && url.pathname === "/api/osservazioni" && method === "GET") {
    return Response.json(observations);
  }
  throw new Error(`Network disabled in compiled GIS harness: ${method} ${url.pathname}`);
};
const { default: App } = await import("../src/App");
createRoot(document.getElementById("root")!).render(
  <>
    <header><strong>QA — solo GPS sintetici</strong><LanguageSelector /></header>
    <App storageScope="qa-gis-compiled-synthetic-only" />
  </>,
);
