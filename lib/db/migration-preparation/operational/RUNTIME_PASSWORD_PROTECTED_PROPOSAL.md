# Proposta alternativa: credenziali runtime e protezione dei log

**Stato: proposta soltanto. Non eseguita e non ancora attestata su Supabase.**

Destinazione unica: Supabase Agri Precision, progetto
`bhnaarbzpmcniesxyldx`, Session pooler già approvato.
Nessuna pubblicazione, connessione SQL, nuova credenziale o impostazione
modificata per preparare questo documento.

## 1. Principio e limiti

La proposta sostituisce il presupposto errato che una finestra password
del Dashboard eviti necessariamente SQL sensibile.

La password in chiaro non deve essere trasmessa nel testo SQL. Un eventuale
verificatore SCRAM pre-calcolato resta sensibile e richiede protezione da
log, errori e statistiche. Non considerare sufficiente il solo mascheramento
del normale statement log.

Il percorso alternativo richiede:

1. permessi già esistenti per impostazioni di logging **locali alla
   transazione**, verificati prima senza cambiarle;
2. prova non segreta che tali protezioni siano effettive;
3. un esecutore amministrativo manuale e isolato nel contesto Production,
   separato dall'avvio, dal build e dalle normali richieste dell'app;
4. credenziale runtime custodita solo in Production di Replit.

**I punti 1–3 non sono attualmente attestati.** Il progetto non è autorizzato
a eseguirli da questo documento. Non è corretto dichiarare risolto il blocco.

Non promettere assenza assoluta di copie nella telemetria interna del
fornitore che non è ispezionabile. Se le fonti di logging rilevanti non
possono essere individuate/verificate, la garanzia richiesta resta bloccata.

## 2. Prima verifica proposta: soli metadati, nessuna password

Da autorizzare separatamente. Connessione al solo target approvato,
TLS/CA/hostname verificati, usando il programma QA protetto e una nuova
allowlist limitata alle SELECT qui indicate.

```sql
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;

SELECT pg_catalog.current_setting('transaction_read_only') AS readonly;
-- Il programma interrompe se il risultato non è 'on'.

WITH requested(name) AS (
  VALUES
    ('log_statement'),
    ('log_min_error_statement'),
    ('log_min_messages'),
    ('pg_stat_statements.track'),
    ('pgaudit.log')
)
SELECT
  name,
  pg_catalog.current_setting(name, true) AS current_value,
  CASE
    WHEN pg_catalog.current_setting(name, true) IS NOT NULL
    THEN pg_catalog.has_parameter_privilege(current_user, name, 'SET')
    ELSE NULL
  END AS can_set
FROM requested
ORDER BY name;

SELECT extname
FROM pg_catalog.pg_extension
WHERE extname IN ('pg_stat_statements', 'pgaudit')
ORDER BY extname;

ROLLBACK;
```

Il verificatore deve controllare `transaction_read_only=on` prima di ogni
SELECT di inventario e chiudere la connessione al termine. Nessuna tabella
applicativa, Auth o Storage viene letta.

Interpretazione:
- parametro necessario senza permesso SET: **BLOCCANTE**;
- estensione/parametro mancante: verificarne la reale assenza prima di
  omettere la relativa protezione; esito indeterminato: **BLOCCANTE**;
- tutti i permessi presenti: si può proporre la prova successiva, non
  autorizzare automaticamente password o LOGIN;
- NON concedere nuovi permessi SET, superuser, membership o privilegi
  globali per rendere positivo questo controllo.

## 3. Seconda prova proposta: protezioni locali, solo canary non segreti

Richiede un consenso successivo, distinto dalla lettura dei metadati.
Prima di credenziali reali, provare transazioni separate con stringhe
esplicitamente non segrete, sia per successo sia per errore controllato.
Non creare ruoli, tabelle, funzioni persistenti o record applicativi.

Schema delle protezioni, da adattare solo alle estensioni effettivamente
attestate nella fase 2:

```sql
BEGIN;
SET LOCAL log_statement = 'none';
SET LOCAL log_min_error_statement = 'panic';
SET LOCAL log_min_messages = 'fatal';
SET LOCAL pg_stat_statements.track = 'none';
-- Solo se pgAudit è presente/attivo e il SET è autorizzato:
SET LOCAL pgaudit.log = 'none';

-- Verifica dei valori effettivi, poi SOLO la prova non segreta approvata.
ROLLBACK;
```

Questo blocco NON è uno script da copiare ed eseguire ora.
I valori devono essere verificati prima di qualsiasi istruzione sensibile.
Tutto deve avvenire sullo stesso client PostgreSQL e nella medesima
transazione: chiamate API separate non garantiscono la stessa sessione.

