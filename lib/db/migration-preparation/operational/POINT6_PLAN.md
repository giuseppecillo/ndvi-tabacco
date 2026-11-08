# Punto 6 — manutenzione, drenaggio e backup finale

STATO: preparazione soltanto. Nessun arresto, connessione Production,
backup finale, importazione o cambio DATABASE_URL eseguito da questo piano.
Punto 5 concluso dal titolare con le limitazioni di POINT5_RISK_ASSESSMENT.md.
Non rieseguire i 95 test applicativi né tentare revoche globali.

## Percorso operativo scelto

Il servizio pubblicato è Autoscale, https://agri-precision-hub.replit.app.
maintenance.mjs è una factory inattiva: non è collegata all'app. Non è
sufficiente impostare un flag nel workspace o affidarsi allo scale-to-zero.

Preferire un fermo esplicito del deployment tramite Publishing, effettuato
dal titolare dopo autorizzazione. Questa procedura non richiede di pubblicare
una nuova build per installare un middleware. Durante il fermo l'applicazione
non è disponibile: non promettere una pagina personalizzata di manutenzione.
L'Agent non dispone qui di un comando per premere Shutdown/Resume nella UI.

## 0. Precondizioni prima di interrompere il servizio

- Concordare una finestra indicativa di 10–15 minuti e la presenza del
  titolare per i comandi Publishing. Avvisare gli utenti di completare i
  salvataggi e sospendere rilievi, modifiche, cancellazioni e azioni admin.
  Dati ancora solo nel browser non fanno parte di un backup PostgreSQL.
- Confermare nella UI la procedura di arresto E quella di ripartenza.
  Non inventare un Resume senza nuova pubblicazione: se non disponibile,
  una ripresa tramite Publish deve essere concordata prima del fermo.
- Identificare una release di ripartenza senza DDL/bootstrap all'avvio.
  Il workspace ha già verifySecuritySchema readonly e post-merge senza push,
  ma ciò NON dimostra che il build attualmente pubblicato sia identico.
  Se non si può garantire il ripristino sicuro, non fermare il servizio.
- Inventariare e fermare altri scrittori: job/scheduled deployment, script
  manuali, strumenti amministrativi, eventuali client esterni, processi di
  sviluppo collegati alla stessa Production. Fermare/scollegare questi
  processi, non modificare i loro URL e non assumere che il workspace API
  usi necessariamente un database diverso.
- Confermare ancora disponibili destinatario pubblico age e identità già
  approvati, senza leggere/mostrare la chiave privata, e spazio di output.
- Le credenziali privilegiate servono solo all'operazione autorizzata, non
  allo sviluppo ordinario. Separazione/rimozione dei Secrets prima del futuro
  uso ordinario del target va gestita con autorizzazione esplicita.

## 1. Impedire nuove scritture

Il titolare arresta il deployment nel Publishing e conferma il fermo effettivo
di tutte le istanze, non solo assenza di traffico. Non premere Publish.
Questo ferma tutti i metodi HTTP, comprese GET/autenticazione che aggiornano
gli account, azioni admin, privacy, salvataggi e cancellazioni.
Fermare anche gli scrittori individuati fuori dal deployment; sospendere
merge/pubblicazioni durante la finestra.

Nel codice esaminato non è emerso un worker periodico di cancellazione;
retention-report è una lettura. Questo non certifica l'assenza di job esterni
o scheduler configurati nel database.

Non interrompere direttamente transazioni con pg_terminate_backend o
pg_cancel_backend. Dopo l'arresto attendere che le operazioni PG pendenti
terminino o risultino annullate. Un'operazione HTTP senza risposta non va
presentata come salvataggio riuscito; il dump includerà tutti i commit conclusi.

## 2. Confermare drenaggio e assenza di scrittori

È predisposto verify-quiescence.mjs, NON eseguito su Production.
Usa solo REPLIT_PROD_BACKUP_URL, factory sorgente già approvata, TLS/hostname
verificati, project/branch/primario vincolati. Nessun uso di DATABASE_URL.

Esegue due campioni separati da cinque secondi, ciascuno in una nuova
transazione REPEATABLE READ READ ONLY, con probe readonly prima di ogni SELECT,
ROLLBACK e chiusura finale:

- pg_stat_activity: nessun altro client, nemmeno idle, e nessun worker
  sconosciuto/di applicazione. Autovacuum e walsender non sono scrittori
  applicativi e non devono essere arrestati.
- pg_prepared_xacts: zero transazioni preparate.
- pg_subscription: zero sottoscrizioni logiche abilitate sul database.
- pg_extension: presenza di pg_cron/pgagent blocca il via libera finché
  non sia stato verificato e fermato lo scheduler con procedura autorizzata.

Non seleziona query SQL in corso, credenziali o contenuti applicativi.
Metadati incompleti, permessi insufficienti, connessioni sconosciute o job
non classificati bloccano il backup: nessun bypass, terminazione forzata,
disabilitazione automatica di scheduler o modifica ai ruoli.
Le due osservazioni NON impediscono da sole nuove connessioni: il fermo
esterno di tutti gli scrittori deve rimanere attivo per tutta la finestra.

Comando, solo dopo autorizzazione e conferma reale del fermo:

