import type { ReactNode } from "react";
import { Link } from "wouter";
import { useGetAccessSetup, useSendAdministratorActivation } from "@workspace/api-client-react";
import { Brand, Btn, Card, ErrorNote, Eyebrow, OkNote, PRIVACY_CONTACT, SUPPORT_CONTACT, TECHNICAL_SUPPORT_CONTACT, taurusLogo } from "./ui";
import { LanguageSelector } from "../i18n/LanguageSelector";

function PublicHeader() {
  return (
    <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5">
      <Brand />
      <nav className="flex items-center gap-2">
        <LanguageSelector />
        <Link href="/privacy" className="hidden sm:inline rounded-full px-3 py-1.5 text-sm text-[var(--nc-leaf)] hover:bg-[var(--nc-paper-2)]">Privacy</Link>
        <Link href="/sign-in" className="rounded-full bg-[var(--nc-leaf)] px-4 py-2 text-sm font-semibold text-[var(--nc-paper)] hover:bg-[var(--nc-leaf-2)]">Accedi</Link>
      </nav>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="mt-20 border-t border-[var(--nc-line)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-[var(--nc-muted)] sm:flex-row sm:justify-between">
        <span>Taurus Agriculture Solution SRL</span>
        <span className="flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/privacy" className="underline">Informativa privacy e cookie</Link>
          <a href={`mailto:${PRIVACY_CONTACT}`} className="underline">{PRIVACY_CONTACT}</a>
          <a href={`mailto:${TECHNICAL_SUPPORT_CONTACT}`} className="break-all underline">Supporto tecnico: {TECHNICAL_SUPPORT_CONTACT}</a>
        </span>
      </div>
    </footer>
  );
}

export function Activation() {
  const setup = useGetAccessSetup();
  const send = useSendAdministratorActivation();
  if (setup.isPending || setup.isError || !setup.data?.activationAvailable) return null;
  return (
    <Card className="nc-rise nc-d4 mt-10 border-[var(--nc-wheat)]/50 bg-[var(--nc-wheat-soft)]">
      <Eyebrow>Prima configurazione</Eyebrow>
      <h3 className="nc-display mt-1 text-xl font-semibold">Attivazione dell'amministratore</h3>
      <p className="mt-2 text-sm text-[var(--nc-muted)]">
        Nessun amministratore ha ancora attivato l'accesso. Il pulsante invia un invito solo all'indirizzo amministratore
        configurato sul server: nessun altro può ricevere questo invito.
      </p>
      <div className="mt-4 space-y-3">
        <Btn variant="primary" disabled={send.isPending || send.isSuccess} onClick={() => send.mutate()}>
          {send.isPending ? "Invio in corso..." : send.isSuccess ? "Richiesta inviata" : "Invia invito all'amministratore"}
        </Btn>
        {send.isSuccess && <OkNote>{send.data.message}</OkNote>}
        {send.isError && <ErrorNote error={send.error} />}
      </div>
    </Card>
  );
}

