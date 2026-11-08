# Migrazione — punto 3: programma del backup verificabile

## Stato e limiti

**Preparazione documentale completata. Esecuzione NON autorizzata e NON avviata.**
Questo documento segue il [punto 2](migrazione-punto-2.md) e specifica
[BACKUP_RESTORE.md](../lib/db/migration-preparation/BACKUP_RESTORE.md).
Non attesta che un backup esista o sia recuperabile.

In questa preparazione non si leggono record o credenziali, non si aprono
connessioni, non si creano database/progetti, non si esportano dati. Non si
modificano DATABASE_URL, Clerk, ruoli, configurazioni o pubblicazione.
Le precedenti autorizzazioni ai soli metadati non autorizzano il punto 3.
Non si eseguono nemmeno i vecchi test che creano un cluster locale.

La destinazione futura è **solo Agri Precision**, West EU (Ireland),
project reference dichiarato `bhnaarbzpmcniesxyldx`; non è una nuova verifica
live. Nessun secondo database/progetto, neppure temporaneo per il collaudo.
L'archivio esterno del titolare è un deposito di file, non un altro database.
Non riguarda attestazioni sulla cancellazione dei backup dei fornitori.

## 1. Permessi distinti e criteri di arresto

| Passaggio | Permesso necessario | Cosa NON autorizza |
|---|---|---|
| Preparazione attuale | Incarico documentale | Connessioni, segreti, letture, export |
| Esecuzione punto 3 | Approvazione specifica di origine, letture, export, custodia e durata | Restore, import, DDL, ruoli, cutover |
| Ripristino verificabile | Nuova approvazione esplicita nel solo Agri Precision, dopo i prerequisiti delle fasi approvate | Cambio credenziali dell'app, pubblicazione, cancellazione origine |
| Cutover e recupero operativo | Approvazione della fase pertinente e della finestra senza scritture | Riconciliazione distruttiva o cancellazione implicita |

Ogni campo ancora da confermare sotto è un **NO-GO**, non un valore da indovinare.
In caso di errore: interrompere, chiudere le connessioni, preservare le sole
evidenze protette necessarie, registrare FAIL e richiedere una decisione.
Mai ripiegare su Development, una replica non verificata o un altro Supabase.
Non correggere dati, ampliare privilegi o abbassare TLS per completare il backup.

### Testo da sottoporre al titolare prima dell'esecuzione

> Autorizzo esclusivamente il punto 3 descritto in docs/migrazione-punto-3.md:
> identificazione del database effettivamente usato dall'app Replit pubblicata,
> uso delle credenziali sorgente tramite il sistema sicuro, lettura completa
> dei dati e dei metadati necessari, backup logico coerente, inventario,
> conteggi e impronte sul medesimo snapshot, cifratura e verifica di leggibilità
> nell'archivio sotto il mio controllo. Confermo operatore, origine, deposito,
> destinatario della cifratura, custode della chiave, accessi, conservazione
> e limiti di carico nel verbale. Non autorizzo restore/import, creazione di
> database/progetti, modifiche a DATABASE_URL, ruoli, Clerk o pubblicazione,
> cancellazioni né fasi successive.

Questo è un **modello**, non un consenso acquisito. Non chiedere password,
URL con credenziali o chiavi private in chat. Il consenso ai dati e la
disponibilità tecnica delle credenziali sono due prerequisiti separati.

## 2. Verbale preliminare, da completare senza esporre segreti

Il titolare e l'operatore compilano nel deposito protetto:

| Campo obbligatorio | Evidenza richiesta |
|---|---|
| Consenso | Testo, ambito, data UTC e responsabile |
| App pubblicata e versione | Riferimento della pubblicazione e commit effettivo; non il solo HEAD del workspace |
| Origine Production | Associazione tra app pubblicata e database, ambiente, endpoint/branch e database attesi, senza DSN/password |
| Identità SQL | Host TLS atteso, current_database, session_user, current_user, versione server, stato primary/replica |
| Strumenti | Versioni esatte pg_dump, pg_restore, psql, tar, age e sha256sum |
| Custodia | Deposito cifrato esterno al workspace, proprietario, operatori autorizzati, controllo accessi e recupero chiave |
| Cifratura | Destinatario pubblico age verificato con il titolare; chiave privata separata dal backup e dal workspace |
| Conservazione | Termine approvato, responsabile e modalità di successiva eliminazione autorizzata, comprese copie parziali |
| Finestra | Inizio/fine UTC, carico e spazio massimi, timeout, responsabile dell'arresto |
| Consistenza | Snapshot condiviso oppure finestra senza scritture separatamente autorizzata |

