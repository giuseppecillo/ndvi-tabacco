# Agri Precision — rapporto inventario PostgreSQL in sola lettura

## Esito e perimetro

Inventario SQL completato il **6 novembre 2026, ore 18:05:40 Europe/Rome**
(17:05:40 UTC). Questo è un inventario dei metadati, non un collaudo con scritture
né una certificazione di sicurezza o conformità.

- Target autorizzato: progetto `bhnaarbzpmcniesxyldx`, Session pooler
  `aws-0-eu-west-1.pooler.supabase.com:5432`, database `postgres`.
- Regione Ireland e nome Agri Precision: confermati dal titolare; il catalogo
  SQL non certifica autonomamente il nome commerciale o la localizzazione fisica.
- Programma QA invariato rispetto alla versione verificata con 85 test offline.
- TLS: verifica della catena con CA pubblica ufficiale approvata e verifica
  dell'hostname attive e riuscite.
- Transazione esplicita REPEATABLE READ READ ONLY. Ogni SELECT di metadati
  preceduta dal controllo `transaction_read_only='on'`, obbligatorio.
- 16 SELECT di inventario e 16 SELECT di controllo, più BEGIN e ROLLBACK.
  Sequenza dedotta dal programma fisso completato; non è un audit log server.
- Il report di successo viene emesso solo dopo ROLLBACK e chiusura riusciti.
- Nessuna riga applicativa, Auth, Storage o Vault letta. Nessun corpo funzione,
  espressione RLS, valore di default applicativo o credenziale letto.
- Nessun DDL/DML, cambio ruoli/grants/RLS/configurazioni, dato sintetico/reale
  importato, modifica a DATABASE_URL/Clerk/app o script Drizzle eseguito.
- Nessuna connessione ai database Replit da parte del runner.

Evidenza grezza filtrata: `generated-artifacts/supabase-inventory/phase1-approved.json`,
esclusa da Git e dalla pubblicazione. Contiene soltanto l'inventario autorizzato.

## Identità e stato effettivo

| Campo | Risultato |
|---|---|
| PostgreSQL | 17.11 |
| current_database | postgres |
| current_user / session_user | postgres / postgres |
| transaction_read_only | on |
| default_transaction_read_only | off, informativo; non modificato |

La connessione amministrativa non è un account readonly: è la transazione del
programma a essere protetta. Non estendere questa garanzia ad altre sessioni
o a qualsiasi comando eseguito da altri processi del workspace.

## Consistenza dell'inventario

| Sezione | Righe di metadati |
|---|---:|
| Identità | 1 |
| Database | 1 |
| Ruoli | 30 |
| Membership | 24 |
| Schemi non di sistema | 9 |
| Relazioni | 46 |
| Colonne | 451 |
| Vincoli | 142 |
| Indici | 145 |
| Routine selezionate | 121 |
| Default ACL | 24 |
| Policy RLS | 0 |
| Estensioni | 5 |
| Trigger non interni | 12 |
| Event trigger | 7 |
| Indizi SQL sugli schemi PostgREST | 0 |

Nessun limite di righe raggiunto. Le 46 relazioni sono 40 tabelle ordinarie,
1 tabella partizionata, 3 viste e 2 sequenze. La selezione routine comprende
quelle degli schemi non di sistema e 12 overload di funzioni large object
pg_catalog esplicitamente inclusi: non tutte le funzioni interne PostgreSQL.

## Ruoli e membership

I tre ruoli previsti **app_runtime, app_readonly e app_migrator non esistono**.
Non sono stati creati.

| Ruolo | Caratteristiche rilevanti |
|---|---|
| postgres | LOGIN, CREATEROLE, CREATEDB, REPLICATION, BYPASSRLS; non superuser |
| supabase_admin | LOGIN, SUPERUSER, CREATEROLE, CREATEDB, REPLICATION, BYPASSRLS |
| service_role | NOLOGIN, BYPASSRLS |
| supabase_etl_admin | LOGIN, REPLICATION, BYPASSRLS |
| supabase_read_only_user | LOGIN, BYPASSRLS; default readonly configurato nel ruolo |
| supabase_auth_admin | LOGIN, CREATEROLE, NOINHERIT |
| supabase_storage_admin | LOGIN, CREATEROLE, NOINHERIT |
| supabase_replication_admin | LOGIN, REPLICATION |
| authenticator | LOGIN, NOINHERIT; membership con SET nei ruoli API |
| pgbouncer | LOGIN |
| dashboard_user | NOLOGIN, CREATEROLE, CREATEDB, REPLICATION |
| anon, authenticated | NOLOGIN, senza BYPASSRLS |
| supabase_realtime_admin | NOLOGIN, NOINHERIT |
| supabase_privileged_role | NOLOGIN, INHERIT |

