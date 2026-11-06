# Preparazione INATTIVA PostgreSQL → Supabase

## Verifica successiva autorizzata

La lettura dei soli metadati di sviluppo e produzione è stata successivamente
autorizzata. Risultati, differenze rispetto alle bozze e limiti sono in
[SCHEMA_VALIDATION.md](SCHEMA_VALIDATION.md). Non sono stati letti record né
eseguite scritture, backup, restore o attivazioni. Le indicazioni sotto sulla
preparazione originaria restano riferite a quella fase.

## Ambito autorizzato

L'app resta sviluppata, eseguita e pubblicata su **Replit**. Clerk resta quello
attuale. Netlify è fuori ambito. Riferimento GitHub prima della preparazione:
`baa1953` sul ramo `main`.

Questi file non sono collegati all'avvio, al build, a Drizzle Kit, al post-merge o
alla pubblicazione. Non è presente un comando che applica le migrazioni. Nessun
database è stato interrogato per realizzarli. Le migrazioni sono bozze derivate
dal codice, non certificazioni dello schema attualmente installato.

## Percorsi esistenti lasciati invariati

| Punto attuale | Sostituzione preparata / futura |
|---|---|
| `lib/db/package.json`: push, push-force e push-deployment | Rimuovere i push automatici al cutover autorizzato; usare SQL revisionato, ordinato e con checksum. Non aggiungere un'applicazione SQL al build o alla pubblicazione. |
| `scripts/post-merge.sh`: push-deployment | Rimuovere il push nel medesimo intervento autorizzato, mantenendo installazione dipendenze e sola verifica dello schema. |
| `artifacts/api-server/src/index.ts`: initializeSecurity | Sostituire con controlli di lettura, controllo completo dei privilegi e compatibilità dello schema. |
| `artifacts/api-server/src/lib/security-db.ts`: DDL, backfill, bootstrap | Schema versionato, eventuali riparazioni dati separate e approvate. Conservare l'audit applicativo e PRIVACY_VERSION. |
| Due pool distinti: API e `@workspace/db` | Usare una configurazione coerente pg/Drizzle con il ruolo della destinazione, senza credenziali privilegiate nel runtime. |

Non sono rimossi ora: questa è la preparazione inattiva confermata dal titolare.
Non presentarla come una protezione già attiva sui database correnti.

## Configurazione futura pg e Drizzle

`src/migration-preparation/connection.ts` costruisce soltanto un `PoolConfig`, senza
leggere variabili d'ambiente e senza aprire connessioni. Non è esportato dal
normale pacchetto né importato dai pool esistenti. In futuro lo stesso risultato
può essere passato a `new pg.Pool(config)` e poi a `drizzle(pool, { schema })`.
Nessuna libreria sostituita e nessuna dipendenza aggiunta.

- Runtime pubblicato Replit: `app_runtime`.
- Controlli di sviluppo: `app_readonly`. Una preview così configurata non può
  salvare rilievi, accettare privacy, collegare nuovi account o gestire utenti.
- Migrazioni esterne autorizzate: `app_migrator`, credenziale fuori dallo sviluppo
  ordinario; approvazione esplicita per il singolo intervento.
- Host esatto approvato, database esplicito, ruolo URL atteso; i pooler Supabase
  possono richiedere `ruolo.projectRef`.
- TLS con verifica del certificato; CA attendibile se necessaria. Mai
  `rejectUnauthorized:false`. Parametri URL non autorizzati rifiutati.
- Pool piccolo e timeout; verificare endpoint diretto/session/transaction pooler,
  disponibilità IPv4/IPv6 e limiti del piano prima di scegliere.
- Non usare named prepared statements con un transaction pooler senza supporto
  verificato. Nessun contesto utente persistente sulla sessione riutilizzata.
- Il controllo sul nome nella URL non basta: verificare `current_user`,
  `session_user`, proprietà oggetti, membership anche transitiva, privilegi
  effettivi, funzioni eseguibili, sequenze, viste, RLS e grants PUBLIC.
- `assertOrdinaryRole` respinge ruoli privilegiati o ispezioni incomplete.
  L'adattatore che costruisce l'ispezione PostgreSQL NON è ancora integrato:
  non attivare il runtime senza implementarlo e provarlo.
- `inspectPreparedStartup` controlla tabelle e amministratore già esistente con
  sole SELECT. Non crea account né modifica identificativi. Va completato con il
  confronto dello schema e dei vincoli prima del cutover.

Non cambiare DATABASE_URL ora. Non usare password, token Supabase service_role,
chiavi amministrative o URL nel repository, nelle CLI o nei log. Al cutover
controllare anche script setup-admin, test:access, retention, integrazioni
amministrative e accessi API che potrebbero scrivere fuori dal pool principale.

## Migrazioni versionate

`manifest.json` elenca ordine, checksum e requisiti delle bozze. Non contiene
credenziali. Il test offline ne verifica l'integrità; NON esegue SQL.

