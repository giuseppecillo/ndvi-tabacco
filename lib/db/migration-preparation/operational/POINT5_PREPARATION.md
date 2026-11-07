# Punto 5 — perimetro del collaudo autorizzato

Esecuzione completata nel solo perimetro seguente. Esiti e finding in
POINT5_RESULTS.md; nessuna fase successiva avviata.

Solo il Supabase Agri Precision esistente. Nessun altro database/progetto,
nessuna connessione Replit, nessun dato reale, nessuna attivazione LOGIN.

## Unica verifica aggiuntiva eseguita: metadati READ ONLY

phase5-preflight.ts ha riutilizzato targetClient e la verifica TLS corretta:
CA ufficiale, certificato/hostname verificati, transazione REPEATABLE READ
READ ONLY, probe read-only prima delle SELECT, ROLLBACK e chiusura.
Nessuna lettura dei contenuti applicativi e nessuna scrittura.

Risultato necessario per definire il collaudo:

- postgres può già assumere app_migrator e i tre ruoli API.
- postgres ha ADMIN OPTION ma non SET per app_runtime e app_readonly.
- Entrambi ereditano TEMP e EXECUTE su lo_create/lo_from_bytea.
- Entrambi non hanno CREATE sullo schema public.

I permessi TEMP/large object non equivalgono a accesso alle tabelle
applicative. Sono però un limite al requisito di readonly globale, da
collaudare e riportare senza correggere automaticamente privilegi PUBLIC.

## Operazioni esatte approvate per il collaudo

1. Verifica TLS/target e precondizioni indispensabili: cinque tabelle ancora
   vuote, nessuna modifica inattesa alle 15 policy, ruoli ancora NOLOGIN.
   Se non sono vuote o la struttura diverge, fermarsi senza inserimenti.
2. Aprire una sola transazione READ WRITE, senza mai inviare COMMIT.
   Timeout e lock soltanto locali alla transazione. Lock circoscritti alle
   cinque tabelle target per impedirne modifiche concorrenti durante il test;
   nessun blocco dell'applicazione Replit.
3. Nella stessa transazione, SOLO se ancora necessari:
   GRANT app_runtime TO postgres WITH SET TRUE;
   GRANT app_readonly TO postgres WITH SET TRUE;
   Non concedere membership a ruoli API/provider e non modificare LOGIN,
   password, attributi dei ruoli o privilegi globali.
4. Assumere app_migrator con SET LOCAL ROLE e inserire nove fixture:
   due app_users, due osservazioni, due privacy_requests, due security_events,
   un security_state. IDs con prefisso qa_p5_ e UUID, email example.invalid,
   nomi, coordinate e NDVI sintetici. Nessuna chiamata Clerk/email/HTTP.
5. Eseguire la specifica pura phase5-cases.mjs: 101 casi, di cui 33 successi
   attesi, 62 dinieghi attesi e 6 sonde di capacità globali. Ogni caso è protetto da un
   SAVEPOINT creato PRIMA di SET LOCAL ROLE. Rollback al savepoint anche
   dopo un successo; nessun caso può sporcare quello successivo.
   - SELECT dei tre ruoli applicativi su tutte le cinque tabelle.
   - Runtime: CRUD autorizzato sulle tre tabelle previste, INSERT audit,
     anonimizzazione separata di actor_id e target_id a NULL; controllo della
     cancellazione a cascata dei soli figli sintetici.
   - Runtime: divieti su scritture security_state, riscrittura degli altri
     campi audit, cancellazione/troncamento audit e DDL non autorizzato.
   - Readonly: divieti INSERT/UPDATE/DELETE/TRUNCATE sulle cinque tabelle,
     mentre transaction_read_only=off: un errore 25006 non vale come prova
     delle ACL. Accettare come diniego atteso solo 42501.
   - API: SELECT e INSERT negati su ciascuna delle cinque tabelle per
     anon/authenticated/service_role, inclusa service_role con BYPASSRLS.
   - Migrator: UPDATE e operazioni strutturali CREATE/ALTER/DROP esclusivamente
     su una tabella-prova public qa_p5_<uuid>_probe.
   - Runtime/readonly: tentativi negati di CREATE public e disattivazione RLS.
   - Sei sonde circoscritte: due CREATE TEMP TABLE e quattro creazioni di
     large object (vuoti o quattro byte); gli OID eventualmente creati sono
     registrati in memoria e annullati subito con rollback al savepoint.
     Un successo è un finding di privilegio globale, non un test superato.
