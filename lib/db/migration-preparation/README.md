# Preparazione INATTIVA PostgreSQL → Supabase

## Catalogo selezionato — preparazione separata

La [preparazione persistente del catalogo](catalogue/README.md) propone uno schema
dedicato, release vincolata agli hash, applicazione/verifica idempotenti e rollback
dei soli record della release. Non fa parte della baseline o del manifest delle
migrazioni; non è collegata ad avvio/post-merge e non è stata applicata al target.
Non modifica rilievi, account, storico, connessioni o Clerk.

## Punto 3: programma preparato, esecuzione non autorizzata

Il [programma del backup verificabile](../../../docs/migrazione-punto-3.md)
definisce i permessi ancora necessari e i passaggi manuali su postazione
controllata dal titolare. Nessuna lettura di dati/credenziali, esportazione,
connessione o prova di restore è stata eseguita per prepararlo.
La destinazione futura è soltanto il progetto Agri Precision già esistente:
nessun secondo database/progetto, neppure temporaneo. I collaudi locali
descritti sotto sono storici, non una deroga per il punto 3.

## Aggiornamento: punto 2 autorizzato

Le migrazioni e il collegamento a Supabase restano inattivi. È stata invece
autorizzata e applicata la rimozione degli automatismi dal codice API e dal
post-merge: l'avvio ora verifica lo schema in sola lettura e non lo ripara.
Esiti, checkpoint Git e limite del Publish gestito Replit sono documentati in
[`docs/migrazione-punto-2.md`](../../../docs/migrazione-punto-2.md).
Le sezioni sotto descrivono anche la preparazione storica, non una nuova
autorizzazione a importare dati o applicare SQL.

## Verifica successiva autorizzata

La lettura dei soli metadati di sviluppo e produzione è stata successivamente
autorizzata. Risultati, differenze rispetto alle bozze e limiti sono in
[SCHEMA_VALIDATION.md](SCHEMA_VALIDATION.md). Non sono stati letti record né
eseguite scritture, backup, restore o attivazioni. Le indicazioni sotto sulla
preparazione originaria restano riferite a quella fase.

Successivamente è stato autorizzato il collaudo con soli dati sintetici su un
cluster PostgreSQL locale nuovo e temporaneo, senza credenziali o connessioni
esterne. Rapporto ed esecuzione riproducibile:
[SYNTHETIC_TEST_REPORT.md](SYNTHETIC_TEST_REPORT.md).
Le scritture di quel collaudo riguardano esclusivamente il cluster usa e getta;
nessuna attivazione o modifica dei database esistenti è stata autorizzata.

## Ambito autorizzato

L'app resta sviluppata, eseguita e pubblicata su **Replit**. Clerk resta quello
attuale. Netlify è fuori ambito. Riferimento GitHub prima della preparazione:
`baa1953` sul ramo `main`.

Questi file non sono collegati all'avvio, al build, a Drizzle Kit, al post-merge o
alla pubblicazione. Non è presente un comando che applica le migrazioni. Nessun
database è stato interrogato per realizzarli. Le migrazioni sono bozze derivate
dal codice, non certificazioni dello schema attualmente installato.

## Percorsi individuati e stato dopo il punto 2

| Percorso | Stato |
|---|---|
| `lib/db/package.json`: push, push-force e push-deployment | Soli comandi manuali; nessun richiamo automatico. Non eseguiti. |
| `scripts/post-merge.sh` | Push rimosso; sola installazione frozen-lockfile. Il riavvio workflow verifica lo schema senza scritture. |
| `artifacts/api-server/src/index.ts` | Verifica protetta di sola lettura prima di listen; initializeSecurity rimosso. |
| `artifacts/api-server/src/lib/security-db.ts` | DDL, backfill e bootstrap rimossi; audit applicativo e PRIVACY_VERSION invariati. |
| Due pool distinti: API e `@workspace/db` | Usare una configurazione coerente pg/Drizzle con il ruolo della destinazione, senza credenziali privilegiate nel runtime. |

La configurazione dei nuovi ruoli/pool Supabase resta inattiva. Non presentare
la sola rimozione degli automatismi come isolamento assoluto delle credenziali
del workspace o come disattivazione del meccanismo interno Replit Publish.

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
  `privileges.ts` costruisce ora l'ispezione dai cataloghi, collaudata sul cluster
  locale sintetico. È ancora INATTIVA e NON integrata nei pool: prima di attivarla
  occorre provarla sul target Supabase autorizzato e revisionare gli oggetti
  specifici del provider, le funzioni, il pooler e i controlli RLS/Data API.
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

## Collaudo originario e successiva estensione autorizzata

La preparazione originaria comprendeva solo test puri, mock di client query,
integrità dei file e typecheck. L'autorizzazione successiva consente inoltre:

```sh
bash lib/db/migration-preparation/tests/run-isolated.sh
```

Lo script usa i binari PostgreSQL già presenti, un ambiente ripulito e un nuovo
cluster in `/tmp/nitrocrop-synthetic.*`, solo socket privato, senza rete né
password. Alla fine ferma il server e rimuove il cluster. Non passa da workflow,
Drizzle o connessioni dell'app. Non eseguire
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

Le prove con dati sintetici di INSERT/UPDATE/DELETE, DDL negato e funzioni mutanti
sono state eseguite nell'istanza locale; non sono un test Supabase/RLS o del
salvataggio end-to-end dell'app. Prove su Supabase richiedono successiva
autorizzazione e un ambiente isolato: non basta
ROLLBACK su produzione, perché sequenze, notifiche o servizi esterni possono
avere effetti non annullabili. Restando a tre ruoli e un solo Supabase,
non promettere una preview scrivibile isolata: accesso QA aggiuntivo o database
temporaneo richiedono approvazione separata.

## Attivazione: autorizzazioni ancora necessarie

Creazione progetto Supabase/regione; ulteriori letture oltre ai metadati già
autorizzati; backup; restore di prova; grants/LOGIN e proprietà sul target;
eventuali riparazioni;
runner/ledger; rimozione effettiva automatismi e bootstrap; cambio credenziali
runtime/sviluppo; qualsiasi riavvio o pubblicazione associato al cutover.
Non riutilizzare accidentalmente dati Development per sostituire Production.
Clerk resta invariato e non occorre risolvere la sua portabilità fuori Replit.