**Identificare Production, non presumere:** il titolare seleziona Production
nel Database tool Replit e verifica l'associazione con la configurazione
effettiva della pubblicazione. Un database esterno richiederebbe un percorso
diverso: non assumere che il pannello rappresenti qualsiasi DSN dell'app.
La URL del sito non è l'endpoint PostgreSQL. Nomi tabelle e uguaglianza degli
schemi Development/Production non dimostrano che sia lo stesso database.
L'operatore verifica la corrispondenza senza stampare la stringa di connessione.

Le SELECT Production dello strumento Agent passano da una replica read-only:
non sono il canale da usare per attestare snapshot/contenuto del database
effettivamente servito dall'app. Per il backup usare l'endpoint Production
verificato. Se è una replica, fermarsi finché consistenza e ritardo non siano
valutati e approvati; non sostituire silenziosamente il primary.

Fonti ufficiali consultate per questa preparazione:
- https://docs.replit.com/features/data-and-storage/connection-details
- https://docs.replit.com/features/data-and-storage/development-and-production
- https://docs.replit.com/features/data-and-storage/sql-database

Le fonti descrivono la piattaforma, non certificano l'identità del database
di questo progetto. Le osservazioni storiche sono in
[SCHEMA_VALIDATION.md](../lib/db/migration-preparation/SCHEMA_VALIDATION.md).

## 3. Postazione e inventario prima dell'acquisizione

Operatore autorizzato su postazione sotto controllo del titolare, **fuori dal
workspace Replit e dal repository**; nessun dump in generated-artifacts, /tmp
del workspace, allegati, log o screenshot. Predisporre volume cifrato montato,
directory private 0700 e file 0600, spazio sufficiente per dump, decifratura
di verifica e pacchetto. Evitare swap, sincronizzazioni e backup automatici
non cifrati. La sola cancellazione di un file non prova la sua irrecuperabilità.

I comandi successivi sono un promemoria manuale per la fase autorizzata, **non
uno script da lanciare adesso**. Non aggiungerli ad avvio, build, workflow,
post-merge o Publish. Nessuna nuova dipendenza va installata nell'app.

Predisporre servizi libpq separati con file protetti, TLS `verify-full` e CA
ufficiale verificata. Il servizio `nitrocrop_source_approved` deve puntare
soltanto all'origine confermata; nessuna credenziale target serve al punto 3.
Password mai nella CLI, history o variabili stampate; disattivare shell tracing
e registrazione terminale. Ambiente esplicitamente ripulito da configurazioni
PG/app ereditate, senza modificare i segreti dell'app. Errori grezzi e stderr
restano nel volume protetto; condividere soltanto esito filtrato.

Confermare compatibilità: pg_dump non più vecchio del server origine,
pg_restore compatibile con il formato generato e destinazione futura
compatibile con il SQL. Una versione maggiore target non garantisce da sola
compatibilità di estensioni, collation o privilegi.

Inventario completo, non limitato a inspect.sql:
- tutti gli schemi e relazioni, colonne/tipi/collation, partizioni, viste,
  materialized view, sequenze/identity e stato, indici, vincoli e default;
- funzioni/procedure e dipendenze, trigger, estensioni/versioni, policy/RLS,
  owner, grants/default ACL, commenti e impostazioni rilevanti;
- large object e loro riferimenti, foreign table e sorgenti esterne se presenti;
- oggetti tecnici Replit separati da quelli applicativi, dipendenze tra schemi,
  oggetti non leggibili e altre esclusioni con motivazione.

Le cinque tabelle storicamente osservate sono app_users, osservazioni,
privacy_requests, security_events e security_state. Sono una checklist iniziale,
non un filtro per il dump: qualsiasi oggetto nuovo va censito, non ignorato.
Oggetti esterni/foreign table non sono automaticamente copiati da pg_dump:
se presenti e necessari, fermarsi e far approvare la copertura aggiuntiva.
Il backup logico del database non comprende account/password Clerk, file esterni,
WAL/PITR, configurazione del provider o segreti globali del cluster.
Inventariare questi limiti; non esportare credenziali con pg_dumpall.

## 4. Snapshot unico e acquisizione coerente