Verificare i log PostgreSQL, gli eventuali audit e le statistiche con le
etichette canary. Le ricerche nelle statistiche vanno parametrizzate, così
da non confonderle con nuove query che incorporano le etichette.
Verificare inoltre il ripristino dei valori con una successiva transazione
READ ONLY dopo ROLLBACK/COMMIT.

**Conseguenza da approvare:** per il breve intervallo protetto si riduce
l'osservabilità della singola sessione amministrativa, anche degli errori
diversi dal cambio password. Non si spengono i log globali né quelli delle
altre connessioni. Se una prova fallisce/non è osservabile, non usare
credenziali reali.

## 4. Eventuale operazione reale, solo dopo prove positive e nuovo consenso

Questo passaggio NON è autorizzato dall'approvazione della proposta.

- Il titolare predispone il Secret finale
  `NITROCROP_RUNTIME_DATABASE_URL` esclusivamente nei Production app
  secrets, usando un canale protetto. Prima della configurazione PostgreSQL
  il collegamento è dormiente, non una connessione verificata.
- Nessuna copia in Shared, Development, file, argomenti CLI o log.
  Il normale modulo Secrets senza selezione Production non è adatto.
- Un esecutore operativo Production separato legge il Secret solo in
  memoria e prepara SCRAM con un'implementazione verificata.
  Usare password casuali ASCII robuste per evitare errori SASLprep.
- Lo stesso esecutore deve poter usare la credenziale amministrativa per
  questa singola operazione. Questo richiede un perimetro specifico:
  non rendere disponibili credenziali amministrative al normale backend,
  non introdurre endpoint pubblici e non aggiungere DDL automatico ad
  avvio, build o post-merge.
- **Non è stato verificato che tale esecutore Production sia disponibile.**
  Non sostituirlo con la Shell dello sviluppo. Se manca, il percorso resta
  bloccato anche se i permessi di logging risultano sufficienti.

L'operazione reale dovrà usare il blocco locale verificato della fase 3
e poi una sola istruzione di aggiornamento di app_runtime:

```sql
-- PSEUDOCODICE NON ESEGUIBILE:
-- BEGIN;
-- [protezioni SET LOCAL già collaudate e verificate]
-- ALTER ROLE app_runtime LOGIN PASSWORD <verificatore generato in Production>;
-- [controlli attributi/privilegi/RLS invariati]
-- COMMIT;
```

Il ruolo è una costante, non input libero. Il verificatore non va salvato
nel sorgente o nel testo di questo documento. `ALTER ROLE ... PASSWORD`
non accetta un normale `$1` in sostituzione della password: non proporre
una parametrizzazione fittizia. La costruzione in memoria dell'istruzione
sensibile necessita di validazione/quoting verificati e non deve passare
per SQL Editor, shell history, `DO ... EXECUTE` o logging generico.

Prima del COMMIT:
- soltanto app_runtime acquisisce LOGIN;
- app_readonly e app_migrator restano NOLOGIN;
- attributi amministrativi, membership, ACL di tabelle/colonne e 15 policy
  restano quelli precedenti, senza nuove prove dei 95 casi già superati;
- nessun accesso Data API aggiuntivo e nessuna modifica a dati applicativi.

Errore prima del COMMIT: ROLLBACK e chiusura. Log del client limitati a
fase/esito ed eventuale SQLSTATE, senza query, valori, dettagli o oggetti
errore completi. Connessione persa dopo invio COMMIT: stato incerto,
nessun retry o rotazione automatica.

## 5. Collaudo e ritorno alle condizioni ordinarie

Resta rinviato al prerequisito 3 e richiede esecuzione Production autorizzata:
autenticazione reale come app_runtime, TLS/CA/hostname, BEGIN REPEATABLE
READ READ ONLY, controllo read-only e identità, ROLLBACK e chiusura.

Nessun uso di SET ROLE da postgres per fingere la prova del nuovo login.
Le credenziali amministrative temporanee non devono restare accessibili
al backend ordinario. La loro rimozione da impostazioni non dimostra da
sola la scomparsa dalle istanze già avviate: il piano di esecuzione dovrà
dimostrare anche la cessazione degli esecutori/processi che le possedevano.

## Esito della proposta e autorizzazioni

**Alternativa condizionata, non ancora praticabile attestata.**
Le impostazioni locali seguono il fallback documentato da Supabase:
https://supabase.com/kb/troubleshooting/provisioning-credentials-without-log-exposure

Non richiede revoche globali, nuovi database o modifiche ai ruoli gestiti.
Non supera però automaticamente i limiti dei permessi e dell'esecutore
Production. Nessuna modifica a DATABASE_URL, Clerk, deployment, schema o
dati Replit è inclusa.

La prossima eventuale autorizzazione minima è **solo la fase 2: lettura
dei metadati dei parametri/permessi di logging**, senza password e senza
impostare alcun parametro. Non implica consenso alle fasi 3–5.
