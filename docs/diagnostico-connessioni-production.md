# Diagnostico connessioni — preparazione inattiva

## Autorizzazione e stato

Il titolare ha autorizzato **«Prepara solo il diagnostico»**, dopo il consenso
al confronto in sola lettura e l'accertamento del blocco del canale Production.
Questo documento non autorizza esecuzione, pubblicazione, accesso aggiuntivo
ai Secrets o riallineamento dei moduli.

Il codice è in `artifacts/api-server/src/diagnostics/`:

- `connection-comparison.ts`: inventario fisso, lettura e confronto;
- `production-connection-comparison.ts`: controlli Production, TLS, identità,
  transazioni, chiusura e report aggregato;
- `connection-comparison.test.ts`: esclusivamente connessioni simulate.

Non ci sono un `main`, un comando di esecuzione reale, una route o un import
dal server. Il diagnostico non viene avviato da build, avvio, post-merge o
richieste HTTP. Non importa i pool applicativi, non legge `process.env`,
non costruisce connessioni, non scrive file e non registra log.
Il solo comando aggiunto esegue i test sintetici:

```sh
pnpm --filter @workspace/api-server run test:connections
```

Preparazione verificata con 8 test sintetici superati e
`pnpm --filter @workspace/api-server run typecheck` riuscito.
Nessun test contro database reali; nessun riavvio del server per attivare
il diagnostico. Questi esiti non attestano lo stato dei dati Production.

## Contratto per la futura esecuzione, ancora da approvare

Un operatore autorizzato dovrà disporre di un canale di esecuzione
**nell'ambiente Production effettivo**. L'entry point operativo manca
intenzionalmente: prepararlo e renderlo eseguibile richiede un piano
specifico; questa libreria da sola non supera il blocco di accesso.
Non esporla come endpoint pubblico o comando raggiungibile dall'utente finale.

Prima di chiamare `runProductionConnectionComparison` occorrerà:

1. Identificare la revisione effettivamente pubblicata e verificare che i due
   pool forniti siano **esattamente** quello storico e quello centrale usati
   dai moduli di quella revisione, non pool ricostruiti da Secrets QA/admin.
2. Approvare origine, host TLS, porta, utente di connessione, database, ruolo
   SQL e ruolo di sessione attesi. Non ricavare o stampare DSN, password o
   valori di Secrets. Per la destinazione il codice ammette solo il pooler
   Agri Precision e il collegamento `app_runtime` già previsto dal progetto.
3. Verificare senza modificarli i privilegi e le policy RLS di tutte le
   tabelle incluse. Una lettura runtime può vedere soltanto parte dei dati;
   non concedere permessi o assumere ruoli per superare questo limite.
4. Concordare l'esecuzione una tantum e l'eventuale impatto: letture limitate,
   nessun fermo dell'app implicito, report aggregato custodito dal titolare.
5. Fornire alla funzione i pool esistenti, la configurazione nominale
   Production e un'approvazione identificata con scadenza entro un'ora.
   Il parametro nominale `NITROCROP_CONNECTION_COMPARISON` deve essere
   `approved-once`, con `NODE_ENV=production`, `REPLIT_DEPLOYMENT=1` e
   backend centrale `supabase`. Nessuno di questi valori viene impostato
   automaticamente e non costituisce, da solo, consenso del titolare.

La funzione non consuma persistentemente un'autorizzazione: impedirne riusi
e concorrenza è responsabilità del futuro canale operativo, da definire
prima dell'esecuzione. Non aggiungere uno stato di consumo sul database come
scorciatoia: il confronto autorizzato è solo lettura.

## Verifiche e limiti implementati

- Nessuna connessione prima dei controlli di ambiente e approvazione.
- Su ogni client verifica socket TLS autorizzato, TLS 1.2/1.3, certificato e
  hostname; verifica anche i parametri effettivi host/porta/utente/database.
  Nessuna query viene inviata su un trasporto non verificato.
- Transazione `REPEATABLE READ READ ONLY`; identità e stato primario
  controllati con SQL. Replica, ruolo diverso, superuser, creazione ruoli/
  database o bypass RLS causano arresto. Il diagnostico non modifica ruoli.