Usare una connessione diretta o un session pooler verificato che mantenga la
sessione; non un transaction pooler per la sessione coordinatrice. Verificare
identità, TLS, permessi di lettura di tutti gli oggetti e assenza di righe
silenziosamente escluse da RLS. Non usare `--enable-row-security` per aggirare
un errore di copertura.

La sessione coordinatrice apre:

```sql
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SHOW transaction_read_only;
SELECT pg_catalog.pg_export_snapshot();
```

`transaction_read_only` deve essere `on`. Conservare privatamente lo snapshot
ID restituito e **tenere aperta la transazione** fino alla conclusione di dump,
schema e confronti sorgente. Le altre sessioni di lettura aprono REPEATABLE
READ READ ONLY e importano quello snapshot con `SET TRANSACTION SNAPSHOT`
prima di qualsiasi SELECT. Se la sessione coordinatrice cade o uno strumento
non può importare lo snapshot, l'intero gruppo è incompleto: ricominciare con
nuovo identificativo di backup, non unire risultati di snapshot diversi.
Nessuna transazione read-only va scambiata per una sospensione delle scritture
degli altri processi.

Nella shell autorizzata, `STAGE` è una directory privata sul volume cifrato
del titolare, `SNAPSHOT_ID` è il valore appena ottenuto, non una credenziale:

```sh
# SOLO dopo autorizzazione e controlli; errore di qualsiasi comando = STOP.
# STAGE deve essere nuova e vuota; non sovrascrivere una precedente acquisizione.
pg_dump --dbname='service=nitrocrop_source_approved' \
  --format=custom --snapshot="$SNAPSHOT_ID" \
  --file="$STAGE/application.dump"
pg_dump --dbname='service=nitrocrop_source_approved' \
  --schema-only --snapshot="$SNAPSHOT_ID" --file="$STAGE/schema.sql"
pg_restore --list "$STAGE/application.dump" > "$STAGE/archive.list"
```

Non filtrare schemi/tabelle né sopprimere owner/ACL nel **backup di
conservazione**: copertura completa degli oggetti esportabili del database.
La futura lista di restore, distinta, escluderà i tecnicismi non portabili.
Non eseguire schema.sql: è un'evidenza da confrontare, può contenere definizioni
sensibili o codice. Qualsiasi errore di permessi, warning di copertura,
timeout, oggetto non esportabile o limite di spazio impedisce un esito PASS.

Prima di chiudere lo snapshot acquisire inventario, conteggi e fingerprint
sorgente descritti sotto. Poi ROLLBACK e chiusura di tutte le sessioni.
Le transazioni lunghe possono gravare su produzione: rispettare il budget
approvato e interrompere anziché mantenerle aperte senza limite.

**Limiti MVCC:** sequenze e altri stati non transazionali non sono congelati
dallo snapshot. Durante l'acquisizione vietare cambi di schema con coordinamento
degli operatori. Se sono presenti stati non MVCC necessari, occorre una finestra
senza scritture specificamente autorizzata, oppure dichiarare la copertura
incompleta. Non promettere coerenza esatta di tali stati dal solo snapshot.
Un backup con scritture in corso è una fotografia storica: il trasferimento
finale richiederà un nuovo backup nella fase di cutover, non il riuso cieco
di questa copia.

## 5. Inventario dati e impronte riproducibili

Nello stesso snapshot, per **ogni** tabella applicativa:
1. Enumerare schema, tabella, elenco colonne per nome, tipi e chiave stabile;
   niente import/export per posizione.
2. Acquisire conteggio esatto e SHA-256 del flusso di righe canoniche ordinato
   per PK; security_state usa `key`, le altre quattro tabelle storiche `id`.
   Nuove tabelle senza chiave richiedono un ordinamento deterministico
   revisionato che conservi i duplicati, altrimenti STOP.
3. Concordare e registrare serializzazione versione 1: righe JSONB testuali
   con tutte le colonne, ordinamento chiave testuale COLLATE "C", encoding
   UTF-8, timezone UTC, DateStyle ISO/YMD, IntervalStyle postgres,
   extra_float_digits=3 e un LF per riga. Fissare gli stessi parametri su
   fonte e target; eventuali differenze PostgreSQL richiedono confronto
   canonico revisionato, non accettazione dei soli conteggi.
