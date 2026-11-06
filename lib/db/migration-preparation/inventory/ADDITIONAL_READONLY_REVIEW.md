# Verifiche aggiuntive Supabase — revisione prima dell'esecuzione

## Stato al 6 novembre 2026

Questa revisione è **solo documentale**. Non modifica il programma QA, SQL
preparatorio, ruoli, privilegi, database, applicazione, Secrets o workflow.
Nessuna nuova connessione PostgreSQL è stata eseguita per questa revisione.

Target invariato: Agri Precision, project reference `bhnaarbzpmcniesxyldx`,
Session pooler `aws-0-eu-west-1.pooler.supabase.com:5432`, database `postgres`.
Il piano corrente riguarda il solo database; Clerk ed Express restano invariati.

| Verifica | Evidenza disponibile | Stato |
|---|---|---|
| Enable Data API | Schermata ufficiale Overview fornita dal titolare | Attivo nella schermata |
| Exposed schemas | Non visibili nella schermata Overview | In attesa di Settings |
| Extra search path | Non visibile | In attesa di Settings |
| Automatically expose new tables | Non visibile | In attesa di Settings, se presente |
| Corpo e search_path di rls_auto_enable | Non inclusi nelle 16 SELECT del QA originale | Da autorizzare l'estensione offline |
| evttags e collegamento completo di ensure_rls | Inventario iniziale parziale | Da autorizzare l'estensione offline |

La schermata ricevuta identifica l'endpoint del progetto autorizzato. Non prova
gli schemi esposti né la raggiungibilità di singole tabelle. Nessuna richiesta
REST/GraphQL su oggetti dati è necessaria o proposta.

Per completare la prima parte: Dashboard del progetto → Integrations → Data API
→ Settings. Fornire i soli campi indicati sopra, oscurando eventuali credenziali,
senza modificare toggle, salvare impostazioni o creare chiavi.

## Due SELECT proposte, NON eseguite

Non sono ancora nell'elenco autorizzato del programma verificato con 85 test.
Proposta: modalità separata del solo QA, lasciando invariata la modalità
inventario originale. Prima implementazione e test offline, poi presentazione
dei risultati al titolare e conferma prima della connessione.

### 1. Definizione della sola routine senza argomenti

```sql
SELECT p.oid::text AS routine_oid,
  n.nspname, p.proname, p.prokind,
  pg_catalog.pg_get_userbyid(p.proowner) AS owner,
  l.lanname, p.prosecdef, p.provolatile,
  pg_catalog.pg_get_function_identity_arguments(p.oid) AS argument_types,
  pg_catalog.pg_get_function_result(p.oid) AS result_type,
  p.proconfig, p.proacl::text AS acl,
  pg_catalog.pg_get_functiondef(p.oid) AS definition
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
JOIN pg_catalog.pg_language l ON l.oid = p.prolang
WHERE n.nspname = 'public'
  AND p.proname = 'rls_auto_enable'
  AND p.pronargs = 0 AND p.prokind = 'f'
LIMIT 2
```

### 2. Metadati del solo event trigger

```sql
SELECT e.evtname, e.evtevent, e.evtenabled, e.evttags,
  e.evtfoid::text AS routine_oid,
  pg_catalog.pg_get_userbyid(e.evtowner) AS owner,
  n.nspname AS routine_schema, p.proname AS routine_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) AS argument_types,
  pg_catalog.pg_get_function_result(p.oid) AS result_type
FROM pg_catalog.pg_event_trigger e
JOIN pg_catalog.pg_proc p ON p.oid = e.evtfoid
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE e.evtname = 'ensure_rls'
LIMIT 2
```

La prima legge testo e configurazione dal catalogo: **non chiama la routine**.
La seconda non scatena il trigger. Non chiamare
`public.rls_auto_enable()` o `pg_event_trigger_ddl_commands()`.

## Barriere della futura estensione QA

- Solo target già approvato e Secret `SUPABASE_QA_ADMIN_URL`; nessun accesso,
  confronto o fallback a `DATABASE_URL`, PG* o credenziali dell'applicazione.
- CA ufficiale verificata, `rejectUnauthorized: true` e hostname verificato.
- Ambiente figlio con la sola allowlist attuale; nessun modulo dell'app.
- `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY`.
- Identità PostgreSQL verificata e controllo `transaction_read_only='on'`
  prima di ogni SELECT, incluse le due nuove letture.
- Solo SELECT statiche ammesse; niente query libere, SQL dinamico, SET ROLE,
  prove DDL/DML, dati di public/Auth/Storage/Vault o fallback in caso di errore.
- Esattamente una routine e un trigger; OID collegati coerenti e tipo di ritorno
  `event_trigger`. Assenza, ambiguità o divergenza bloccano il rapporto completo.
- Qualsiasi errore o controllo non disponibile: STOP, ROLLBACK, chiusura.
- `ROLLBACK` e chiusura obbligatori anche in caso di successo.
- Definizione e configurazione solo in evidenza locale protetta, ignorata da
  Git/pubblicazione, directory 0700 e file 0600. Mai corpo integrale su log/chat.
  In chat solo sintesi revisionata, stato dei controlli ed eventuali blocchi.
