# Connessioni dei moduli: mappa e piano di verifica

## Perimetro e stato

Ricognizione del 10 novembre 2026: lettura del codice e dei soli parametri
nominali. Nessun valore di Secret letto, nessuna connessione SQL aperta,
nessun dato applicativo letto o scritto, nessuna modifica di configurazione,
schema, ruoli, identità Clerk o pubblicazione. Nessuno script operativo eseguito.

**Il titolare ha autorizzato esclusivamente il confronto in sola lettura.
L'esecuzione è bloccata in assenza di un canale Production conforme verificato.
L'allineamento non è completato.** Questa mappa riguarda il codice nel workspace:
la corrispondenza con la revisione pubblicata non è ancora accertata.

## Due percorsi distinti

- **Centrale:** `lib/db/src/index.ts` costruisce il pool con
  `runtime-connection-config.ts`. `NITROCROP_DB_BACKEND=replit` (anche default)
  seleziona `DATABASE_URL`; `supabase` seleziona
  `NITROCROP_RUNTIME_DATABASE_URL`, imponendo destinazione e ruolo runtime
  previsti e TLS verificato. Non ripiega sul pool storico.
- **Storico:** `artifacts/api-server/src/lib/db.ts` costruisce un altro pool
  direttamente da `DATABASE_URL`, ignorando `NITROCROP_DB_BACKEND`.
  Il codice da solo non identifica il database a cui punta quel Secret.
- **Diagnostico separato:** `verifyProductionRuntimePreflight` può aprire un
  terzo pool temporaneo Supabase quando esplicitamente attivato e con backend
  Replit. Non modifica né certifica il pool storico.

Configurazione nominale osservata:

| Fonte | Backend | Preflight separato | Pausa migrazione |
|---|---|---|---|
| `.replit`, sezione `userenv.production` | `supabase` | `0` | `0` |
| Metadati variabili Production | `supabase` | `0` | `0` |
| Metadati variabili Development | nessuna voce restituita | nessuna voce restituita | nessuna voce restituita |

L'assenza di voci nella vista Development non prova l'assenza nell'ambiente
effettivo del processo. Queste letture non attestano la revisione LIVE, il
contenuto dei Secrets o l'identità dei database.

## Mappa dei consumer

Percorsi relativi ad `artifacts/api-server/src/`, salvo diversa indicazione.

| Modulo / funzione | Percorso SQL | Dati e dipendenze rilevanti |
|---|---|---|
| `routes/osservazioni.ts`: elenco, salvataggio/upsert, cancellazioni | storico; salvataggio anche attraverso `lib/plan-store.ts` | `osservazioni`, proprietario derivato dall'account; validazione legge anche catalogo e varietà dal centrale |
| `middlewares/access.ts`: `requireAccount` | storico | `app_users`; può scrivere l'associazione Clerk/email al primo accesso: non è un controllo puramente in lettura |
| `routes/security.ts`, `lib/account-actions.ts` | storico | account, privacy, richieste, esportazione personale, inviti e cancellazione; operazioni esterne Clerk da non eseguire durante il confronto |
| `lib/security-db.ts` | storico | verifica schema in avvio; scrittura audit in `security_events` |
| `routes/plans.ts`, `lib/plan-store.ts` | storico | `app_plan_state`, account, osservazioni e richieste privacy; lock, transazioni, quote e consumi devono restare coerenti |
| `routes/crop-catalogue.ts` → `lib/catalogue-storage.ts` | centrale se backend Supabase; autorizzazione account sullo storico | verifica `agronomy_catalogue.model_profiles` e restituisce lo snapshot compilato; con backend Replit usa solo lo snapshot; cache nel processo |
| `routes/variety-proposals.ts`, `lib/variety-store.ts` | centrale, autorizzazione account sullo storico | `agronomy_catalogue.variety_submissions`; proposte, decisioni e profili approvati; template in memoria |
| `index.ts`: `verifyRuntimeIdentity(pool, ...)` | centrale | controlla ruolo/TLS in modalità Supabase, non dati recenti o pool storico |
| `index.ts` → `verifySecuritySchema()` | storico | verifica schema applicativo sul pool distinto da quello appena verificato |
| `routes/health.ts` | nessuno | `/healthz` non prova l'accessibilità o identità di alcun database |

