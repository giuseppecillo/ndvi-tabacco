# Piano operativo definitivo — Replit Production → Supabase Agri Precision

Stato: piano approvato dal titolare; preparativi operativi avviati.
Questo documento prevale sui passaggi ormai superati delle checklist precedenti.
Non autorizza operazioni per il solo fatto di essere presente nel repository.

### Avanzamento effettivo — 8 novembre 2026, 15:24 UTC circa

- Approvazione dell'intero perimetro ricevuta.
- Tool import/compare compilati e programmi PostgreSQL/age disponibili.
- Chiave esistente presente, permessi verificati e corrispondenza con il
  destinatario pubblico confermata senza stampare la chiave.
- Esclusioni Git/pubblicazione verificate; connessioni operative dedicate
  presenti nei Secrets, senza lettura dei valori da parte dell'Agent.
- Primo rollout manuale riuscito: revisione 8fe74dfb LIVE. Health 200;
  osservazioni 503 con messaggio di migrazione, no-store e Retry-After.
  Preflight Production passed: backend ancora Replit, schema read-only.
- Accesso all'interfaccia NON verificato: il titolare ha chiarito di non
  poterlo provare. Ha richiesto conteggi e trasferimento dopo i gate SQL.
- Sospensione degli scrittori esterni attestata dal titolare. Quiete
  confermata prima e dopo il backup: due campioni per controllo, nessun
  altro client/transazione/prepared transaction/subscription/scheduler.
  Non equivale a un blocco SQL permanente delle connessioni esterne.
- Conteggi Production: app_users 1, security_state 1, privacy_requests 0,
  security_events 1, osservazioni 22.
- Backup finale:
  generated-artifacts/production-backup/2026-11-08T15-22-12.328Z-LjiaOm/
  database.dump.age (16127 byte), checksum.json nella stessa cartella.
  SHA-256 b985567eaea8f6f886f258bdd40962e7d3c0e2c0f6c8807f8c6db7f21c07eb55.
  Verificati checksum indipendente, decifratura autenticata e parsing
  integrale senza connessione DB. Chiave esistente separata e non esposta.
- Importazione completata: IMPORTED_NOT_CUT_OVER. Conteggi identici.
  Transazione conclusa con ripristino FORCE RLS e gate pre-COMMIT positivi
  (15 policy, ownership, ACL Data API, relazioni e amministratore).
- Confronto ALL_60_COLUMNS_MATCH_NO_CUTOVER: tutte le righe e tutte le
  60 colonne coincidono, conteggi e SHA-256 identici per ciascuna tabella;
  controlli d'integrità positivi su origine e destinazione.
- Predisposto SECONDO rollout: backend supabase, pausa 1, preflight
  aggiuntivo 0, allowlist del solo amministratore iniziale Clerk esistente.
  Questa configurazione è soltanto predisposta: attende Republish manuale.
  Il backend LIVE resta Replit; DATABASE_URL non è stato modificato.
- Il prossimo gate è il collaudo applicativo riservato al pilota, NON
  ancora eseguito. Nessuna riapertura generale autorizzata dai soli hash.

### Secondo rollout — gate ancora aperto

Revisione b68f628b LIVE (8 novembre 2026, 15:27 UTC); health 200,
API osservazioni 503 con messaggio di migrazione. Log della revisione:
preflight aggiuntivo disabled, verifica schema read-only superata.
Non è presente un log del backend operativo o del successo della verifica
identità runtime. La configurazione Production predisposta indica supabase,
ma questo dato non dimostra da solo il valore effettivo nel processo.
Non attestare ancora il backend operativo Supabase né il collaudo UI.
Occorre controllare gli eventuali override nei Deployment app secrets
prima dell'accesso pilota. Nessuna ripetizione di backup/import/confronto.
Terzo rollout NON predisposto, pausa ancora attiva.

