# Verifica autorizzata degli schemi — 6 novembre 2026

## Esito e limiti

**PASS per il confronto dei metadati applicativi Development/Production letti.
NON è un via libera alla migrazione.**

Il titolare ha autorizzato la lettura dei soli schemi dopo la preparazione
inattiva. Sono state eseguite esclusivamente SELECT sui cataloghi PostgreSQL e
information_schema, attraverso i percorsi separati Replit di sviluppo e
produzione. La lettura Production passa attraverso il percorso read-only della
piattaforma; è una fotografia dei metadati restituiti, non una garanzia di
sincronizzazione istantanea con l'API pubblicata.

Non sono stati letti record applicativi, email, identificativi degli utenti,
coordinate, rilievi o valori di security_state. I numeri sotto contano oggetti
dello schema, NON record applicativi. Nessun dato scritto, nessun dump o restore,
nessuna nuova credenziale, nessun progetto Supabase, nessun riavvio o deploy.

## Metadati osservati

| Elemento | Development | Production |
|---|---|---|
| Versione PostgreSQL restituita | 16.10 | 16.15 (23d2a0d) |
| Tabelle applicative in public | 5 | 5 |
| Colonne applicative | 60 | 60 |
| Vincoli dichiarati | 12 | 12 |
| Indici | 8 | 8 |
| Viste/materialized views in public | 0 | 0 |
| Sequenze in public | 0 | 0 |
| Funzioni in public | 0 | 0 |
| Trigger non interni in public | 0 | 0 |
| Policy RLS in public | 0 | 0 |
| Tabelle con RLS attiva | 0 | 0 |
| app_runtime/app_readonly/app_migrator | non presenti | non presenti |

Tabelle: app_users (13 colonne), osservazioni (33), privacy_requests (7),
security_events (5), security_state (2).

Gli array ordinati dei metadati delle colonne, dei vincoli e degli indici
coincidono nei due ambienti. Per le colonne sono stati confrontati anche
ordine, tipo/UDT, nullability, default, lunghezza e precisione/scala.

I 12 vincoli sono 5 PK, 2 UNIQUE su app_users, 3 CHECK su app_users e 2 FK con
ON DELETE CASCADE. Gli 8 indici includono le 5 PK, le 2 unicità degli utenti e
l'unicità (owner_id, observation_id). Non sono stati controllati dati orfani,
duplicati, conteggi delle righe o corrispondenza delle identità: leggere la
struttura delle FK non equivale a confrontare i record.

### Proprietà e permessi

- Development: le cinque tabelle sono possedute da postgres; il catalogo di
  questo ruolo riporta superuser, BYPASSRLS, CREATEROLE, CREATEDB e replication.
- Production: le cinque tabelle sono possedute da neondb_owner; il catalogo
  riporta BYPASSRLS, CREATEROLE, CREATEDB e replication, non superuser, e
  membership in neon_superuser.
- I grants tabella visibili sono al proprietario, comprese scritture, TRUNCATE,
  REFERENCES e TRIGGER. Non sono stati interpretati come grants da ricopiare ai
  ruoli ordinari.
- public è posseduto da pg_database_owner; l'ACL riporta USAGE per PUBLIC ma
  non CREATE per PUBLIC.
- Development non riporta default ACL personalizzati. Production riporta
  default ACL di piattaforma per tabelle e sequenze, da NON copiare alla cieca.
- L'estensione restituita nei due ambienti è plpgsql 1.0 in pg_catalog.

Questi sono proprietari e privilegi di catalogo, NON una misura del ruolo
effettivamente usato da ogni processo backend. Non sono state lette stringhe di
connessione o cambiate credenziali per determinarlo. L'assenza di RLS non
dimostra accesso pubblico ai dati: attualmente l'isolamento utenti è nel backend.
Con Supabase bisognerà impedire esposizioni involontarie via Data API e verificare
sia grants sia eventuali policy.

### Oggetti non applicativi

Development riporta solo public tra gli schemi non di sistema interrogati.
Production riporta anche `_system`, con una tabella e una sequenza.
Non sono stati letti i contenuti né si assume che questi oggetti appartengano
all'app. Il futuro inventario di restore deve escluderli per default e confermare
eventuali dipendenze: il dump completo revisionato NON significa importare
indiscriminatamente oggetti tecnici della piattaforma.

## Confronto con le bozze inattive

### Baseline 0001

- Sono presenti tutte le 60 colonne delle cinque tabelle; nomi, tipi di base e
  nullability corrispondono ai metadati letti.
- I default corrispondono semanticamente; PostgreSQL rappresenta il default di
  scadenza come `now() + '30 days'::interval`, mentre la bozza usa
  `now() + interval '30 days'`. È la stessa espressione, non una differenza nei
  giorni di abbonamento. Nessuna data esistente è stata letta o ricalcolata.