### Consumer fuori dal traffico ordinario

- `scripts/retention-report.ts`, `scripts/verify-access.ts`,
  `scripts/setup-admin.ts` importano il pool storico. Non eseguirli per
  accertare l'instradamento: non assumere che siano tutti privi di scritture.
- `tools/apply-catalogue.ts`, `tools/apply-user-plans.ts`,
  `tools/apply-variety-submissions.ts` aprono client dedicati usando
  `SUPABASE_QA_ADMIN_URL`. Non sono il percorso runtime, non sono stati
  eseguiti e non vanno usati per correggere l'instradamento.
- `lib/db/src/migration-preparation/` è preparazione separata, non il
  selettore runtime. I test non costituiscono prova della destinazione LIVE.

## Rischio concreto

Con backend centrale nominalmente Supabase, i moduli storici continuano a
seguire `DATABASE_URL`. Se le destinazioni differiscono, una stessa richiesta
può autorizzare un account su un'origine, validare una varietà sull'altra
e salvare il rilievo sulla prima. Non è ancora dimostrato che le destinazioni
differiscano: serve il confronto autorizzato.

Sostituire semplicemente l'import del pool può nascondere rilievi recenti,
perdere associazioni proprietario/Clerk, usare quote o sospensioni obsolete,
oppure far ricomparire dati cancellati. Conteggi uguali non dimostrano
l'uguaglianza dei record. Non basta verificare `created_at`: gli upsert,
le cancellazioni e le modifiche agli account possono alterare record più vecchi.

## Prossima fase proposta: solo confronto autorizzato

1. Identificare la revisione LIVE e l'associazione dei due percorsi a
   origine storica e destinazione Supabase Agri Precision già esistenti.
   Non dedurre Production dalla connessione Development. Non usare una
   replica come prova del primario senza dichiararne limiti e ritardo.
2. Concordare un canale di esecuzione Production autorizzato senza portare
   credenziali runtime/amministrative nello sviluppo. Non leggere, stampare
   o copiare i valori dei Secrets. Il consenso alle letture non autorizza
   a pubblicare una nuova revisione per ottenere questo canale.
3. Su ciascuna origine verificata eseguire transazioni
   `REPEATABLE READ READ ONLY`, timeout e chiusura con `ROLLBACK`;
   controllare identità database/ruolo, TLS e primario/replica. Riportare
   solo esiti e identificativi tecnici non sensibili strettamente necessari.
4. Confrontare presenza di tabelle/colonne/chiavi e i dati di account,
   rilievi, richieste privacy, audit, stato sicurezza, contratti/consumi
   e proposte varietali. Per il catalogo già allineato verificare soltanto
   versione e impronte: nessuna reimportazione.
5. Produrre conteggi, estremi temporali disponibili, differenze di chiavi,
   proprietari orfani e contenuti discordanti, senza esporre nomi, email,
   identificativi Clerk, GPS o payload nel report o repository.
   Confrontare anche i record meno recenti per distinguere modifiche e
   assenze; eventuali impronte vanno elaborate nel canale protetto e nel
   report restano soltanto totali delle differenze. Confrontare stato,
   ruoli e associazioni account senza cambiare Clerk.
6. Registrare inizio/fine UTC degli snapshot. Due snapshot di origini
   attive non sono atomicamente sincronizzati: questa è una ricognizione,
   non una prova definitiva di cutover senza perdite. Se manca una data
   di migrazione verificata, non attribuire automaticamente le differenze
   a scritture successive. Un record assente potrebbe essere stato
   cancellato intenzionalmente: non reinserirlo.

Se manca un accesso conforme, se le identità non coincidono con quelle
autorizzate o se una lettura richiede nuovi privilegi, fermarsi e riferire
il blocco. Non usare automaticamente i Secrets QA/admin disponibili.