Controllo aggiuntivo indispensabile: la lettura READ ONLY dei metadati delle
sessioni target non ha rilevato sessioni app_runtime al momento del controllo.
Questo non prova da solo che Supabase non sia usato (pool inattivi possono
chiudersi). Predisposto log di avvio non sensibile con backend effettivo,
esito runtimeIdentity, manutenzione e numero piloti, emesso soltanto dopo
il controllo identità esistente. Nessun controllo o collegamento modificato.
TypeScript, build API e i 3 test offline mirati alla sicurezza dell'avvio
superati; API sviluppo riavviata correttamente. Il riscontro di sviluppo
non attesta Production. Richiesto rollout diagnostico ancora in manutenzione,
prima del collaudo applicativo e della riapertura.

### Rollout diagnostico — backend target attestato

Revisione 82f85820 LIVE, 8 novembre 2026, 15:37 UTC. L'audit dei log
della sola nuova revisione rileva alle 15:37:12.846Z:
backend supabase, runtimeIdentity passed, maintenance true, pilotAccounts 1.
Questo attesta il superamento della verifica obbligatoria del pool
operativo (app_runtime, TLS/CA/hostname, READ ONLY e ROLLBACK).
Verifica schema read-only positiva e health 200 alle 15:37:14.671Z.
Il preflight aggiuntivo source-only resta disabled come previsto.
Nessun errore fatale d'avvio; i probe 500 precedono la readiness.

Il collaudo autenticato e i dati nell'interfaccia restano NON verificati.
Prossimo passo: accesso manuale del titolare con l'account amministratore
originale, senza token/password in chat né account sostitutivi.
Nessun terzo rollout o riapertura prima del collaudo applicativo completo.

Il titolare ha successivamente confermato «Accedo e vedo i rilievi».
Accesso amministratore e consultazione dei rilievi sono attestati dal
titolare, non da un browser automatizzato dell'Agent. Restano da collaudare
esportazione/mappe e creazione/rilettura/aggiornamento/eliminazione del solo
rilievo sintetico. Non dichiarare concluso il collaudo applicativo.

Il titolare ha poi confermato: rilievo sintetico salvato e presente dopo
ricaricamento, Excel aperto correttamente, spazializzazione e dosi su mappa
funzionanti. Queste sono prove manuali dichiarate dal titolare.
Restano aggiornamento e cancellazione del solo ID QA-MIGRAZIONE-20261108.

L'interfaccia impedisce ID già usati e non espone la modifica dei salvati:
non chiedere all'utente di usare un pulsante inesistente. Predisposto
pilot-browser-check.js da eseguire manualmente nella sessione Production
già autenticata, senza acquisire cookie/token o creare sessioni sostitutive.
Usa soltanto GET, POST sul singolo record sintetico identificato e DELETE
con ID esplicito; interrompe ogni scrittura con origine/record non validi.
La prova cambia solo il sintetico a NDVI 1 e piano N zero, ne verifica
l'aggiornamento, lo elimina e ne verifica l'assenza.
I 7 nuovi test offline di sicurezza dello script sono superati.
Lo script NON è ancora stato eseguito in Production. Nessuna riapertura.

### Accesso al collaudo durante la manutenzione

Dopo il secondo Republish e la verifica del pool operativo Supabase,
il titolare apre il sito Production /sign-in con il proprio account
amministratore Clerk già esistente, poi /user-portal. Il middleware
consente soltanto il Clerk ID originale del pilota, verificato sul server;
gli altri utenti ricevono ancora 503. Nessuna credenziale in chat.

Se l'accesso resta bloccato, fermare il collaudo e diagnosticare lo stato
Clerk/allowlist senza aprire a tutti né inventare sessioni. Prima del
terzo rollout devono riuscire consultazione dei 22 rilievi, storico,
dettagli, export/mappe e CRUD del solo rilievo sintetico con eliminazione.
Non dichiarare questi controlli UI superati in base al confronto SQL.

## Perimetro e punto di partenza

- Unico target: progetto Supabase Agri Precision già identificato e collaudato.
- Release Replit validata: 9c49307f, pubblicata l'8 novembre 2026.
  API health HTTP 200; diagnostico Production Supabase concluso con `passed`.
- Non ripetere il collaudo già superato, i 95 test né l'esplorazione Data API.
  Controllare durante l'esecuzione soltanto le condizioni che possono cambiare.
- DATABASE_URL resta intatto; Clerk, credenziali, utenti e ruoli non cambiano.
  app_readonly e app_migrator restano NOLOGIN.