Gli altri 15 ruoli sono quelli predefiniti PostgreSQL:
pg_checkpoint, pg_create_subscription, pg_database_owner,
pg_execute_server_program, pg_maintain, pg_monitor, pg_read_all_data,
pg_read_all_settings, pg_read_all_stats, pg_read_server_files,
pg_signal_backend, pg_stat_scan_tables, pg_use_reserved_connections,
pg_write_all_data, pg_write_server_files. La presenza di un ruolo non implica
che un account applicativo ne sia membro.

Tra le 24 membership, postgres eredita anon, authenticated, authenticator,
pg_create_subscription, pg_monitor, pg_read_all_data, pg_signal_backend,
service_role e supabase_privileged_role. Il ruolo gestito supabase_read_only_user
eredita pg_monitor e pg_read_all_data: il suo nome e il suo default readonly
non provano il modello restrittivo richiesto per il futuro app_readonly.
Nessun SET ROLE o accesso di prova con altri account è stato eseguito.

## Privilegi database, schemi e oggetti futuri

- L'ACL del database attribuisce a PUBLIC **CONNECT e TEMPORARY**.
  postgres può creare schemi e oggetti temporanei.
- Lo schema public concede USAGE a PUBLIC, ma non CREATE a PUBLIC nella sua
  ACL rilevata. Il suo proprietario è pg_database_owner.
- Le default ACL di postgres nello schema public concedono ad anon,
  authenticated e service_role privilegi estesi sulle future tabelle
  (SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER/MAINTAIN), sulle
  sequenze (SELECT/UPDATE/USAGE) ed EXECUTE sulle future funzioni.
- Sono presenti 24 default ACL complessive, anche per schemi/creatori gestiti.
  Non sono state modificate e non sono autorizzazioni da copiare automaticamente.
- Gli ACL gestiti di Storage comprendono grant verso anon/authenticated;
  l'accesso alle righe resta condizionato anche da RLS e dagli altri controlli.
- Vault concede a postgres e service_role privilegi sulla tabella secrets e
  sulla vista decrypted_secrets. Sono stati letti solo i relativi ACL, non
  i contenuti o la definizione della vista.

TEMP, routine large object e default ACL sono aspetti da valutare prima di
introdurre i ruoli applicativi. Nessun test di scrittura negata è autorizzato
in questo inventario. Revoche globali su PUBLIC/pg_catalog potrebbero incidere
sui servizi Supabase: non applicare automaticamente gli script preparatori.

## RLS per schema

| Schema | Proprietario | Tabelle, incluse partizionate | RLS attiva |
|---|---|---:|---:|
| auth | supabase_admin | 27 | 16 |
| extensions | postgres | 0 | 0 |
| graphql | supabase_admin | 0 | 0 |
| graphql_public | supabase_admin | 0 | 0 |
| pgbouncer | pgbouncer | 0 | 0 |
| public | pg_database_owner | 0 | 0 |
| realtime | supabase_admin | 3 | 1 |
| storage | supabase_admin | 10 | 10 |
| vault | supabase_admin | 1 | 0 |
| **Totale** | | **41** | **27** |

Nessuna tabella ha FORCE ROW LEVEL SECURITY; zero policy nel catalogo pg_policy.
RLS abilitata senza policy applicabili normalmente nega l'accesso alle righe
per ruoli ordinari soggetti a RLS. Owner e ruoli BYPASSRLS richiedono valutazione
distinta: non dedurre isolamento dal semplice flag RLS.

Le 14 tabelle senza RLS appartengono agli schemi gestiti auth (11), realtime
(2) e vault (1). La loro presenza non dimostra da sola una fuga di dati o
un'esposizione web. Nessuna tabella applicativa nello schema public rilevata;
nessuna conclusione sui contenuti delle tabelle, che non sono stati letti.
Non abilitare RLS o riscrivere ACL sui componenti gestiti senza valutazione
specifica e nuova autorizzazione.

