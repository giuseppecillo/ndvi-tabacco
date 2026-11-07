# Migrazione, punto 1 — verifiche indispensabili in sola lettura

Data: 7 novembre 2026. Destinazione: **Agri Precision**, riferimento
`bhnaarbzpmcniesxyldx`, Session pooler già autorizzato
`aws-0-eu-west-1.pooler.supabase.com:5432`.

## Esito: SUPERATO per il perimetro di sola lettura autorizzato

Letture PostgreSQL concluse. Le schermate Settings ricevute il 7 novembre
confermano gli schemi esposti **graphql_public e public**, il search path e
l'esposizione automatica attiva. Le informazioni indispensabili del punto 1
sono state raccolte. Non emergono blocchi informativi per sottoporre il punto 2
ad autorizzazione; restano i rischi da gestire prima delle future scritture.
Il punto 2 non è stato avviato e richiede una nuova autorizzazione.

Nessun nuovo progetto/database, DDL, DML, cambio privilegi/configurazione,
avvio applicativo contro Supabase, importazione, backup reale, lettura di
righe applicative, modifica Secrets o DATABASE_URL.

## Protezioni e collaudo offline

- Modalità QA manuale dedicata, scollegata da avvio/build/post-merge.
- Elenco fisso separato: identità e sei SELECT di catalogo mirate.
  Il vecchio inventario non può usare le nuove SELECT per leggere corpi SQL.
- Processo figlio con ambiente ripulito, solo Secret QA e identificativi
  autorizzati; niente DATABASE_URL, PG*, Clerk, import dell'app o fallback.
- Target vincolato al riferimento e host confermati; porta 5432.
- CA ufficiale con impronta approvata, TLS e hostname verificati.
- BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY su Supabase.
- Verifica transaction_read_only=on prima di ciascuna delle sette SELECT.
- ROLLBACK e chiusura completati prima dell'emissione del rapporto.
- Definizione integrale salvata soltanto nell'evidenza privata locale,
  ignorata da Git/pubblicazione: directory 0700, file 0600.
- 96 test offline superati (85 precedenti e 11 aggiunti); typecheck mirato
  superato. Nessun test offline apre connessioni.

## Supabase: risultati live

Lettura conclusa alle 10:26:19 UTC del 7 novembre 2026.

Le cinque relazioni applicative non esistono in public: zero relazioni,
colonne, vincoli e indici applicativi restituiti dal catalogo.
Non sono stati contati o letti record di alcuna tabella.

### Routine e trigger letti, mai invocati

| Proprietà | Risultato |
|---|---|
| Routine | public.rls_auto_enable(), senza argomenti |
| Tipo restituito | event_trigger |
| Linguaggio / proprietario | plpgsql / postgres |
| SECURITY DEFINER | sì |
| search_path | pg_catalog |
| Trigger collegato | ensure_rls |
| Evento / abilitazione | ddl_command_end / O |
| Tag | CREATE TABLE, CREATE TABLE AS, SELECT INTO |
| Collegamento routine-trigger | OID coincidenti |

SHA-256 della definizione letta:
`b21d88816c445d14cef5032c3cd4abaebc1db2001fcb3435022ab6b496182ca4`.

Analisi statica del corpo effettivamente installato:

- Legge i comandi DDL dell'evento e seleziona table/partitioned table.
- Opera soltanto sullo schema public, escludendo schemi di sistema/temporanei.
- Ricava il nome dell'oggetto dal catalogo ed esegue dinamicamente
  ENABLE ROW LEVEL SECURITY con identificatori formattati.
- Non crea policy e non interviene retroattivamente su tutte le tabelle.
- **L'eccezione è catturata con WHEN OTHERS e registrata con RAISE LOG,
  senza rilancio.** Il DDL originario potrebbe quindi riuscire anche se
  l'abilitazione RLS fallisse. La precedente ipotesi documentale di un possibile
  rilancio non descrive questo corpo.
- Nessun esperimento di creazione/ALTER è stato eseguito: il comportamento
  sotto ownership app_migrator resta un futuro collaudo autorizzato.

Conseguenze: il futuro script deve abilitare/verificare RLS esplicitamente;
non deve dipendere dal solo successo del trigger. GRANT senza policy applicabili
non basta ad app_runtime non proprietario e NOBYPASSRLS.
L'EXECUTE assegnato a PUBLIC/ruoli API su una funzione event_trigger non prova
che essa sia una normale RPC chiamabile via Data API.

## Replit produzione: confronto dei soli metadati

Usata la connessione di produzione in sola lettura gestita dallo strumento,
senza utilizzare/esporre credenziali del database. PostgreSQL 16.15;
transaction_read_only=on. Un'unica SELECT di catalogo ha acquisito relazioni,
colonne/default, vincoli e indici nello stesso snapshot dell'istruzione.

