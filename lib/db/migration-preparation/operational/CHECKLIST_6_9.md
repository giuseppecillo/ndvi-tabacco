# Checklist unica: preparazione completata, attivazioni non autorizzate

Data: 2026-11-08. Unico target: Supabase Agri Precision, Ireland.
Nessuna connessione SQL, importazione, attivazione di manutenzione, modifica
dei Secrets o pubblicazione eseguita durante questa preparazione.

## Evidenze e limiti

- Deployment Replit: pubblico, Autoscale, ultima build restituita dalla
  cronologia: 2026-10-31. La ricerca del messaggio di avvio read-only su
  questa revisione non ha prodotto risultati. L'assenza del messaggio NON
  dimostra scritture, ma non certifica l'avvio della release attuale.
- Il Secret di produzione `NITROCROP_RUNTIME_DATABASE_URL` risulta assente
  secondo il valore booleano restituito dai metadati Secrets. Nessun valore
  di credenziale è stato richiesto, letto o stampato.
- Non è stato attestato un ciclo Stop/Resume della release esistente;
  non è stato eseguito Unpublish. Autoscale a zero non blocca le richieste.
- Percorso proposto: mantenere il deployment pubblicato, applicando
  manutenzione alle API. Questo evita di dipendere da un riavvio non
  verificato o da effetti non attestati di Unpublish sul collegamento DB.
- Le nuove funzioni sono INATTIVE: `lib/db/src/index.ts`,
  `artifacts/api-server/src/app.ts` e `src/index.ts` non sono stati modificati.
  Il collegamento futuro è compilato virtualmente da `prepared-wiring.mjs`.
- 12 nuovi test offline superati; TypeScript librerie/API superato;
  candidata compilata, non eseguita né pubblicata. Nessuna ripetizione
  dei 95 controlli SQL positivi già accettati.
- Nessuna nuova certificazione live dei nuovi controlli SQL: essi saranno
  eseguiti soltanto nell'importazione autorizzata e devono fallire chiuso.

## Sequenza e autorizzazioni

### Aggiornamento del consenso e del canale password

Il titolare ha confermato la sola predisposizione del prerequisito A,
accettando il rinvio del collaudo live al prerequisito B/3. Non ha autorizzato
Publish, copie del Secret in Shared/Development o aggiramenti delle
protezioni della password.

La verifica delle fonti Supabase ha individuato un blocco: la funzione
Dashboard per le password dei ruoli personalizzati usa una mutation che
genera SQL. La modifica Studio che pre-calcola SCRAM nel browser riduce
l'esposizione della password ASCII, ma invia comunque un verificatore in SQL;
sono inoltre documentati fallback in chiaro. Non costituisce prova di
assenza di materiale di autenticazione nei log/statistiche.

Fonti pubbliche consultate:
- https://supabase.com/kb/troubleshooting/provisioning-credentials-without-log-exposure
- https://github.com/supabase/supabase/pull/52506
- https://github.com/supabase/supabase/pull/52544

Non è stato attestato un endpoint protetto specifico per la password del
solo app_runtime. Il reset della password del progetto/postgres NON è
un'alternativa autorizzata.

Di conseguenza NON sono stati impostati password, LOGIN o nuovi Secrets.
La predisposizione operativa resta bloccata sul canale password; il rinvio
del collaudo non risolve questo blocco. Non eseguire neppure il solo ALTER
LOGIN prima di chiudere la condizione sul canale protetto.

Il titolare ha successivamente autorizzato soltanto la preparazione di
un'alternativa, senza applicarla. La proposta è in
`RUNTIME_PASSWORD_PROTECTED_PROPOSAL.md`: permessi di logging da verificare
in sola lettura, eventuali protezioni locali da collaudare con canary non
segreti, esecutore Production isolato ancora non attestato.
Non costituisce autorizzazione a nessuna di tali operazioni.

È stata poi autorizzata ed eseguita soltanto la verifica READ ONLY dei
permessi di logging: tutti i cinque controlli SET per postgres sono false.
La variante è non praticabile con i permessi attuali; fermata senza
impostazioni, canary o password. Esito completo in
`LOGGING_PERMISSIONS_RESULT.md`. Non preparare altre varianti complesse
automaticamente; la predisposizione runtime resta bloccata.

### A. Prima della finestra: credenziali e collaudo della connessione

Stima: 5–15 minuti, applicazione ancora su Replit.

- [ ] Autorizzare attivazione LOGIN del SOLO `app_runtime` e impostazione
  sicura della sua password dedicata. Privilegi/RLS esistenti invariati;
  `app_readonly` e `app_migrator` restano NOLOGIN.
- [ ] Collocare l'URL runtime nel Secret **solo Production**
  `NITROCROP_RUNTIME_DATABASE_URL`. Non usare il flusso Shared per il
  Secret permanente. Non mostrare password/URL in chat o negli argomenti CLI.