## Fasi successive: ciascuna richiede nuovo consenso

Solo dopo il confronto proporre la lista esatta dei moduli da riallineare e
dei record eventualmente da riconciliare, con gestione esplicita dei conflitti
e delle cancellazioni. Account/accessi, osservazioni, quote e audit sono
dipendenze accoppiate: evitare transazioni spezzate su due pool.

Prima del passaggio definitivo servono una finestra senza scritture
separatamente autorizzata, un confronto finale coerente, protezione delle
scritture recenti e un percorso di recupero che non si limiti a tornare alla
vecchia copia. Backup e cancellazione dei backup restano nei percorsi già
dedicati, non vengono eseguiti qui.

Schema/privilegi incompatibili devono bloccare il passaggio, non attivare
migrazioni, bootstrap o concessioni automatiche. Non ricreare progetti,
non reimportare cataloghi allineati, non cambiare `DATABASE_URL`, ruoli o
Secrets come scorciatoia. Pubblicazione e attivazione restano autorizzazioni
distinte e non si eseguono da questa copia di lavoro.

## Autorizzazione acquisita e limite operativo

Il titolare ha selezionato «Autorizzo solo il confronto», senza ulteriori
condizioni aggiunte, dopo aver ricevuto il perimetro seguente.

> Autorizzo esclusivamente l'identificazione delle due origini effettive e
> il confronto SQL in sola lettura descritto sopra, attraverso un canale
> Production conforme da verificare prima di procedere. Nessun valore di
> Secret deve essere acquisito o mostrato. Nessuna esportazione di record
> nel workspace o nel report; soltanto esiti aggregati non personali.
> Non autorizzo scritture, riconciliazioni, cambio dei pool o di DATABASE_URL,
> nuovi privilegi, schema, importazioni, nuove risorse o pubblicazione.

L'autorizzazione non estende il perimetro tecnico disponibile.

### Esito della verifica del canale

- I metadati della pubblicazione attestano una pubblicazione attiva con build
  riuscita; non forniscono l'identità SQL dei due pool né il confronto dei dati.
- Nel codice esaminato non è presente un'operazione di confronto dei due pool
  in Production già utilizzabile. Le route applicative non sono un sostituto:
  l'autorizzazione account può scrivere il collegamento Clerk e gli endpoint
  non restituiscono un inventario coerente dei due database.
- Lo strumento SQL Production documentato riguarda il database gestito Replit
  tramite replica, non il collegamento esterno Supabase né i pool del processo
  LIVE. Non è stato invocato: non identifica entrambe le origini e il consenso
  non autorizza la creazione di repliche.
- Gli script amministrativi esistenti usano credenziali QA/admin nello
  sviluppo: non sono il canale conforme autorizzato. Nessuno è stato eseguito,
  neppure nelle modalità denominate readonly.

Fonti ufficiali consultate per il limite degli strumenti:
https://docs.replit.com/features/data-and-storage/development-and-production
e https://docs.replit.com/features/data-and-storage/sql-database .

**Confronti SQL eseguiti: nessuno.** Non è possibile attestare identità,
conteggi, differenze o assenza di scritture recenti.
Occorre individuare con il titolare un canale Production già disponibile e
conforme, oppure autorizzare separatamente la preparazione di un diagnostico
protetto da eseguire nell'ambiente Production. Preparazione, eventuale
pubblicazione da parte del titolare ed esecuzione non vanno confuse.
Nessuna di queste alternative autorizza il cambio delle connessioni.

### Preparazione successivamente autorizzata

Il titolare ha scelto **«Prepara solo il diagnostico»**. È stata quindi
predisposta una libreria inattiva, senza collegamenti ad avvio o route,
con test esclusivamente sintetici e senza connessioni reali.
Contratto, limiti e prerequisiti sono descritti in
[diagnostico-connessioni-production.md](diagnostico-connessioni-production.md).
Il canale di esecuzione Production e il confronto effettivo restano da
definire/autorizzare; l'allineamento non è stato eseguito.
