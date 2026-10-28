import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { itIT } from "@clerk/localizations";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Link, Redirect, Route, Switch, useLocation, Router as WouterRouter } from "wouter";
import App from "../App";
import "./security.css";
import { AccountGate } from "./Gate";
import { SubscriptionSummary } from "./SubscriptionSummary";
import { AccountPage } from "./AccountPage";
import { AdminPage } from "./AdminPage";
import { Activation, PrivacyPage, PublicFooter } from "./PublicPages";
import { Brand, Skeleton, SUPPORT_CONTACT, TopBar } from "./ui";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const queryClient = new QueryClient();

const txt = { color: "#18231c" };
const muted = { color: "#5d6a5f" };
const clerkAppearance = {
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#1f3d2b",
    colorForeground: "#18231c",
    colorMutedForeground: "#5d6a5f",
    colorDanger: "#a3352a",
    colorBackground: "#fbf8f1",
    colorInput: "#f4efe3",
    colorInputForeground: "#18231c",
    colorNeutral: "#3b4a3f",
    fontFamily: "system-ui, sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: { width: "100%", minWidth: 0, maxWidth: "100%", display: "flex", justifyContent: "center" },
    cardBox: { background: "#fbf8f1", borderRadius: "1.25rem", width: "440px", maxWidth: "calc(100vw - 2rem)", overflow: "hidden", border: "1px solid #d8cfba", boxShadow: "0 20px 50px -25px rgba(31,61,43,.45)" },
    card: { boxShadow: "none", border: 0, background: "transparent", borderRadius: 0 },
    footer: { boxShadow: "none", border: 0, background: "transparent", borderRadius: 0 },
    headerTitle: { ...txt, fontFamily: "Fraunces, Georgia, serif", fontSize: "1.6rem", fontWeight: 600 },
    headerSubtitle: muted,
    socialButtonsBlockButtonText: txt,
    formFieldLabel: { ...txt, fontWeight: 500 },
    footerActionLink: { color: "#a06a18", fontWeight: 600 },
    footerActionText: muted,
    dividerText: muted,
    identityPreviewEditButton: { color: "#1f3d2b" },
    formFieldSuccessText: { color: "#1f3d2b" },
    alertText: txt,
    logoBox: { height: "48px" },
    logoImage: { height: "48px" },
    socialButtonsBlockButton: { border: "1px solid #d8cfba" },
    formButtonPrimary: { background: "#1f3d2b", color: "#f4efe3", borderRadius: "999px", fontWeight: 600 },
    formFieldInput: { background: "#f4efe3", color: "#18231c", border: "1px solid #d8cfba" },
    footerAction: { padding: "0.5rem 0" },
    dividerLine: { background: "#d8cfba" },
    alert: { background: "#f7e3dc", border: "1px solid #e2b7aa" },
    otpCodeFieldInput: { color: "#18231c", border: "1px solid #d8cfba" },
    formFieldRow: { marginBottom: "0.25rem" },
    main: { gap: "1rem" },
  },
};

const localization = {
  ...itIT,
  signIn: {
    ...itIT.signIn,
    start: { ...itIT.signIn?.start, title: "Accedi a NitroCrop NDVI", subtitle: "Accesso riservato agli account approvati" },
  },
  signUp: {
    ...itIT.signUp,
    start: { ...itIT.signUp?.start, title: "Accetta il tuo invito", subtitle: "Scegli la password per il tuo account" },
  },
};

function AuthShell({ children, aside }: { children: React.ReactNode; aside: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] nc-contours">
      <header className="mx-auto max-w-6xl px-4 py-5"><Brand /></header>
      <main className="mx-auto grid w-full max-w-6xl grid-cols-1 items-start gap-10 px-4 py-6 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="nc-rise min-w-0 max-w-md pt-4">{aside}</div>
        <div className="nc-rise nc-d1 min-w-0">{children}</div>
      </main>
      <PublicFooter />
    </div>
  );
}

function SignInPage({ embedded = false }: { embedded?: boolean }) {
  return (
    <div className="min-h-[100dvh] nc-contours">
      <header className="mx-auto flex max-w-6xl justify-center px-4 py-5"><Brand /></header>
      <main className="mx-auto w-full max-w-[480px] px-4 pb-6">
        <h1 className="mb-5 text-center text-sm text-[var(--nc-muted)]">
          Supporto alla fertilizzazione azotata di grano e tabacco.
          <span className="mt-1 block">Accesso riservato agli utenti autorizzati dall’amministratore.</span>
        </h1>
        {embedded
          // Root is a public page, not a Clerk route prefix. Hash routing
          // preserves recovery steps without claiming /privacy etc.
          ? <SignIn routing="hash" signUpUrl={`${basePath}/sign-up`} fallbackRedirectUrl={`${basePath}/user-portal`} />
          : <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} fallbackRedirectUrl={`${basePath}/user-portal`} />}
        <div className="mt-5 space-y-3 text-center text-sm text-[var(--nc-muted)]">
          <p><Link href="/privacy" className="underline">Leggi l’informativa privacy e cookie</Link></p>
          <p>Password dimenticata? Usa il collegamento nel modulo per ricevere un codice via email.</p>
          <p>Assistenza per recupero e cambio password:<br />
            <a className="break-all underline" href={`mailto:${SUPPORT_CONTACT}`}>{SUPPORT_CONTACT}</a>
          </p>
        </div>
        <Activation />
      </main>
      <PublicFooter />
    </div>
  );
}

