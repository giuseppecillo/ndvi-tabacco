# Punto 4 — primo tentativo arrestato prima del DDL

Data: 7 novembre 2026. Il titolare ha autorizzato esclusivamente la creazione
della struttura protetta sul progetto Supabase Agri Precision.

## Primo tentativo

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

## Correzione preparata offline, non rieseguita sul server

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

## Stato attuale

La struttura NON è stata creata da questo tentativo. Prima di un nuovo tentativo
del medesimo punto 4 attendere conferma del titolare. I ruoli restano previsti
NOLOGIN; importazione, attivazione credenziali, verifica isolamento globale e
passaggio dell'applicazione richiedono le rispettive autorizzazioni.