- [ ] VINCOLO SUCCESSIVO DEL TITOLARE: il collegamento runtime deve esistere
  soltanto in Production. L'opzione precedente con un Secret QA temporaneo
  nello workspace è esclusa. Non usare il wrapper `verify-runtime.ts` attuale,
  né la sua copia compilata, che dipendono da quell'opzione.
- [ ] Individuare un'esecuzione del diagnostico nel solo ambiente Production.
  Non è attualmente verificato un canale una-tantum senza pubblicazione.
  Le nuove impostazioni Production diventano operative con Publish:
  pubblicazione o rinvio della prova richiedono nuova conferma del titolare.
  Fino a tale verifica, il collaudo runtime è BLOCCATO, non superato.
  La prova prevista controlla socket TLS, CA/hostname, ruolo realmente
  autenticato e transazione READ ONLY; termina con ROLLBACK e chiusura.
  Nessuna riga applicativa deve essere letta.
- [ ] Non iniziare la finestra se il login effettivo tramite Session pooler
  non supera il preflight. Le precedenti prove SET ROLE non sostituiscono
  questa prova delle nuove credenziali.
- [ ] Rendere indisponibili nello sviluppo ordinario i Secrets
  amministrativi/di migrazione; mantenerli esclusivamente nell'esecuzione
  operativa autorizzata fino alla pulizia finale approvata. La presenza
  attuale del Secret QA amministrativo non è isolamento già realizzato.

### B. Prima della finestra: release sicura, ancora collegata a Replit

Stima: 5–15 minuti, dipendente da Publish.

- [ ] Autorizzare applicazione del wiring già compilato:
  factory connessione nell'indice DB; guardia identità prima di
  `verifySecuritySchema`; middleware manutenzione dopo Clerk e prima di
  tutti i router/account sync. Nessuna modifica a Clerk o agli utenti.
- [ ] Pubblicare questa release solo dopo autorizzazione, con backend
  `replit`, manutenzione `0`, stessa connessione Replit gestita.
- [ ] Controllare il SQL previsto da Replit Publish: deve essere vuoto.
  Non confermare una pubblicazione che applichi DDL/DML al database.
  Gli script locali di build/start/post-merge non eseguono push/migrazioni;
  ciò NON disattiva da solo la sincronizzazione della piattaforma.
  Non è stato chiamato explainSchemaDiff, perché il primo utilizzo può
  predisporre una replica di lettura, non autorizzata in questo percorso.
- [ ] Verificare sulla NUOVA release il messaggio di avvio read-only e
  `/api/healthz`. Conservare codice/revisione sicuri e configurazione
  di ritorno; NON usare come rollback la vecchia release non attestata.

**A e B sono i blocchi pre-finestra. Nessun fermo finché non sono chiusi.**

### C. Finestra: blocco scritture e verifica quiete (punto 6)

Stima: 2–5 minuti, oltre al rollout.

- [ ] Autorizzare la finestra e pubblicare/configurare la release sicura
  ancora su Replit con `NITROCROP_MIGRATION_PAUSE=1` e lista piloti vuota.
  Ogni `/api` è bloccata con 503/Retry-After, tranne health.
  Sono bloccate anche GET che potrebbero causare sincronizzazione account.
- [ ] Attendere completamento rollout e drenaggio delle vecchie istanze;
  verificare che non restino processi/schedulazioni/client esterni scriventi.
  Il middleware HTTP da solo non blocca processi esterni.
- [ ] Eseguire il verificatore quiete già preparato: due transazioni
  diagnostiche READ ONLY separate, con TLS verificato.
  Client inattesi, transazioni preparate, job/subscription non verificati
  o connessioni applicative ancora aperte bloccano il passaggio.
  Attendere anche la chiusura dei pool inattivi della release in pausa.

### D. Backup finale cifrato (punto 6)

Stima: 1–5 minuti, proporzionale al volume effettivo.

- [ ] Autorizzare esportazione finale con gli script già preparati:
  pg_dump dal primario approvato → age in streaming, chiave già esistente.
- [ ] Verificare autenticazione/decifratura, lettura integrale archivio
  e SHA-256. Nessun dump in chiaro persistente; output/chiave separati,
  directory/file privati, esclusi da Git e pubblicazione.
- [ ] Annotare percorso del NUOVO archivio e suo checksum; non riutilizzare
  quello preliminare. Verificare che le scritture siano ancora bloccate.

### E. Importazione delle cinque tabelle (punto 7)

Stima: 1–5 minuti; watchdog dello script: 5 minuti.

- [ ] Autorizzare l'importazione reale sul solo target approvato.
  Comando predisposto:

  `node generated-artifacts/migration-tools/import.mjs --authorized-import-frozen-source --source-writes-confirmed-frozen ARCHIVIO_CIFRATO FILE_CHIAVE --sha256 SHA256_FINALE`

- [ ] TLS/identità target, checksum e cinque tabelle vuote devono passare.
  Importare solo COPY con nomi colonna espliciti: 60 colonne complessive,
  senza conversioni JS dei valori; ID/Clerk/GPS/NDVI/date/dosi preservati.
  Nessun ripristino dello schema originale o degli oggetti del provider.