- Nessuna nuova risorsa, replica o progetto. Nessuna revoca globale TEMP/LO.
- I tre rollout previsti richiedono il clic manuale del titolare su Republish.
  L'approvazione complessiva copre i passaggi sotto; i clic non sono nuovi
  consensi sul perimetro. Non automatizzare la pubblicazione.
- Resta il rischio già accettato del diff SQL della piattaforma non verificato.
  Non chiamare strumenti che creino repliche. Se Publishing presenta una
  richiesta esplicita di modificare lo schema, non approvarla: interrompere.

## Configurazione esatta delle fasi

| Fase | NITROCROP_DB_BACKEND | NITROCROP_MIGRATION_PAUSE | NITROCROP_RUNTIME_PREFLIGHT |
| --- | --- | --- | --- |
| Prima del fermo | replit | 0 | 1 |
| Congelamento e trasferimento | replit | 1 | 1 |
| Collaudo target con pilota | supabase | 1 | 0 |
| Servizio riaperto | supabase | 0 | 0 |
| Rientro autorizzato a Replit | replit | 1, poi 0 | 0 |

Il preflight aggiuntivo a `1` è progettato esclusivamente per collaudare
Supabase mentre il backend operativo è Replit: con backend supabase
interromperebbe l'avvio con RUNTIME_PREFLIGHT_REQUIRES_REPLIT_BACKEND.
Per il cutover si usa quindi `0`, non come aggiramento di un errore:
il pool operativo Supabase ha una verifica obbligatoria separata, sempre
attiva, di TLS/CA/hostname, identità e transazione READ ONLY con ROLLBACK,
seguita dal controllo read-only dello schema. Nessun fallback automatico.
La chiusura del pool diagnostico è già stata collaudata; il pool operativo
rimane invece disponibile per servire l'applicazione.

Nel rollback autorizzato, il diagnostico aggiuntivo resta a `0` per non
rendere il recupero del servizio Replit dipendente da un Supabase
eventualmente indisponibile. Non spegnere controlli del pool operativo.
Qualunque diversa deroga o modifica ai controlli richiede nuovo consenso.

## 0. Pronti prima della finestra — nessun fermo anticipato

Prima di attivare manutenzione:

- Verificare con accesso autenticato esistente la visibilità dei rilievi
  in Production. Non creare utenti o sessioni mediante bypass.
- Avere già pronti i tool compilati, i percorsi di archivio e chiave age
  esistente, le esclusioni Git/pubblicazione e la release di ritorno sicura.
  Non visualizzare chiave privata, password o URL di connessione.
- Disporre delle connessioni approvate per sorgente e operazione target;
  app_runtime resta esclusivamente Production, senza copie nello sviluppo.
- Concordare disponibilità del titolare per i tre clic Publishing e
  per il collaudo dalla propria sessione amministratore già autenticata;
  sospendere altri merge, pubblicazioni e operazioni amministrative.
  Non chiedere password o cookie di sessione in chat.
- Chiedere agli utenti di completare i salvataggi prima della finestra:
  un dato ancora soltanto nel browser non è nel backup PostgreSQL.
- Individuare e sospendere gli eventuali scrittori esterni alla API:
  script, processi di sviluppo che usino Production, job o client manuali.
  Il middleware HTTP da solo non impedisce loro di scrivere.
- Confermare il singolo amministratore esistente da usare come pilota,
  mediante il mapping Clerk originale. Nessuna creazione di account.

Se manca una precondizione operativa, non iniziare il fermo.

## 1. Congelamento — primo Republish manuale

Pubblicare la stessa applicazione su Replit con pausa `1`, preflight `1`
e allowlist piloti vuota. Il middleware blocca con 503 tutti i percorsi
API salvo health, anche le GET che possono sincronizzare gli account.
La verifica Clerk precede la pausa; i middleware applicativi che scrivono
sono successivi. L'interfaccia può caricarsi, ma l'API è in manutenzione.

Attendere completamento del rollout e drenaggio delle vecchie istanze.
Non dichiarare il congelamento raggiunto appena si modifica il flag.
Non aprire il bypass piloti sulla sorgente.

## 2. Quiete PostgreSQL