const INVITE_KEY = "nc-invite-flow";

function SignUpPage() {
  const hasTicket = new URLSearchParams(window.location.search).has("__clerk_ticket");
  let inFlow = hasTicket;
  try {
    if (hasTicket) sessionStorage.setItem(INVITE_KEY, "1");
    inFlow ||= sessionStorage.getItem(INVITE_KEY) === "1";
  } catch {
    // The API still enforces administrator authorization if browser storage is unavailable.
  }

  if (!inFlow) {
    return (
      <AuthShell aside={null}>
        <div className="w-[440px] max-w-full rounded-2xl border border-[var(--nc-line)] bg-[#fbf8f1] p-7">
          <p className="nc-mono text-xs uppercase tracking-[0.18em] text-[var(--nc-wheat)]">Solo su invito</p>
          <h1 className="nc-display mt-2 text-3xl font-semibold text-[var(--nc-leaf)]">La registrazione libera non è disponibile</h1>
          <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm text-[var(--nc-ink)]/85">
            <li>Chiedi all'amministratore di autorizzare il tuo indirizzo email.</li>
            <li>Apri il link nell'email di invito ricevuta: ti porterà qui. Il link vale 7 giorni.</li>
            <li>Scegli la tua password e conferma la presa visione dell'informativa.</li>
          </ol>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/sign-in" className="rounded-full bg-[var(--nc-leaf)] px-5 py-2.5 text-sm font-semibold text-[var(--nc-paper)]">Ho già un account</Link>
            <Link href="/" className="rounded-full border border-[var(--nc-line)] px-5 py-2.5 text-sm font-semibold text-[var(--nc-leaf)]">Torna alla home</Link>
          </div>
        </div>
      </AuthShell>
    );
  }
  return (
    <AuthShell aside={
      <>
        <p className="nc-mono text-xs uppercase tracking-[0.18em] text-[var(--nc-wheat)]">Invito</p>
        <h1 className="nc-display mt-3 text-4xl font-semibold text-[var(--nc-leaf)]">Il tuo accesso è stato approvato.</h1>
        <p className="mt-4 text-[var(--nc-muted)]">Scegli una password personale. Nessuno, nemmeno l'amministratore, la conoscerà.</p>
      </>
    }>
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} fallbackRedirectUrl={`${basePath}/user-portal`} />
    </AuthShell>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      try { if (userId) sessionStorage.removeItem(INVITE_KEY); } catch { /* optional browser storage */ }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function HomeRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <div className="mx-auto max-w-3xl px-4 py-20"><Skeleton rows={4} /></div>;
  if (isSignedIn) return <Redirect to="/user-portal" />;
  return <SignInPage embedded />;
}

function Portal() {
  return (
    <AccountGate>
      {account => (
        <div className="min-h-[100dvh]">
          <TopBar account={account} />
          <div className="mx-auto max-w-6xl px-4 py-3"><SubscriptionSummary account={account} /></div>
          <App key={account.id} storageScope={account.id} migrateLegacySettings={account.role === "admin"} />
        </div>
      )}
    </AccountGate>
  );
}

function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="nc-display text-5xl font-semibold text-[var(--nc-leaf)]">Pagina non trovata</h1>
      <Link href="/" className="mt-6 inline-block underline">Torna alla home</Link>
    </div>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={localization}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?"><SignInPage /></Route>
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route path="/user-portal" component={Portal} />
          <Route path="/account">
            <AccountGate requireAck={false} requireSubscription={false}>{a => <AccountPage key={a.id} account={a} />}</AccountGate>
          </Route>
          <Route path="/admin">
            <AccountGate requireAdmin>{a => <AdminPage key={a.id} account={a} />}</AccountGate>
          </Route>
          <Route path="/privacy" component={PrivacyPage} />
          <Route component={NotFound} />
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function SecurityRoot() {
  return (
    <div className="nc-sec min-h-[100dvh]">
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
    </div>
  );
}

export default SecurityRoot;