- [ ] Unica transazione sul target, SET LOCAL ROLE app_migrator, lock
  esclusivi delle sole cinque tabelle; nessun lock di scrittura sull'origine.
  Per COPY, NO FORCE solo nella transazione proprietaria isolata;
  RLS resta abilitata e FORCE è ripristinato prima del COMMIT.
- [ ] Prima del COMMIT: conteggi COPY, cinque RLS ENABLE+FORCE/owner,
  inventario 15 policy, assenza di privilegi tabella/colonna Data API,
  relazioni/import admin validi. Fallimento → nessun cutover.
  Disconnessione dopo invio COMMIT → esito da verificare in sola lettura:
  niente retry, pulizia o riapertura automatica.

### F. Confronto e integrità (punto 8)

Stima: 1–5 minuti; fermo mantenuto.

- [ ] Eseguire:

  `node generated-artifacts/migration-tools/compare.mjs --authorized-compare-real-data --source-writes-confirmed-frozen`

- [ ] Confrontare conteggi e SHA-256 di tutte le colonne di ogni tabella,
  con ordinamento PK deterministico, UTC e JSON PostgreSQL lato server.
  Verificare orfani, owner nulli, duplicati ID di rilievo per utente,
  corrispondenza amministratore originario. Nessuna autoriparazione.
  Output solo aggregati/hash, nessun contenuto personale o GPS nei log.
- [ ] Origine e destinazione solo READ ONLY, ROLLBACK/chiusura finali.
  Qualsiasi differenza blocca il collegamento a Supabase.

### G. Collegamento Supabase e collaudo controllato (punto 9)

Stima: 3–10 minuti, incluso rollout e verifica.

- [ ] Autorizzare attivazione in Production di
  `NITROCROP_DB_BACKEND=supabase`, lasciando manutenzione `1`.
  Il Secret dedicato identifica SOLO app_runtime del progetto approvato.
  **DATABASE_URL rimane intatto**: non sovrascrivere la variabile gestita.
- [ ] Ripubblicare solo con SQL della piattaforma vuoto. Nessun cambio
  Clerk, account, dominio, hosting o Netlify.
- [ ] All'avvio, verifica reale TLS/hostname/CA e identità app_runtime,
  con transazione diagnostica READ ONLY e ROLLBACK, poi schema read-only.
  Nessun fallback automatico a Replit/admin se una verifica fallisce.
- [ ] Abilitare come piloti solo identificativi Clerk esistenti,
  esplicitamente approvati, tramite
  `NITROCROP_MIGRATION_QA_CLERK_IDS`.
  Il middleware usa l'identità verificata da Clerk, non header utente.
  Gli altri utenti restano bloccati.
- [ ] Collaudare accesso, rilievi/storico, GPS/NDVI/dosi e mappe con dati
  esistenti senza modificare rilievi reali. Qualsiasi prova di scrittura
  applicativa richiede un perimetro sintetico e autorizzazione specifica;
  nessuna creazione automatica di account Clerk.

### H. Riapertura e rollback

Stima: rollout 2–5 minuti; rollback prima riapertura circa 5–15 minuti.

- [ ] Solo dopo confronto/collaudo positivi, autorizzare manutenzione `0`,
  rimuovere la lista piloti e riaprire mediante il rollout necessario.
  Pubblicazione sempre manualmente approvata e con SQL vuoto.
- [ ] Se un passaggio precedente fallisce: mantenere pausa, backend
  `replit`, stessa DATABASE_URL preservata, ripubblicare il codice sicuro,
  verificare startup/schema/health, poi togliere la pausa.
  Nessun restore o modifica del database Replit, nessun DROP/TRUNCATE target.
- [ ] Dopo riapertura con nuove scritture reali su Supabase, NON tornare
  direttamente a Replit: occorrono nuovo fermo e riconciliazione del delta
  autorizzata. Altrimenti si perderebbero i rilievi successivi al passaggio.
- [ ] Consegnare il backup finale fuori da Replit e rimuovere i Secrets
  temporanei solo con autorizzazione. Database Replit conservato intatto.

## Tempo complessivo e prossimi consensi

Preparativi attivabili prima della finestra: circa 10–30 minuti, senza fermo.
Finestra indicativa: 15–35 minuti, non una garanzia; attese del provider,
volumi o controlli falliti possono aumentarla.

1. Il titolare ha circoscritto il consenso successivo al solo A e richiede
   conferma dei comandi prima di modifiche SQL o creazione di credenziali.
   Non comprende B, nuove pubblicazioni o copie QA del Secret runtime.
   Il limite di esecuzione Production sopra indicato va risolto senza
   considerare autorizzato B implicitamente.
2. Dopo successo A/B, unico consenso operativo specifico C–H: pausa,
   esportazione reale finale, importazione reale, confronti,
   cambio selettore runtime, pubblicazioni controllate, collaudo approvato,
   riapertura e rollback prima dell'accettazione di nuove scritture.

Non iniziare C per poi preparare gli strumenti di E/F/G.
Nessuna autorizzazione C–H è stata concessa in questa preparazione.