- Nessuna inclusione in build, avvio, workflow, post-merge o pubblicazione.

I test offline dovranno coprire: allowlist separata; impossibilità di eseguire
il corpo; sequenza probe/SELECT; perdita del read-only; target diverso;
TLS/hostname/CA obbligatori; risultati mancanti o OID incoerenti; protezione
dell'output; errori di rollback/chiusura. I precedenti test restano applicabili.

## RLS: conclusioni già possibili e limiti

L'esempio ufficiale Supabase abilita RLS sulle nuove tabelle di public per
CREATE TABLE / CREATE TABLE AS / SELECT INTO, non crea policy e può rilanciare
un errore interrompendo il DDL. **Non è ancora provato che il corpo installato
sia uguale all'esempio.** Search_path, filtri e gestione degli errori effettivi
restano da leggere con il QA revisionato.

Se RLS è attiva senza policy applicabili, un backend non proprietario
`app_runtime NOBYPASSRLS` non ottiene accesso alle righe solo grazie ai GRANT.
Servono ACL e policy backend esplicite. Non risolvere concedendo BYPASSRLS.
Una policy backend `TO app_runtime USING (true) WITH CHECK (true)` non isola
i clienti: resta necessario il filtro Express owner_id/user_id.

Il collegamento Clerk userId → clerk_user_id → app_users.id → owner_id resta
invariato. La connessione pg di Express non riceve automaticamente auth.uid()
o il JWT dell'utente. I ruoli API anon/authenticated/service_role sono distinti
dai tre ruoli SQL applicativi e non vanno usati come sostituti del backend.

La capacità della SECURITY DEFINER posseduta da postgres di alterare tabelle
create da app_migrator resta da collaudare separatamente: BYPASSRLS non equivale
a ownership o al diritto di ALTER TABLE. Un test fuori public non certifica
il comportamento di un trigger limitato a public.

## Matrice minima revisionata sul codice, non su dati reali

| Tabella | app_runtime | Motivazione |
|---|---|---|
| app_users | SELECT, INSERT, UPDATE, DELETE | Accesso, inviti, gestione account, privacy, cancellazione |
| osservazioni | SELECT, INSERT, UPDATE, DELETE | Registro e percorsi di cancellazione |
| privacy_requests | SELECT, INSERT, UPDATE | Richieste e risposte; cancellazione per FK ON DELETE CASCADE |
| security_state | SELECT | Mapping iniziale; nessun bootstrap runtime |
| security_events | SELECT, INSERT, UPDATE(actor_id,target_id) | Registro e anonimizzazione degli identificativi |

Rispetto alla bozza precedente, DELETE diretto su privacy_requests non è
necessario al codice attuale: la cancellazione dell'account agisce tramite
la FK della baseline. Tale FK dovrà essere confermata sullo schema finale.

Per le due UPDATE di anonimizzazione, PostgreSQL richiede UPDATE sulle colonne
destinazione e SELECT sulle colonne usate nei WHERE. Il SELECT già previsto
per il registro copre actor_id/target_id; servono anche policy RLS SELECT e
UPDATE applicabili. Non servono UPDATE su action/created_at o DELETE degli eventi.

Correzione SQL **solo proposta, non applicata**:

```sql
-- Presuppone oggetti e ruoli futuri, ownership e ACL già revisionati.
GRANT SELECT, INSERT, UPDATE ON TABLE public.privacy_requests TO app_runtime;
GRANT SELECT, INSERT ON TABLE public.security_events TO app_runtime;
GRANT UPDATE (actor_id, target_id) ON TABLE public.security_events TO app_runtime;
```

Un GRANT più ristretto non rimuove un eventuale precedente UPDATE di tabella o
DELETE: prima dell'applicazione serve un inventario degli ACL effettivi, inclusi
PUBLIC e membership. Non applicare questi frammenti come hardening autosufficiente.

Restano valide le altre condizioni della bozza documentale: oggetti creati
effettivamente come app_migrator, default ACL chiusi del solo creatore
applicativo, nessun grant API sulle cinque tabelle e app_readonly limitato a
viste redatte da approvare. Non applicare roles.sql attuale: contiene revoche
globali e letture di tabelle personali che richiedono una revisione distinta.

## Stato finale di questa revisione

**Non è un collaudo dei permessi riuscito sul server.** Sono completati il
controllo statico dei percorsi applicativi e la proposta delle letture minime.
Mancano Settings Data API, implementazione/collaudo offline autorizzati del QA,
poi conferma alla lettura effettiva di routine/trigger. Nessuna fase con
scritture sintetiche, creazione ruoli o migrazione può iniziare automaticamente.

Fonti ufficiali consultate il 6 novembre 2026:
- https://supabase.com/docs/guides/api/securing-your-api
- https://supabase.com/docs/guides/database/postgres/event-triggers