4. Alimentare SHA-256 direttamente in streaming con controllo degli errori
   di COPY/lettura e del processo hash (`pipefail` se si usa una pipeline).
   Non stampare righe, non usare string_agg dell'intera tabella, non accettare
   l'hash di un flusso troncato. Tenere query e lista colonne nel pacchetto.
5. Registrare separatamente schema, sequenze e large object se presenti:
   l'hash delle righe non copre privilegi, indici o contenuti esterni.

Conteggi, impronte e dettagli proprietari restano nell'archivio privato:
anche un checksum di dati personali non equivale ad anonimizzazione. Il
rapporto condivisibile contiene solo PASS/FAIL per controllo e limiti, senza
record, ID Clerk, email, coordinate, valori di security_state o dettagli
account. Il checksum **del file cifrato** può identificare la consegna.

## 6. Cifratura, checksum e consegna al titolare

Pacchetto interno minimo:

| File | Contenuto |
|---|---|
| application.dump, schema.sql, archive.list | Dump completo, schema dello stesso snapshot, indice archivio |
| inventory.json | Oggetti/dependenze inclusi ed esclusi, motivazioni e copertura |
| source-checks.json | Conteggi, fingerprint e controlli dati dello snapshot |
| serialization.md | Query, colonne, ordine, parametri e versione del confronto |
| capture.json | Identità confermata, tempi UTC, snapshot, versioni strumenti/server, exit code, limiti |
| SHA256SUMS | SHA-256 di tutti i file precedenti, non di sé stesso |

Nomi esemplificativi, nessun file reale è stato generato. Usare un identificativo
di acquisizione univoco e niente nomi di persone nei percorsi. Manifest e
checksum interni sono cifrati insieme ai dati. L'operatore confronta la lista
effettiva con l'inventario prima di cifrare.

```sh
# STAGE contiene soltanto i sette file elencati sopra più SHA256SUMS.
(cd "$STAGE" && sha256sum application.dump schema.sql archive.list \
  inventory.json source-checks.json serialization.md capture.json > SHA256SUMS)
(cd "$STAGE" && sha256sum --check SHA256SUMS)
# DEST è privata e distinta da STAGE; RECIPIENT_FILE contiene SOLO la chiave pubblica.
# Tutte le variabili/percorso vanno controllate dall'operatore prima dell'uso.
set -o pipefail
tar -C "$STAGE" -cf - . | age -R "$RECIPIENT_FILE" -o "$DEST/backup.tar.age"
(cd "$DEST" && sha256sum backup.tar.age > backup.tar.age.sha256)
(cd "$DEST" && sha256sum --check backup.tar.age.sha256)
```

Prima verificare il destinatario con il titolare e un round-trip di un file
innocuo; cifrare verso la chiave sbagliata rende il backup inutilizzabile.
La chiave privata rimane al custode, non va nel pacchetto o nel workspace.
Il titolare riceve file cifrato, checksum esterno e verbale di consegna per
canale autenticato; verifica il checksum anche **dopo** il trasferimento.
SHA-256 prova integrità rispetto a un valore fidato, non autenticità da solo:
confermare il digest con il titolare tramite canale indipendente o firma
verificata, senza imporre un nuovo servizio esterno.

## 7. Leggibilità senza restore

Il custode, sulla postazione autorizzata, decifra la copia **ricevuta** con
la propria chiave verso un secondo percorso vuoto sul volume cifrato.
Prima lista il tar e rifiuta percorsi assoluti, `..`, link e file inattesi;
poi estrae solo i file attesi, senza ripristinare owner/permessi dal tar.
Non è un secondo database e non esegue SQL.

Verifiche obbligatorie:
- uscita age riuscita e integrità del file cifrato dopo consegna;
- inventario file completo, `sha256sum --check SHA256SUMS` nella copia decifrata;
- `pg_restore --list` riesce e l'indice coincide con quello archiviato;
- `pg_restore --file=/dev/null application.dump` riesce senza connessione:
  legge/decomprime il payload intero, non soltanto l'indice;
- schema, inventario e prove sorgente presenti e leggibili privatamente;
- custode conferma recuperabilità della chiave e accessi al deposito.

Conservare esiti e versioni strumenti, non il SQL generato nei log.
Queste prove certificano soltanto **ARCHIVIO_LEGGIBILE**: non provano che
vincoli, estensioni, SQL e permessi possano essere ripristinati su Supabase.
Copie in chiaro e parziali rimangono protette finché il titolare autorizza
la gestione prevista nel verbale; non affidarsi a `rm` come cancellazione sicura.