```sh
node lib/db/migration-preparation/backup/verify-quiescence.mjs \
  --authorized-phase6-readonly-check --writers-stopped-confirmed
```

## 3. Impedire modifiche da Publish

Durante arresto, drenaggio e backup NON eseguire Publish, merge, push Drizzle
o modifiche alle impostazioni di pubblicazione. Nessuna modifica ai modelli.
La rimozione degli automatismi applicativi non disabilita il diff automatico
della piattaforma sul PostgreSQL managed.

Se una ripartenza richiede Publish, prima del fermo servono autorizzazione
distinta e verifica del piano SQL ufficiale: deve essere vuoto e non deve
esserci overwrite/reset dei dati. Verificare anche build/run e startup della
release di ripartenza. Diff non vuoto/ignoto o startup non verificato = stop.
Non applicare manualmente SQL per rendere accettabile il diff.

## 4. Backup finale aggiornato e verifica

Solo dopo due campioni chiari e conferma che il blocco resta attivo:

```sh
node lib/db/migration-preparation/backup/backup-production.mjs \
  --authorized-export-production --production-binding-confirmed \
  "$(tr -d '\r\n' < generated-artifacts/backup-keys/owner-BRKOw7/public-recipient.txt)"
```

Usare il destinatario pubblico già approvato; nessuna nuova coppia di chiavi.
Lo script rivalida il primario al momento dell'uso: non è una ripetizione del
collaudo ruoli ma una protezione contro un'esportazione dal target sbagliato.

- pg_dump completo del database, formato custom compresso, snapshot MVCC,
  cifratura age in streaming. Nessun dump dati in chiaro su disco.
- SELECT/ACCESS SHARE e lock-wait massimo 1 secondo per pg_dump; se ci sono
  conflitti, abortire anziché mantenerli a lungo. Non è un blocco DML.
- Timeout pipeline 5 minuti; lettura/parsing integrale iniziale in streaming.
- Nuova cartella timestampata generated-artifacts/production-backup, 0700,
  file 0600; non sovrascrivere il backup precedente.
- Ricalcolo SHA-256 dal file effettivo e confronto con checksum.json.
- Verifica autenticata dell'archivio finale cifrato:

```sh
bash lib/db/migration-preparation/backup/verify-encrypted.sh \
  --authorized-verify-encrypted-archive \
  generated-artifacts/backup-keys/owner-BRKOw7/private-key.txt \
  "$NUOVO_ARCHIVIO_CIFRATO"
```

La variabile indica SOLO il nuovo archivio, non quello del backup precedente.
La decifratura passa direttamente a pg_restore --file=/dev/null: lettura
completa e autenticata, nessuna connessione di restore e nessun file in chiaro.
Verificare nel TOC le cinque sezioni TABLE DATA e conservare il manifesto.
Clerk non è esportato da pg_dump; i riferimenti applicativi sono nel backup.
Il dump non sostituisce il backup dei ruoli globali di un cluster PostgreSQL.

Ripetere soltanto la nuova verifica di quiescenza al termine. Se compaiono
scrittori o il fermo è venuto meno, non attestare il dump come finale congelato.
Conservare il primo backup e consegnare il nuovo archivio/checksum fuori da
Replit; chiave già custodita separatamente. generated-artifacts è esclusa
da Git e pubblicazione; verificare ancora le esclusioni prima del dump.
Non dichiarare un restore riuscito: la verifica certifica lettura/integrità,
non importazione nel target.

## 5. Ripristino del servizio se ci si interrompe

Fino alla futura apertura delle scritture su Supabase, Replit resta l'origine
autorevole: niente cambio URL, import o restore distruttivo in questo punto.
In caso di errore fermare pipeline/operazioni, marcare l'archivio non valido
se incompleto, non cancellare dati sorgente e non ripetere automaticamente.

Il titolare riattiva il servizio con la procedura sicura concordata al punto
0, stessa origine/database e release autorizzata. Riattivare solo i job prima
attivi e sospesi per la finestra. Verificare avvio readonly dello schema,
health e accesso con account già esistente; nessun account Clerk nuovo.
Una verifica di scrittura reale richiede consenso specifico.

Se non si prosegue subito dopo il backup, concordare la riapertura per non
lasciare l'app offline indefinitamente. Alla ripresa delle scritture il backup
rimane valido storicamente ma NON è più l'ultimo snapshot per la migrazione:
prima dell'import occorrerà un nuovo fermo/snapshot autorizzato.
Non promettere riapertura automatica: i comandi Publishing richiedono
l'intervento del titolare e la disponibilità del percorso di ripartenza.

## Prossimo consenso

Autorizzare SOLO punto 6: coordinamento del fermo, diagnostica RO di drenaggio,
esportazione finale cifrata, verifica integrale/checksum e controlli successivi.
Consenso condizionato alla disponibilità della ripartenza sicura e conferma
del fermo da parte del titolare. Una nuova pubblicazione non è inclusa:
se necessaria, definirla/approvarla prima di attivare la manutenzione.

Non inclusi: importazione, SQL su Supabase, cambi DATABASE_URL/LOGIN/ruoli,
revoche globali, pubblicazione automatica, cancellazioni sorgente o Secrets.
Al termine presentare esito e chiedere consenso al punto successivo;
mai avviarlo automaticamente.
