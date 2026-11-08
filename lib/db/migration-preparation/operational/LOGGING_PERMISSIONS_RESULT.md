# Esito: verifica READ ONLY dei permessi di logging

Verifica completata il 2026-11-08 alle 09:02:53 UTC.
Autorizzazione limitata ai metadati del punto 1 della proposta alternativa.

## Destinazione e protezioni

- Progetto: Supabase Agri Precision, `bhnaarbzpmcniesxyldx`.
- Endpoint: Session pooler approvato in Ireland, porta 5432.
- Database: postgres; current_user e session_user: postgres.
- Versione PostgreSQL: 17.11.
- Socket client TLS 1.3, certificato autorizzato tramite CA ufficiale
  con fingerprint approvato, hostname verificato.
- Processo figlio con ambiente pulito: soltanto il Secret QA amministrativo
  già esistente e i parametri pubblici approvati; nessuna DATABASE_URL
  Replit o fallback verso altri endpoint.
- BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY.
- transaction_read_only=on prima di ciascuna SELECT di metadati.
- default_transaction_read_only=off, solo osservato, non modificato.
- ROLLBACK e chiusura connessione completati prima dell'emissione del rapporto.

## 1. Disponibilità dei permessi

Valori letti sul server e risultato di has_parameter_privilege(...,'SET'):

| Parametro | Valore corrente | SET consentito a postgres |
| --- | --- | --- |
| log_statement | ddl | false |
| log_min_error_statement | error | false |
| log_min_messages | warning | false |
| pg_stat_statements.track | top | false |
| pgaudit.log | none | false |

Fra le due estensioni richieste, pg_extension ha restituito soltanto
pg_stat_statements. La presenza del parametro pgaudit.log non dimostra
che l'estensione pgAudit sia installata nel database.

**Esito: permessi necessari NON disponibili.** SET LOCAL non scavalca i
controlli di privilegio. Non è stato eseguito alcun SET per provarlo.

## 2. Compatibilità con Supabase gestito

La diagnosi READ ONLY è compatibile ed è stata eseguita.
Il fallback con protezioni locali del logging è descritto nella
documentazione Supabase, ma **non è praticabile con il ruolo e i permessi
attualmente disponibili su questo progetto**.

Non sono stati richiesti/concessi privilegi SET, superuser, membership
o interventi sui ruoli gestiti per aggirare il blocco.

## 3. Rischi residui

- Il normale percorso di impostazione di una password può inserire
  password o verificatori SCRAM nel testo SQL.
- Il valore log_statement=ddl rende particolarmente rilevante la gestione
  delle istruzioni di ruolo. La mascheratura del normale statement log non
  garantisce copertura di errori, dettagli e statistiche.
- pg_stat_statements è installata e track=top. Questa lettura non ha
  ispezionato query storiche e NON dimostra esposizioni già avvenute.
- Non sono stati letti log, password, verificatori, dati applicativi,
  Auth o Storage; non è stata creata alcuna credenziale di prova.
- La custodia Production-only e l'esecuzione del collaudo in Production
  restano requisiti separati, non dimostrati da questa verifica.

## 4. Procedura ufficiale più semplice

Supabase documenta il normale uso di un ruolo PostgreSQL dedicato con LOGIN
e password, seguito dall'impiego delle sue credenziali nel servizio
applicativo. È il percorso standard, senza esecutori speciali o
silenziamento del logging.

Questa procedura è ufficialmente supportata, ma non costituisce garanzia
di assenza di materiale di autenticazione da ogni log/statistica.
La funzione Dashboard per ruoli personalizzati non va equiparata a
un'API che eviti SQL sensibile. Il reset della password del progetto cambia
postgres e NON configura il solo app_runtime: non usarlo.

Non è stato individuato e attestato un percorso più semplice che soddisfi
contemporaneamente anche il vincolo rigoroso sui log imposto dal titolare.
Questo non significa che i ruoli runtime o Supabase siano incompatibili
con l'applicazione: il blocco riguarda il rilascio delle credenziali
con le garanzie richieste.

Fonti ufficiali già consultate, senza operazioni sul progetto:
- https://supabase.com/docs/guides/database/postgres/roles
- https://supabase.com/kb/troubleshooting/provisioning-credentials-without-log-exposure

## Chiusura del percorso

**BLOCCANTE per il metodo alternativo proposto.**
Nessuna ulteriore variante complessa viene preparata automaticamente.
Il punto 2 della preparazione runtime resta non completato.

Non sono stati eseguiti SET, CREATE, ALTER, GRANT, REVOKE, password reset,
canary o altre prove di scrittura; nessun nuovo Secret, Publish, fermo,
trasferimento o modifica a DATABASE_URL.

Verifica offline circoscritta al nuovo lettore: 3 test superati
(allowlist/probe, arresto se readonly non è on, rollback su errore).
I 95 controlli SQL precedenti non sono stati ripetuti.