## Schemi effettivamente esposti tramite Data API

**Verifica BLOCCATA entro questo perimetro: non determinabili con l'elenco SQL autorizzato.**

La query ammessa sui soli pgrst.db_schemas e pgrst.db_extra_search_path nelle
impostazioni database/ruolo ha restituito zero righe. Questo non significa
Data API disattivata o nessuno schema esposto: la configurazione effettiva può
essere gestita fuori da quei cataloghi.

Esistenza degli schemi, USAGE e ACL non provano la configurazione del servizio
PostgREST. Non sono state eseguite chiamate API, letture di impostazioni extra,
introspezioni GraphQL, autenticazioni aggiuntive o richieste alla dashboard.
Per certificare gli Exposed schemas serve una nuova autorizzazione a un
controllo della configurazione effettiva, eventualmente fornita dal titolare.

## Routine, estensioni e automatismi esistenti

121 routine selezionate: auth 4, extensions 55, graphql_public 1,
pg_catalog 12, pgbouncer 1, public 1, realtime 18, storage 24, vault 5.
7 routine SECURITY DEFINER complessive.

L'unica routine public è **rls_auto_enable**, proprietario postgres,
SECURITY DEFINER, VOLATILE, con EXECUTE a PUBLIC/anon/authenticated/service_role.
Il suo OID coincide con la funzione dell'event trigger **ensure_rls**,
abilitato su ddl_command_end. Questo collegamento non prova una RPC invocabile
ordinariamente né una vulnerabilità sfruttabile: corpi e configurazioni della
funzione non erano inclusi nell'autorizzazione e la funzione non è stata chiamata.
È un automatismo da considerare prima di qualsiasi futuro DDL.

Le altre SECURITY DEFINER sono pgbouncer.get_auth, tre routine lifecycle di
Storage e due routine Vault; per esse public_execute è false.
Restano fuori ambito analisi di corpi, search_path delle routine e chiamate RPC.

Nei 12 overload large object esaminati, 9 hanno EXECUTE a PUBLIC, inclusi
lo_create/lo_creat/lo_from_bytea/lo_put/lo_open/lowrite/lo_truncate/
lo_truncate64/lo_unlink. lo_export e i due overload lo_import non lo hanno.
Questi sono metadati ACL, non prove di esecuzione riuscita o di scritture in
READ ONLY. Nessuna routine large object è stata eseguita.

Estensioni rilevate: pg_stat_statements 1.11, pgcrypto 1.3, plpgsql 1.0,
supabase_vault 0.3.1, uuid-ossp 1.1. Sono presenti 12 trigger non interni
e 7 event trigger: nessuno attivato tramite DML/DDL da questo runner.

## Rischi e verifiche da autorizzare separatamente

| Priorità | Evidenza | Conseguenza / limite |
|---|---|---|
| Alta, prima dell'uso ordinario | Account QA postgres con BYPASSRLS e privilegi amministrativi | Non usarlo come app_runtime/app_readonly; runner protetto non equivale a isolamento globale del workspace |
| Alta, prima di creare tabelle applicative | Default ACL public ampie verso ruoli API | Possibili privilegi inattesi sui nuovi oggetti; esposizione effettiva Data API ancora da verificare |
| Da verificare, blocca una certificazione dell'esposizione | Zero indizi SQL PostgREST | Non certificabili gli schemi esposti senza configurazione effettiva |
| Media, prima del collaudo ruoli | PUBLIC TEMPORARY e EXECUTE su routine large object | Un futuro ruolo readonly richiede analisi e test dedicati, senza revoche globali automatiche |
| Da verificare prima del DDL | Event trigger ensure_rls e routine SECURITY DEFINER | Possibili effetti automatici del futuro DDL; implementazione non letta e nessuna prova eseguita |
| Da progettare | Nessuno dei tre ruoli applicativi esiste | Separazione runtime/readonly/migrator non ancora implementata né collaudata |

Queste priorità riguardano la futura introduzione dei ruoli e dei dati
applicativi; non sono una dichiarazione di compromissione del progetto.

**STOP al termine dell'inventario.** Creazione ruoli/schemi/tabelle, test con
scritture sintetiche, analisi aggiuntive non nell'elenco, modifiche a default
ACL/RLS/funzioni/configurazioni e migrazione richiedono nuova autorizzazione.