1. `0001_empty_target_baseline.sql`: crea le cinque tabelle applicative su un
   target vuoto, con tipi, riferimenti e indice derivati dalle sorgenti. NON
   eseguirla sopra un restore completo o su database esistenti. Il guardiano
   rifiuta tabelle applicative già presenti.
2. `0002_legacy_display_ids.sql`: backfill opzionale e separatamente autorizzato
   degli ID visualizzati mancanti; non cambia utenti, proprietari o abbonamenti.
   Dopo un restore fedele non applicarla per abitudine: prima confrontare i dati.

**Inizializzazione dati**: migrare app_users, security_state e tutti gli ID
esistenti dal backup. Non rigenerare l'amministratore, non ricalcolare scadenze,
non riassegnare osservazioni. Non è incluso un seed automatico. Per un database
nuovo senza dati importati serve una decisione distinta sull'account iniziale.

Al cutover scegliere UNA strategia: restore completo revisionato oppure schema
baseline verificato + import dati. Non combinarle. Preparare poi una tabella
ledger dedicata con versione, checksum e data di applicazione; riconoscere la
baseline del restore soltanto dopo confronto positivo. Non segnare una
migrazione come applicata solo perché una tabella esiste. Runner e ledger non
sono collegati né eseguiti in questa fase.

## Ruoli: bozza, NON hardening già completato

`roles.sql` definisce i tre ruoli come **NOLOGIN**, senza password, e grants
espliciti sulle tabelle. Un'esecuzione non autorizza ancora il collegamento.
Non sostituisce i ruoli tecnici Supabase. Non concede superuser, BYPASSRLS,
CREATEROLE, CREATEDB o membership nel migrator ai ruoli ordinari.

Prima dell'attivazione occorre:

1. Riconciliare grants PUBLIC, schemi, owner, funzioni e viste preesistenti;
   NOINHERIT da solo non impedisce SET ROLE. Controllare membership transitiva.
2. Far possedere gli oggetti applicativi al migrator con una mappatura
   autorizzata del restore; nessuna proprietà degli oggetti a runtime/readonly.
3. Definire le credenziali LOGIN attraverso il sistema sicuro, fuori dal codice.
4. Valutare viste oscurate per readonly: la sola lettura non elimina il rischio
   di esposizione di dati personali. Non concedere accesso a tutti i futuri
   oggetti per default.
5. Verificare e limitare funzioni SECURITY DEFINER e qualunque funzione con
   effetti collaterali. Revocare EXECUTE da PUBLIC richiede valutazione degli
   altri consumatori; non revocare indiscriminatamente servizi Supabase.
6. Non esporre tabelle applicative via Data API con grants anon/authenticated
   involontari. Conservare l'isolamento utenti nel backend. Se si introduce RLS,
   progettarla per identità Clerk e contesto server verificato, non presumere
   auth.uid() compatibile con gli ID Clerk testuali.
7. Impedire credenziali amministrative nello sviluppo, nelle anteprime e nel
   runtime. Un ruolo SQL readonly non impedisce scritture tramite un'API live
   con credenziali utente autorizzate.

## Collaudo consentito ora

Solo test puri, mock di client query, integrità dei file e typecheck. Non eseguire
test:access, setup:admin, startup dell'API o qualsiasi script che si colleghi ai
database per preparare questi materiali.

Comandi offline, dalla radice del repository:

```sh
pnpm --filter @workspace/api-server exec esbuild ../../lib/db/src/migration-preparation/preparation.test.ts --bundle --platform=node --format=cjs --outfile=/tmp/nitrocrop-db-preparation.test.cjs
node --test /tmp/nitrocrop-db-preparation.test.cjs
pnpm run typecheck:libs
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/ndvi-tabacco run typecheck
git diff --check
```

Il test di regressione dei percorsi attivi usa il commit di riferimento di questa
preparazione; al cutover andrà aggiornato consapevolmente, non aggirato.

Le prove reali di INSERT/UPDATE/DELETE, RLS, DDL negato, funzioni mutanti e
salvataggi richiedono successiva autorizzazione e un ambiente isolato: non basta
ROLLBACK su produzione, perché sequenze, notifiche o servizi esterni possono
avere effetti non annullabili. Restando a tre ruoli e un solo Supabase,
non promettere una preview scrivibile isolata: accesso QA aggiuntivo o database
temporaneo richiedono approvazione separata.

## Attivazione: autorizzazioni ancora necessarie

Creazione progetto Supabase/regione; ispezione read-only di sviluppo E produzione
Replit; backup; restore di prova; grants/LOGIN e proprietà; eventuali riparazioni;
runner/ledger; rimozione effettiva automatismi e bootstrap; cambio credenziali
runtime/sviluppo; qualsiasi riavvio o pubblicazione associato al cutover.
Non riutilizzare accidentalmente dati Development per sostituire Production.
Clerk resta invariato e non occorre risolvere la sua portabilità fuori Replit.