## 8. Ripristino futuro: cancello separato, solo Agri Precision

**Non eseguire nel punto 3.** Il restore segue le fasi approvate per
preparazione di ruoli/protezioni e richiede una nuova autorizzazione alle
scritture e al confronto dei dati reali. Nessuna credenziale target viene
usata per la sola preparazione/lettura dell'archivio.

Prerequisiti per il successivo GO:
1. Riconfermare project reference, endpoint, TLS/CA e identità SQL di Agri
   Precision. Nome progetto e stato Healthy non bastano. Non cambiare
   DATABASE_URL dell'app per eseguire la prova.
2. Spazio applicativo vuoto verificato, senza dati clienti preesistenti,
   conservando auth/storage e gli oggetti tecnici Supabase. Se non è vuoto o
   c'è un conflitto, STOP: niente `--clean`, DROP, TRUNCATE, reset, secondo
   progetto/database o schema alternativo creato per aggirare il vincolo.
3. Ruolo migrator, proprietà e privilegi approvati separatamente, con
   credenziale disponibile solo all'operatore; mai usare runtime/readonly
   o l'URL amministrativo già presente come autorizzazione implicita.
4. Revisionare definizioni SQL, estensioni e dipendenze; produrre
   restore-approved.list con checksum e motivazione di ogni esclusione.
   Escludere `_system` e i tecnicismi del provider, salvo dipendenza
   esplicitamente risolta e autorizzata. Nessun restore di ruoli/password
   globali o grants tecnici Replit.
5. Preferire restore degli oggetti applicativi selezionati dal dump completo,
   `--no-owner --no-acl --single-transaction --exit-on-error`, con proprietà
   mappata al migrator approvato. **Non applicare prima baseline 0001**.
   Nessun backfill 0002, seed, rigenerazione ID o ricalcolo.

Il comando manuale, la strategia alternativa e i controlli di cutover sono in
[BACKUP_RESTORE.md](../lib/db/migration-preparation/BACKUP_RESTORE.md).
Un rollback SQL non prova assenza di effetti esterni da codice incluso nel
dump: le definizioni devono essere revisionate prima dell'esecuzione.

Il report di restore deve provare:
- corrispondenza schema/colonne/tipi/default, PK/FK/UNIQUE/CHECK, indici,
  sequenze/stato, funzioni, trigger e policy, con differenze attese approvate;
- conteggi e fingerprint di **tutte** le tabelle applicative contro le
  evidenze dello snapshot archiviato, con identica serializzazione;
- ID e identità Clerk, titolarità dei rilievi, observation_id, ruoli, stati,
  consensi, scadenze/durate, timestamp e ogni campo agronomico invariati;
- zero differenze non spiegate, controlli orfani/duplicati e NULL distinti
  da stringa vuota/zero; anomalie sorgente preservate e segnalate, mai corrette;
- proprietà, grants e divieti effettivi dei tre ruoli, più esposizione Data API,
  senza confondere parità dati con sicurezza dei privilegi.

Il restore di prova rimane un'importazione di dati reali e lascia dati nel solo
target approvato: concordare prima il suo stato successivo. Non promettere
pulizia o una seconda importazione sovrapposta senza specifica autorizzazione.
Il target non deve ricevere scritture applicative durante il confronto.
Un esito **RESTORE_VERIFICATO** non autorizza ancora cutover o pubblicazione.

## 9. Chiusura del punto 3 e stato attuale

Per chiudere l'esecuzione futura servono: consenso registrato, origine
dimostrata, copertura completa senza errori, snapshot unico, archivio cifrato
consegnato, checksum verificati dal titolare, decifratura/lettura completa
riuscite, verbale senza dati personali e lista dei limiti.
Il ripristino resta **DA_AUTORIZZARE**, fino alla prova successiva.

| Controllo | Stato di questa consegna |
|---|---|
| Programma, permessi e criteri di arresto | Preparati |
| Identificazione live database pubblicato | Non eseguita |
| Uso credenziali / lettura record / export | Non eseguiti |
| Archivio, checksum e consegna reali | Non creati / non eseguiti |
| Leggibilità / ripristino reale | Non verificati |
| DATABASE_URL, Clerk, database/progetti, pubblicazione | Invariati |

Il titolare deve ancora confermare i campi del verbale e autorizzare
specificamente il punto 3 prima che un operatore inizi.