6. Confrontare tutte le 15 policy per tabella, comando, ruoli, USING e
   WITH CHECK con POLICY_SPEC, senza modificarle. Non testare escalation
   mediante SET ROLE da questa sessione amministrativa: tale istruzione
   valuta session_user. Usare metadati di membership per le possibilità di
   escalation dei ruoli applicativi.
7. Provare l'eliminazione esplicita di tutte le fixture come app_migrator,
   con DELETE limitati agli ID/chiavi noti, e verificare zero righe.
   Non tentare di rendere cancellabile l'audit dal runtime.
8. Terminare sempre con ROLLBACK e chiusura. Gli eventuali GRANT SET,
   fixture, DDL-prova, TEMP e large object non devono essere confermati.
9. Con una nuova connessione protetta READ ONLY verificare: cinque tabelle
   ancora vuote, membership uguali a quelle iniziali, policy/attributi
   invariati, assenza delle relazioni e degli OID di prova noti.
   Pubblicare solo risultati aggregati e SQLSTATE, non errori grezzi.

Errore inatteso, SQLSTATE diverso dal diniego atteso o precondizione fallita:
stop e rollback, nessuna ripetizione automatica o correzione di privilegi.
Se la pulizia non è verificabile, dichiararla bloccata; non affermare un esito
positivo. I finding TEMP/large object sono raccolti dopo rollback del singolo
caso e rendono non superato il requisito di isolamento globale.

## Limiti dichiarati

- SET LOCAL ROLE prova DML/DDL e policy del ruolo, non un login diretto.
  I tre ruoli restano NOLOGIN.
- Le policy distinguono ruoli PostgreSQL; l'isolamento tra utenti Clerk è
  applicativo Express e non è certificato da questo collaudo SQL.
- Pulizia significa assenza di oggetti/record SQL persistenti. Non è
  certificazione di cancellazione fisica da WAL, log o backup del provider.
- Non utilizzare tests/run-isolated.sh o altri runner che creano database.

## Passaggio successivo già definito, ma non autorizzato

Solo dopo collaudo positivo e risoluzione autorizzata di eventuali finding:

1. Richiedere autorizzazione specifica al blocco effettivo di tutti gli
   scrittori Replit (incluse vecchie istanze e richieste GET con side effects).
   Usare maintenance.mjs/CUTOVER.md, senza pubblicare o cambiare flag ora.
2. Confermata la quiescenza, richiedere backup finale cifrato tramite
   backup-production.mjs, riutilizzando il destinatario pubblico già approvato,
   con nuovo archivio/checksum e verifica completa. Non sovrascrivere il primo.
3. Richiedere autorizzazione specifica a import.ts sul target ancora vuoto:
   cinque sezioni COPY, 60 colonne nominate, stessi ID, Clerk invariato,
   controlli conteggi prima del COMMIT e protezioni RLS ripristinate.
4. Confronto con compare.ts/integrity.sql: conteggi, digest di tutte le colonne,
   relazioni, mapping amministratore e osservazioni, senza ricalcolare dosi.
5. Solo con ulteriore consenso: credenziali/LOGIN, connessione dell'app,
   eventuale pubblicazione e riapertura scritture. Dopo scritture target,
   rollback richiede conservazione/riconciliazione del delta, non ritorno cieco
   al vecchio URL.

Nessuna di queste operazioni viene avviata dalla preparazione o dal collaudo.

## Verifiche offline della preparazione

7 nuovi test puri della specifica superati: fixture e ruoli autorizzati,
15 policy attese, aggiornamenti audit NULL-only nei casi positivi, sonde
circoscritte, assenza di comandi di transazione/credenziali nella specifica,
identificatori non iniettabili e nessun accesso a connessioni/Secrets.
TypeScript del preflight superato. Successivamente sono stati aggiunti
quattro test offline delle precondizioni/vincoli del runner e TypeScript,
superati prima dell'unica esecuzione autorizzata. Il runner run-phase5.ts
ha usato la specifica senza aggiungere remediation; risultati in POINT5_RESULTS.md.
