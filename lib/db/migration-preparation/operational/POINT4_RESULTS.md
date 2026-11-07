# Punto 4 — completato nel secondo tentativo autorizzato

Data: 7 novembre 2026. Il titolare ha autorizzato esclusivamente la creazione
della struttura protetta sul progetto Supabase Agri Precision.

## Esito corrente: COMMIT riuscito e verifica READ ONLY superata

Il titolare ha successivamente autorizzato esplicitamente il secondo tentativo.
Gli stessi SQL approvati sono stati eseguiti sul solo target Agri Precision,
con la correzione TLS verificata. Tutte le protezioni della transazione sono
state controllate prima del COMMIT, che è riuscito.

Una successiva transazione REPEATABLE READ READ ONLY ha verificato gli oggetti
persistenti. Probe read-only prima delle SELECT, ROLLBACK della sola verifica
e chiusura della connessione completati. Nessun ripristino o nuovo DDL.

### Oggetti effettivamente creati e verificati

| Tabella public | Colonne | Proprietario | RLS / FORCE | Righe |
|---|---:|---|---|---:|
| app_users | 13 | app_migrator | entrambe attive | 0 |
| security_state | 2 | app_migrator | entrambe attive | 0 |
| privacy_requests | 7 | app_migrator | entrambe attive | 0 |
| security_events | 5 | app_migrator | entrambe attive | 0 |
| osservazioni | 33 | app_migrator | entrambe attive | 0 |

Totale: cinque tabelle e 60 colonne, con i vincoli e indici della baseline.
15 policy RLS presenti.

Ruoli app_migrator, app_readonly e app_runtime presenti e tutti NOLOGIN,
NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION, NOBYPASSRLS.
Non sono state impostate password o abilitate connessioni dei nuovi ruoli.

### Privilegi verificati sul server

- Per anon, authenticated e service_role: nessun privilegio applicativo di
  tabella o colonna nelle 15 combinazioni ruolo/tabella, inclusi quelli
  eventualmente ereditati da PUBLIC.
- Per app_readonly: SELECT sulle cinque tabelle; nessun privilegio di scrittura
  di tabella o colonna sulle cinque tabelle applicative.
- Per l'audit: UPDATE actor_id/target_id consentito al runtime; nessun UPDATE
  globale, DELETE/TRUNCATE o UPDATE sugli altri campi di security_events.
- I conteggi sono stati letti sotto il ruolo proprietario e relativa policy,
  per non confondere righe nascoste da RLS con tabelle effettivamente vuote.
- TLS del client verificato: TLSv1.3, certificato autorizzato e hostname valido,
  mantenendo la CA ufficiale. Nessuna disattivazione di rejectUnauthorized.

Non è un collaudo HTTP della Data API o delle funzionalità applicative.
L'interruttore generale di auto-esposizione non è stato modificato: il blocco
delle cinque tabelle è ottenuto tramite privilegi e RLS. Non si certifica
l'isolamento globale rispetto a TEMP/funzioni/oggetti fuori dalle cinque tabelle.

### Limiti rispettati

Nessuna importazione, modifica DATABASE_URL, connessione al database Replit,
modifica Clerk, pubblicazione, blocco delle scritture, creazione di un altro
database/progetto o cancellazione di chiavi/Secret.

Il punto 5 e le fasi successive NON sono stati avviati.
Il programma verify-structure.ts --readonly-created-structure esegue soltanto
questa conferma del punto 4; non riapplica la creazione.

## Storico: primo tentativo

- Connessione tramite targetClient: Secret dedicato, progetto/host vincolati,
  CA ufficiale, rejectUnauthorized e verifica hostname mantenuti.
- Transazione aperta, controllo identità eseguito.
- Arresto allo stadio identity: pg_stat_ssl riportava ssl=false.
- ROLLBACK completato e connessione chiusa.
- COMMIT non inviato.
- Nessuna CREATE ROLE/TABLE, GRANT/REVOKE o modifica RLS è stata eseguita.
- Nessuna importazione, modifica DATABASE_URL, accesso al database Replit,
  modifica Clerk, pubblicazione o blocco delle scritture.
- Nessun tentativo automatico successivo di scrittura.

## Diagnosi successiva, soltanto metadati READ ONLY

Una transazione esplicita REPEATABLE READ READ ONLY, con probe read-only=on,
ha verificato:

- database e ruolo amministrativo attesi;
- socket client effettivamente cifrato con TLSv1.3;
- certificato autorizzato e hostname verificato con la CA ufficiale;
- pg_stat_ssl.backend=false, dato distinto dal trasporto client→pooler;
- ROLLBACK completato e connessione chiusa.

Non si certifica la cifratura del tratto interno pooler→backend.

## Correzione preparata offline e usata nel secondo tentativo autorizzato

assertTarget ora richiede certificato presente, socket encrypted/authorized,
assenza di authorizationError, verifica esplicita hostname e TLSv1.2/1.3.
Il campo pg_stat_ssl resta diagnostico: non può autorizzare un socket client
non verificato, né sostituisce la verifica del trasporto effettivo.

Nessuna modifica a CA, endpoint, Enforce SSL, configurazione Data API o SQL
di creazione delle tabelle, ruoli e policy.

10 nuovi test puri coprono TLS client valido con backend ssl=true/false,
trasporto non cifrato, certificato non attendibile/assente, errore TLS,
hostname errato, protocollo obsoleto, database e ruolo errati.
Tutti passati; restano passati i 20 test preparatori e TypeScript.
Nessun database di collaudo creato.

Il programma di applicazione ora emette solo stadio, SQLSTATE ammesso,
conferma rollback e stato del COMMIT, senza errori grezzi o credenziali.
Un errore dopo invio COMMIT richiede verifica readonly prima di dichiarare
l'esito o riprovare.

## Stato dopo il primo tentativo — storico

Il primo tentativo non aveva creato la struttura. Il secondo è stato eseguito
soltanto dopo nuova autorizzazione esplicita, con l'esito riportato in apertura.
Importazione, attivazione credenziali, verifica isolamento globale e passaggio
dell'applicazione richiedono ancora le rispettive autorizzazioni.