export function Landing() {
  const steps = [
    ["01", "Invito dall'amministratore", "Non esiste registrazione libera. Solo l'amministratore crea gli account e invia l'invito via email."],
    ["02", "Scegli la tua password", "Dal link di invito imposti tu la password. L'amministratore non la conosce mai."],
    ["03", "Presa visione privacy", "Al primo accesso confermi di aver letto l'informativa. Poi i tuoi campi sono tuoi."],
  ];
  return (
    <div className="min-h-[100dvh] nc-contours">
      <PublicHeader />
      <main className="mx-auto max-w-6xl px-4">
        <section className="grid gap-10 pt-10 md:grid-cols-[1.3fr_1fr] md:items-end md:pt-20">
          <div>
            <p className="nc-rise nc-mono text-xs uppercase tracking-[0.2em] text-[var(--nc-wheat)]">Tabacco · Grano duro · Accesso riservato</p>
            <h1 className="nc-rise nc-d1 nc-display mt-4 text-5xl font-semibold leading-[1.02] text-[var(--nc-leaf)] md:text-7xl">
              Le tue misure di campo restano <em className="text-[var(--nc-wheat)]">tue.</em>
            </h1>
            <p className="nc-rise nc-d2 mt-6 max-w-xl text-lg leading-relaxed text-[var(--nc-muted)]">
              NitroCrop NDVI supporta la fertilizzazione azotata a partire da letture NDVI e punti GPS. Ogni account è
              approvato dall'amministratore e ogni utente vede soltanto le proprie osservazioni.
            </p>
            <div className="nc-rise nc-d3 mt-8 flex flex-wrap gap-3">
              <Link href="/sign-in" className="rounded-full bg-[var(--nc-leaf)] px-6 py-3 font-semibold text-[var(--nc-paper)] hover:bg-[var(--nc-leaf-2)]">Accedi al tuo account</Link>
              <Link href="/sign-up" className="rounded-full border border-[var(--nc-line)] px-6 py-3 font-semibold text-[var(--nc-leaf)] hover:bg-[var(--nc-paper-2)]">Ho ricevuto un invito</Link>
            </div>
          </div>
          <div className="nc-rise nc-d2 rounded-3xl bg-[var(--nc-leaf)] p-8 text-[var(--nc-paper)]">
            <img src={taurusLogo} alt="Taurus Agriculture Solution" className="h-20 w-auto rounded-lg bg-[var(--nc-paper)] p-2" />
            <p className="nc-mono mt-6 text-xs uppercase tracking-[0.18em] text-[var(--nc-sage)]">Cosa proteggiamo</p>
            <ul className="mt-3 space-y-3 text-sm leading-relaxed">
              <li className="border-t border-white/15 pt-3">Coordinate GPS dei rilievi e perimetri di campo</li>
              <li className="border-t border-white/15 pt-3">Valori NDVI, fasi colturali e piani di concimazione</li>
              <li className="border-t border-white/15 pt-3">Dati anagrafici e di cliente associati ai rilievi</li>
            </ul>
          </div>
        </section>

        <section className="mt-24 grid gap-6 md:grid-cols-[1fr_2fr]">
          <h2 className="nc-display text-3xl font-semibold text-[var(--nc-leaf)]">Come si entra</h2>
          <ol className="divide-y divide-[var(--nc-line)] border-y border-[var(--nc-line)]">
            {steps.map(([n, t, d]) => (
              <li key={n} className="grid grid-cols-[3rem_1fr] gap-4 py-5">
                <span className="nc-mono text-sm text-[var(--nc-wheat)]">{n}</span>
                <div><p className="font-semibold">{t}</p><p className="mt-1 text-sm text-[var(--nc-muted)]">{d}</p></div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-16 grid gap-6 md:grid-cols-2">
          <Card>
            <h3 className="nc-display text-xl font-semibold">Password dimenticata?</h3>
            <p className="mt-2 text-sm text-[var(--nc-muted)]">Dalla pagina di accesso scegli "Password dimenticata" e ricevi un codice via email. Per assistenza scrivi a <a className="underline" href={`mailto:${SUPPORT_CONTACT}`}>{SUPPORT_CONTACT}</a>.</p>
          </Card>
          <Card>
            <h3 className="nc-display text-xl font-semibold">Vuoi un account?</h3>
            <p className="mt-2 text-sm text-[var(--nc-muted)]">Chiedi all'amministratore della tua azienda o al tuo agronomo Taurus di inviarti un invito. Non è possibile registrarsi autonomamente.</p>
          </Card>
        </section>
        <Activation />
      </main>
      <PublicFooter />
    </div>
  );
}

function Sec({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 border-t border-[var(--nc-line)] py-8 md:grid-cols-[4rem_1fr]">
      <span className="nc-mono text-sm text-[var(--nc-wheat)]">{n}</span>
      <div>
        <h2 className="nc-display text-2xl font-semibold text-[var(--nc-leaf)]">{title}</h2>
        <div className="mt-3 space-y-3 leading-relaxed text-[var(--nc-ink)]/85">{children}</div>
      </div>
    </section>
  );
}

export function PrivacyPage() {
  return (
    <div className="min-h-[100dvh]">
      <PublicHeader />
      <main className="mx-auto max-w-4xl px-4 pb-10">
        <div role="note" className="nc-rise mt-6 rounded-2xl border-2 border-[var(--nc-wheat)] bg-[var(--nc-wheat-soft)] p-5">
          <p className="nc-mono text-xs uppercase tracking-[0.18em] text-[#8a5a12]">Bozza</p>
          <p className="nc-display mt-1 text-2xl font-semibold">Informativa da completare e validare prima della pubblicazione</p>
          <p className="mt-2 text-sm">Il titolare deve ancora definire: sede legale, tempi di conservazione concreti per ciascuna categoria di dati, accordi con i responsabili del trattamento (art. 28 GDPR) ed eventuali trasferimenti extra UE con relative garanzie. Questo testo non costituisce certificazione di conformità.</p>
        </div>
        <h1 className="nc-display nc-rise nc-d1 mt-10 text-4xl font-semibold text-[var(--nc-leaf)] md:text-5xl">Informativa privacy e cookie</h1>
        <p className="mt-3 text-[var(--nc-muted)]">NitroCrop NDVI, ai sensi degli artt. 13-14 del Regolamento UE 2016/679.</p>
        <div className="mt-8">
          <Sec n="01" title="Titolare del trattamento">
            <p>Taurus Agriculture Solution SRL. Sede legale: <strong>da completare</strong>. Contatto privacy: <a className="underline" href={`mailto:${PRIVACY_CONTACT}`}>{PRIVACY_CONTACT}</a>.</p>
          </Sec>
          <Sec n="02" title="Dati trattati">
            <ul className="list-disc pl-5 space-y-1">
              <li>Dati di account: indirizzo email e nome.</li>
              <li>Dati di cliente inseriti nei rilievi (ad esempio azienda, appezzamento, coltura).</li>
              <li>Osservazioni di campo: coordinate GPS, valori NDVI, date e parametri agronomici. La posizione viene acquisita solo se autorizzata nel browser; puoi salvare anche senza GPS.</li>
              <li>Log di autenticazione, sessione e sicurezza (accessi, azioni amministrative).</li>
            </ul>
          </Sec>
          <Sec n="03" title="Finalità e basi giuridiche">
            <p>Erogazione del servizio richiesto ed esecuzione del contratto (art. 6.1.b): gestione account e calcoli agronomici.</p>
            <p>Legittimo interesse alla sicurezza del servizio (art. 6.1.f): log di accesso e audit, prevenzione abusi.</p>
            <p>Non chiediamo un consenso generalizzato. La casella "Ho letto" al primo accesso registra solo la presa visione della versione corrente di questa informativa e non è un consenso per marketing.</p>
          </Sec>
          <Sec n="04" title="Cookie e archiviazione locale">
            <p>L’app non aggiunge strumenti di profilazione o marketing: utilizza cookie di autenticazione e sessione e memoria locale per le impostazioni tecniche, separate per account. I servizi esterni possono utilizzare propri meccanismi di sicurezza; la relativa verifica va completata dal titolare.</p>
          </Sec>
          <Sec n="05" title="Servizi esterni">
            <p>Clerk per l'autenticazione; Replit per l'hosting dell'applicazione e del database; fornitori di tessere satellitari/cartografiche, che ricevono dal browser le richieste delle porzioni di mappa visualizzate. Accordi di nomina e trasferimenti extra UE: <strong>da completare</strong>.</p>
          </Sec>
          <Sec n="06" title="Conservazione">
            <p>Tempi di conservazione per ciascuna categoria: <strong>da definire a cura del titolare</strong>. La cancellazione dell’account elimina anche i rilievi dai sistemi attivi. Gli eventuali backup e i dati tecnici dei fornitori seguono le loro politiche di conservazione, che il titolare deve verificare e documentare.</p>
          </Sec>
          <Sec n="07" title="I tuoi diritti">
            <p>Puoi chiedere accesso, esportazione, rettifica, limitazione, opposizione e cancellazione. Dalla pagina "Il mio account" scarichi i tuoi dati in formato JSON e invii richieste tracciate. Puoi anche scrivere a {PRIVACY_CONTACT}.</p>
            <p>La copia JSON contiene i dati applicativi; per la copia completa dei dati di identità e sicurezza gestiti dal fornitore di autenticazione contatta il titolare. Le richieste sono valutate entro un mese, salvo proroghe motivate previste dal GDPR. La cancellazione non è automatica al semplice invio della richiesta.</p>
            <p>Hai diritto di proporre reclamo al Garante per la protezione dei dati personali (garanteprivacy.it).</p>
          </Sec>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