Usare verify-quiescence.mjs sulla sola sorgente Production già approvata:
due campioni, separati da cinque secondi, con connessioni TLS verificate,
transazioni READ ONLY, ROLLBACK e chiusura.

Devono mancare altri client, anche idle, transazioni preparate,
sottoscrizioni abilitate e scheduler non risolti. Lasciare terminare le
operazioni già avviate e scadere i pool inattivi. Non terminare backend
PostgreSQL, non arrestare autovacuum o processi gestiti del provider.

Se restano scrittori o non si può attestare il drenaggio, non esportare.
La quiete è un riscontro puntuale: mantenere sospesi gli scrittori per
tutta la finestra e ripetere il controllo dopo il backup. Nessuna promessa
che due campioni impediscano da soli future connessioni esterne.

## 3. Backup finale completo cifrato

Eseguire backup-production.mjs, con l'autorizzazione all'esportazione reale:
pg_dump custom dell'intero database Production → age in streaming,
usando il destinatario pubblico già predisposto.

- Usare un NUOVO archivio finale, non quello preliminare.
- Nessun dump in chiaro persistente; archivio e chiave separati,
  cartelle 0700, file 0600, esclusi da Git e pubblicazione.
- Verificare SHA-256, decifratura autenticata e lettura integrale tramite
  pg_restore. Non confondere la lettura dell'archivio con un ripristino
  completo dell'intero cluster, che qui non viene eseguito.
- Usare i limiti già predisposti; non alzare automaticamente timeout o
  limiti di dimensione dopo un fallimento.
- Ricontrollare la quiete della sorgente prima dell'importazione.

Un archivio incompleto o non verificato blocca il trasferimento.

## 4. Importazione target delle cinque tabelle

Usare import.mjs sul solo Supabase approvato, indicando archivio finale,
file della chiave, checksum e conferma del congelamento.

Tabelle: app_users, security_state, privacy_requests, security_events,
osservazioni. Destinazione obbligatoriamente vuota; nessun DROP/TRUNCATE
o merge per adattare una destinazione già popolata.

Lo script:

1. Verifica TLS, identità del target, checksum e assenza di dati target.
2. Estrae soltanto COPY con nomi di colonna espliciti: tutte le 60 colonne,
   preservando valori originali, ID, mapping Clerk, GPS, NDVI, dosaggi,
   date e timestamp. Nessuna rigenerazione degli ID o conversione JavaScript.
3. Esegue un'unica transazione target come app_migrator, con lock esclusivi
   delle sole cinque tabelle di destinazione.
4. Per consentire COPY al proprietario, applica NO FORCE solo all'interno
   di questa transazione; RLS resta abilitata. Ripristina FORCE prima del
   COMMIT. Non altera ruoli o permessi globali.
5. Prima del COMMIT verifica conteggi, relazioni, mapping amministratore,
   owner/RLS ENABLE+FORCE, 15 policy e assenza di privilegi indesiderati
   di tabella/colonna per i ruoli Data API.

Errore prima del COMMIT: rollback della transazione, nessun cutover.
Esito COMMIT ambiguo: sola verifica in lettura; niente retry automatico.

## 5. Confronto integrale prima del cambio backend

Usare compare.mjs con la sorgente ancora congelata.

- Confrontare ogni riga e tutte le 60 colonne, non campioni: conteggi e
  SHA-256 per tabella, ordinamento per chiave, serializzazione PostgreSQL,
  UTC e rappresentazione deterministica.
- Verificare su entrambe le parti orfani, proprietari nulli da riesaminare,
  duplicazioni degli ID osservazione per utente e amministratore originale.
- Solo transazioni READ ONLY, ROLLBACK e chiusura; output aggregato e hash,
  senza contenuti dei clienti, coordinate o credenziali nei log.
- Qualunque differenza blocca il cambio backend. Nessuna normalizzazione,
  deduplicazione o autoriparazione dei dati reali.

## 6. Cutover protetto — secondo Republish manuale

Impostare solo in Production backend supabase, pausa `1`, preflight
aggiuntivo `0` e allowlist del singolo pilota esistente approvato.
NITROCROP_RUNTIME_DATABASE_URL resta il Secret runtime già collaudato.
DATABASE_URL non viene sovrascritto o rimosso.