- Solo `SELECT`, cursori di lettura e impostazioni **locali** di timeout,
  timezone, formato date e search path; mai DML, DDL, `SET ROLE` o `COMMIT`.
- Chiude con `ROLLBACK` e rilascia/distrugge i client anche su errore;
  non chiude i pool dell'app e non imposta i loro default.
- Attesa connessione massima 10 secondi; query 5 secondi, lock 1 secondo,
  transazione inattiva 15 secondi. Budget complessivo di lettura 60 secondi
  controllato fra le operazioni (non un watchdog rigido dell'intero processo:
  connessione/query/chiusura già in corso possono prolungarlo).
- Cursori in blocchi da 100 righe, massimo 5.000 righe per tabella e origine,
  40.000 righe complessive, 64 KiB per riga e 32 MiB di payload complessivi.
  Il superamento è un errore: niente campioni presentati come confronto
  completo, niente aumento automatico dei limiti.
- Le tabelle ammesse sono account, stato sicurezza, rilievi, richieste
  privacy, audit, contratti/consumi, profili del catalogo e proposte varietali.
  Viste o strutture non previste non vengono eseguite come tabelle.
- Confronta colonne/tipi/nullabilità e definizioni dei vincoli. Non certifica
  l'equivalenza completa di schema, policy, privilegi, indici e funzioni.
  Differenze di schema richiedono analisi, mai correzioni automatiche.
- Tabelle assenti vengono segnalate come non confrontabili, non come vuote.
  Errori di permesso o di lettura bloccano il report finale.
- Tutte le righe visibili, anche vecchie, partecipano al confronto:
  nessun filtro esclusivo su `created_at`, che non rileverebbe gli upsert
  successivi. Per i rilievi si usa la chiave logica proprietario/observation_id.
- Le righe restano solo in memoria durante la lettura; impronte HMAC con
  chiave casuale di esecuzione consentono il confronto in memoria.
  Il contenuto viene improntato dal testo JSONB PostgreSQL senza convertirne
  i numeri in JavaScript, evitando perdita di precisione nei valori grandi.
- L'output non contiene record, chiavi personali, email, identificativi Clerk,
  GPS, hash dei record o chiave HMAC. Errori SQL sono sostituiti da categorie
  chiuse senza messaggio originale o `cause`.

## Interpretazione del report

`compared_visible_rows` significa soltanto confronto terminato delle righe
visibili ai due ruoli, nei limiti dichiarati. Non significa «migrazione
sicura» o «stessi database». Il report espone esplicitamente:

- `fullVisibilityCertified: false`;
- `simultaneousSnapshots: false`;
- `cutoverAuthorized: false`.

Per tabella riporta presenza, conteggi visibili, RLS, prima/ultima creazione
disponibile, riferimenti account non trovati, uguaglianza strutturale limitata
e numero di chiavi presenti su una sola origine o con contenuto differente.
I riferimenti non trovati dell'audit possono essere intenzionali; non sono
automaticamente dati corrotti. Se gli account non sono leggibili/presenti,
il controllo riferimenti restituisce `null`, non zero.

I due snapshot sono **sequenziali**, non sincronizzati tra i database.
Le assenze non distinguono cancellazioni intenzionali e inserimenti mancanti.
Le differenze non vengono attribuite automaticamente al periodo successivo
alla migrazione. Timestamp di creazione non sono timestamp di modifica.
Il catalogo viene soltanto letto/confrontato, mai reimportato.

Per attestare un passaggio senza perdita di dati serviranno una valutazione
della visibilità RLS, confronto delle differenze, una finestra coerente
separatamente autorizzata e consenso puntuale alle eventuali riconciliazioni.

## Criteri di arresto

Se manca il canale Production conforme, il titolare non approva i parametri
nominali attesi, l'identità/TLS non coincide, il ruolo ha privilegi esclusi,
la lettura è incompleta o scade un limite, **fermarsi**.
Non copiare credenziali nello sviluppo, non usare Secrets amministrativi,
non creare progetti/repliche e non pubblicare per aggirare il blocco.