- PK, UNIQUE, CHECK, FK e indice composto dichiarati nella bozza corrispondono
  alla struttura osservata nella revisione statica.
- **L'ordine delle colonne è diverso in app_users e osservazioni**. Nella fonte,
  le colonne abbonamento di app_users sono le ultime due; owner_id e
  observation_id sono le ultime due di osservazioni, mentre la bozza le colloca
  prima. Anche eta_piantina e alcuni campi agronomici hanno posizioni diverse.
- La baseline non replica proprietari/default ACL tecnici; questo è intenzionale
  ma richiede la mappatura autorizzata degli oggetti al ruolo migrator.

Non dichiarare uguaglianza fisica della baseline con lo schema osservato.
La sintassi e i vincoli della bozza NON sono stati eseguiti su un target di prova.

### Riparazione 0002

Non applicare automaticamente il backfill observation_id. Non abbiamo letto i
record e quindi NON sappiamo se esistano valori mancanti. Un restore fedele deve
preservare anche i NULL; una riparazione successiva richiede verifica dei dati e
autorizzazione separata.

### Bozza ruoli e controlli di connessione

I tre ruoli sono ancora solo una proposta. Mancano target, grants effettivi,
ownership revisionata e verifica reale dell'adattatore d'ispezione.
I test offline della preparazione non dimostrano che i privilegi Supabase siano
corretti. Non attivare il normale backend con app_migrator o con un proprietario
amministrativo.

## Strategia consigliata

**Preferire restore completo degli oggetti applicativi selezionati e revisionati,
in una destinazione vuota autorizzata, senza eseguire prima la baseline 0001.**

È la strada che conserva la struttura sorgente, compreso l'ordine delle colonne,
senza ricostruire utenti, proprietari dei rilievi o scadenze. Non è stato creato
alcun backup e il restore non è stato provato: la raccomandazione non certifica
ancora la recuperabilità.

Se si sceglie invece baseline + import dati:

1. Completare la verifica della baseline su PostgreSQL isolato.
2. Usare sempre liste di colonne esplicite per COPY/INSERT/export; vietato
   trasferire CSV o record per sola posizione.
3. Confrontare tutte le colonne con serializzazione deterministica per nome,
   non affidarsi al solo ordine di to_jsonb o ai soli conteggi.
4. Verificare integralmente identità, proprietà, consensi, abbonamenti e dati
   agronomici su uno snapshot coerente, con distinta autorizzazione ai dati.

Non combinare le due strategie e non sostituire Production con Development solo
perché gli schemi risultano uguali.

## Piano attuativo revisionato, NON eseguito

1. Autorizzare separatamente destinazione, regione e ambiente di prova isolato.
   L'ambiente di prova può essere temporaneo, non un secondo database permanente;
   senza tale autorizzazione non eseguire DDL/DML per test.
2. Revisionare inventario/dipendenze, produrre backup autorizzato e provarne il
   restore con gli strumenti compatibili con le versioni source/target.
3. Creare i tre ruoli e verificare ownership, membership transitiva, grants
   PUBLIC/default ACL, funzioni, viste, sequenze e Data API. Non installare le
   credenziali del migrator nello sviluppo ordinario.
4. Configurare app_runtime nella sola pubblicazione Replit e app_readonly nei
   controlli ordinari di sviluppo. Una preview readonly non può provare le
   scritture. Un'eventuale credenziale QA deve avere autorizzazione distinta.
5. Preparare il codice di attivazione per ENTRAMBI i pool, l'ispezione reale del
   ruolo e dello schema; separare DDL/backfill/bootstrap dall'avvio conservando
   l'audit. Togliere push-force/push-deployment dal percorso automatico solo nel
   medesimo intervento autorizzato. Nessun DDL nel build/deploy.
6. Chiedere permesso ai confronti dati e ai test completi; usare account sintetici
   e destinazione isolata. Non inviare inviti/email reali per un test di schema.
7. Presentare risultati del restore, grants e confronto dati; solo dopo nuova
   autorizzazione: manutenzione, backup finale, blocco scritture, import finale,
   cambio credenziali e pubblicazione coordinata. Mantenere la sorgente per il
   rollback; riconciliare eventuali nuove scritture prima di tornare indietro.

## Decisione finale

**GO soltanto per proseguire la preparazione e richiedere i permessi successivi.
NO-GO per migrazione, rimozione degli automatismi o cambio DATABASE_URL adesso.**

Sono confermati i metadati osservati e la strategia raccomandata. Restano non
eseguiti il backup/restore, il confronto dei record, il collaudo SQL e dei ruoli
Supabase, l'ispezione del ruolo effettivo di runtime e qualsiasi cutover.
Clerk, Netlify, pubblicazione e database esistenti restano invariati.
