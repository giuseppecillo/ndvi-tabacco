# Punto 5 — risultati del collaudo autorizzato

## Esito

**Completato, con blocco sull'isolamento globale.**

Sul solo Supabase Agri Precision: 101 casi eseguiti una volta, 95 superati
(33 operazioni consentite e 62 dinieghi attesi), 6 finding sulle capacità
TEMP/large object. Nessun caso principale fallito.

Stato macchina: PHASE5_CORE_PASSED_GLOBAL_ISOLATION_FAILED.
Il runner restituisce intenzionalmente exit 2 per impedire di trattare il
collaudo come interamente superato; non indica un errore SQL non gestito.
Nessun ritentativo, remediation o fase successiva avviati.

## Controlli superati

- TLS client 1.3; CA ufficiale e verifica dell'hostname obbligatorie, mai
  disattivate. Target vincolato dalla factory esistente al progetto approvato.
- Cinque tabelle inizialmente vuote; owner app_migrator, RLS ENABLE/FORCE,
  schema e quindici policy conformi alla specifica.
- Tutti i tre ruoli applicativi rimasti NOLOGIN, senza superuser/BYPASSRLS
  o possibilità di assumere postgres.
- SELECT e CRUD autorizzati dei ruoli applicativi, aggiornamenti migrator
  e CREATE/ALTER/DROP di una sola tabella-prova.
- app_readonly: INSERT/UPDATE/DELETE/TRUNCATE negati sulle cinque tabelle.
  I test erano READ WRITE: i dinieghi 42501 provano i privilegi e non un
  semplice default transaction_read_only.
- app_runtime: state SELECT-only; INSERT audit e UPDATE a NULL separati di
  actor_id/target_id consentiti. Riscrittura di id/action/created_at,
  cancellazione e troncamento audit negati.
- Cancellazione a cascata dei figli sintetici verificata.
- Per anon/authenticated/service_role: SELECT e INSERT negati su tutte le
  cinque tabelle, comprese le richieste sotto service_role.
- CREATE public e disattivazione RLS negati a runtime e readonly.

Sono prove SQL dei ruoli, non chiamate HTTP alla Data API, login diretti o
una certificazione dell'isolamento tra account Clerk nel backend Express.

## Sei finding effettivamente riprodotti

| Ruolo | CREATE TEMP TABLE | lo_create(0) | lo_from_bytea(0, quattro byte) |
|---|---|---|---|
| app_runtime | consentito | consentito | consentito |
| app_readonly | consentito | consentito | consentito |

Questi permessi non consentono di modificare le cinque tabelle applicative
protette, ma dimostrano che il ruolo readonly non è globalmente privo di
capacità di scrittura: può allocare anche large object potenzialmente
persistenti se una transazione venisse confermata.

Nessuna revoca globale o modifica ai servizi Supabase eseguita. La correzione
deve considerare l'origine diretta/ereditata dei privilegi e l'impatto sui
ruoli del provider; non basta revocare un singolo ruolo se il privilegio
resta disponibile tramite PUBLIC.

## Pulizia confermata

Nove fixture sintetiche, non dati reali: 2 utenti, 2 osservazioni, 2 richieste
privacy, 2 eventi, 1 stato. Gli ID erano univoci e le email example.invalid;
nessuna chiamata Clerk, nessun invio email e nessun contatto al database Replit.

- SAVEPOINT e rollback per ogni caso, anche positivo.
- Quattro large object creati dalle sonde e subito annullati.
- Eliminazione esplicita delle fixture come app_migrator verificata prima
  del rollback complessivo: tutte le cinque tabelle a zero righe.
- ROLLBACK complessivo confermato; nessun COMMIT nel runner.
- Nuova connessione protetta READ ONLY: zero righe, nessuna relazione-prova
  o large object con gli OID di prova noti, stato di schema/policy/ACL/ruoli
  e membership identico a quello iniziale.
- I due GRANT SET temporanei a postgres risultano annullati.

La pulizia è attestata a livello SQL, non come cancellazione fisica di WAL,
log o backup del provider.

## Verifiche offline

Prima della connessione: 7 test della specifica e 4 test delle precondizioni
e dei vincoli del runner superati; TypeScript superato.

## Limiti e prossima autorizzazione

DATABASE_URL, Clerk, configurazione applicativa, dati reali Replit,
pubblicazione, LOGIN e privilegi globali non modificati.

Il percorso diretto a blocco scritture, backup finale cifrato, import con
colonne esplicite e confronto integrale è già definito in
POINT5_PREPARATION.md e CUTOVER.md. Non è stato eseguito.

Prima di attivare accessi ordinari readonly o passare all'importazione va
risolto o valutato esplicitamente il limite dei privilegi globali. Occorre
una proposta mirata e una nuova autorizzazione prima di applicare revoche o
concessioni, specialmente se incidono su PUBLIC/ruoli del provider.