Pubblicare e verificare la NUOVA revisione: pool operativo app_runtime,
TLS/CA/hostname, identità/read-only/ROLLBACK, schema e health 200.
Non confondere questi controlli con il vecchio preflight diagnostico.
Gli altri utenti restano in manutenzione.

## 7. Collaudo applicativo delimitato

Con l'amministratore esistente verificare accesso Clerk, ruolo e scadenze,
rilievi e storico, dettagli originali GPS/NDVI/dosi/date, export e mappe.
Non modificare rilievi reali né creare account Clerk.

L'approvazione del piano comprende anche una prova di creazione,
rilettura, modifica e cancellazione di un solo rilievo sintetico
chiaramente riconoscibile, esclusivamente sul target e sul pilota,
con controllo finale dell'assenza di quel rilievo. Non promettere la
cancellazione dei log gestiti o dei backup del provider.

Il confronto integrale precede il collaudo: autenticazione e uso normale
possono generare aggiornamenti tecnici dell'account/eventi di sicurezza.
Registrare tali differenze attese separatamente, senza cancellare audit
o alterare account reali per forzare l'uguaglianza degli hash.
I rilievi originali devono restare invariati.

Un'anomalia blocca la riapertura; non disattivare automaticamente i
controlli del pool operativo per superarla.

## 8. Riapertura — terzo Republish manuale

Solo dopo tutti i gate positivi, pubblicare backend supabase, pausa `0`,
preflight aggiuntivo `0`, allowlist piloti rimossa.
Verificare nuova revisione LIVE, health e normale accesso.
Da quel momento i nuovi rilievi vengono salvati su Supabase.
Conservare Replit intatto e consegnare il nuovo backup cifrato/checksum
fuori da Replit, con la chiave già custodita separatamente.

## Rollback incluso nell'approvazione, prima della riapertura

Motivi: quiete non attestabile, backup invalido, import fallito/ambiguo,
confronto divergente, protezioni errate, avvio o collaudo non riusciti.

- Interrompere il percorso target; mantenere la pausa mentre si decide
  l'esito. Conservare target ed evidenze, senza DROP/TRUNCATE.
- Rientrare con codice sicuro e backend replit, DATABASE_URL invariato,
  pausa `1`, diagnostico aggiuntivo `0`, nessun pilota.
- Verificare schema read-only e health, poi riaprire su Replit mediante
  il rollout necessario. Nessun restore sul database sorgente.
- Non promettere rollback istantaneo: richiede pubblicazione manuale.

Dopo la riapertura e le nuove scritture reali su Supabase, NON è sicuro
tornare direttamente a Replit: servono nuovo congelamento e riconciliazione
del delta, con piano/autorizzazione specifici. L'origine conservata da
sola non contiene i nuovi rilievi.

## Durata e approvazione

Preparativi residui prima del fermo: circa 5–15 minuti.
Fermo stimato: 30–45 minuti; riservare una finestra di 60 minuti.
Indicativamente: congelamento/drenaggio 4–8; backup 2–6; import 2–5;
confronto 2–5; cutover/collaudo 6–12; riapertura 3–5 minuti.
I tempi dipendono da volume, provider e disponibilità del titolare ai clic.
Un rollback aggiunge indicativamente 5–15 minuti o più se Publish ritarda.
Se entro il budget non si superano i gate, rientrare prima della riapertura,
senza sacrificare verifiche per rispettare una scadenza.

Un unico consenso operativo comprende congelamento, letture reali,
backup finale, importazione/COPY e NO FORCE/FORCE transazionali descritti,
confronto, configurazioni Production sopra indicate, pilota e prova
sintetica con pulizia, riapertura e rollback pre-riapertura.

Non comprende nuove risorse, credenziali, modifiche ai ruoli/globali,
correzioni di dati reali, sincronizzazioni automatiche di schema,
pubblicazioni avviate dall'Agent o riconciliazioni post-riapertura.
Se emerge una necessità fuori perimetro, fermarsi e segnalarla:
non inventare nuove attività o autorizzazioni per i passaggi già inclusi.