Il wrapper del servizio usa READ COMMITTED e non accetta comandi espliciti
BEGIN/ROLLBACK: la richiesta iniziale contenente tali comandi è stata respinta
prima dell'esecuzione. È stata poi inviata soltanto la SELECT di metadati,
senza tentare di aggirare il wrapper o cambiare sessione/configurazione.
La transazione REPEATABLE READ esplicita è stata usata dal runner Supabase.

| Tabella | Colonne Replit | Presente in Supabase |
|---|---:|---|
| app_users | 13 | no |
| osservazioni | 33 | no |
| privacy_requests | 7 | no |
| security_events | 5 | no |
| security_state | 2 | no |

Totale: 60 colonne, 12 vincoli, 8 indici. RLS non attiva sulle cinque tabelle
Replit; nessuna modifica eseguita.

Confermati da definizioni di catalogo:
- PK testuali; UNIQUE clerk_user_id/email.
- FK osservazioni.owner_id e privacy_requests.user_id verso app_users.id,
  entrambe ON DELETE CASCADE e validate.
- UNIQUE (owner_id, observation_id) sulle osservazioni.
- actor_id e target_id nullable, compatibili strutturalmente con
  anonimizzazione a NULL; i futuri privilegi non sono ancora collaudati.
- Campi per GPS, letture NDVI, dose, parametri agronomici e abbonamenti presenti.

Il target applicativo è vuoto: nessuna collisione sulle cinque relazioni, ma
non si può dichiarare uguaglianza di schema con tabelle non ancora create.
La baseline preparatoria deve essere riconciliata con i metadati di produzione
prima dell'uso. In particolare, l'ordine fisico di diverse colonne differisce:
non importare per posizione e non combinare baseline con restore completo.
Nessun conteggio o confronto di contenuti effettuato in questa fase.

## Data API: configurazione ufficiale verificata tramite schermate

La schermata Overview già fornita documentava l'attivazione al momento della
sua acquisizione, ma non Exposed schemas, Extra search path o stato corrente.
Le schermate Settings fornite dal titolare sono:
- `attached_assets/0_2026-11-07_11_28_07_1794047373476.png`;
- `attached_assets/0_2026-11-07_11_32_06_1794047571681.png`
  (selettore Exposed schemas aperto, entrambi i nomi selezionati).

| Campo visibile in Settings | Evidenza |
|---|---|
| Exposed schemas | graphql_public e public, entrambi selezionati; “2 of 2 schemas exposed” |
| Exposed tables | “No tables available” |
| Exposed functions | “1 of 1 functions exposed”; nome non visibile |
| Automatically expose new tables | Attivo |
| Extra search path | public, extensions |

Extra search path non equivale agli schemi esposti: extensions compare nel
primo ma non fra i due schemi esposti. Il conteggio della funzione esposta
non dimostra da solo che la funzione event_trigger sia invocabile come RPC.
Le schermate Settings ritagliate non mostrano l'interruttore generale Data API:
non si certifica un nuovo controllo live di quel toggle né la raggiungibilità
effettiva degli endpoint. Questi limiti non impediscono di individuare la
configurazione di esposizione richiesta per preparare la migrazione.

Rischio confermato da questa configurazione: le future tabelle potrebbero
ricevere automaticamente privilegi per i ruoli Data API. Prima della futura
creazione occorre approvare e verificare una strategia di esposizione/ACL,
senza assumere che la sola RLS o la creazione tramite app_migrator annulli
gli automatismi. Nessun toggle o privilegio è stato modificato.

Nessun nuovo token Management API richiesto; nessuna richiesta REST/GraphQL a
tabelle applicative; nessuna supposizione basata sui soli indizi PostgreSQL.

Il blocco documentale sugli schemi esposti è risolto. Nessun altro accesso,
token o verifica esplorativa è necessario per chiudere il punto 1.

## Condizioni per i punti successivi

- Punto 2: autorizzazione distinta alle sole modifiche applicative/automatismi
  già descritte nel piano, senza collegare l'app a Supabase.
- Prima della futura creazione delle tabelle: strategia approvata per impedire
  privilegi/esposizione API indesiderati, dato che public è esposto e
  Automatically expose new tables è attivo.
- RLS esplicita, policy compatibili con Express e verifica effettiva dopo DDL:
  il trigger può registrare un errore senza far fallire il comando.
- Baseline riconciliata con la sorgente e importazione per colonne esplicite.

Il superamento del punto 1 non certifica i permessi dei ruoli futuri,
l'assenza di dati orfani, l'integrità dei contenuti o la riuscita della
migrazione. Non autorizza automaticamente il punto 2 o alcuna scrittura.
