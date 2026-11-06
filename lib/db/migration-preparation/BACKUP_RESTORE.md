# Backup, ripristino e confronto — procedura NON eseguita

Questa procedura richiede autorizzazioni distinte. Nessun dump è stato creato,
nessun database letto o modificato. Non inserire backup o dati personali in Git,
negli allegati della chat o nei log.

## 1. Preparazione e autorizzazioni

- Confermare esplicitamente origine **Production Replit** e destinazione
  **Supabase**, regione, responsabili, accessi e finestra di manutenzione.
  Il database del workspace non è automaticamente quello pubblicato.
- Conservare il riferimento codice `baa1953` e identificare il commit esatto da
  pubblicare al cutover. Un commit non è un backup del database.
- Far predisporre all'operatore autorizzato servizi libpq distinti
  `nitrocrop_source_approved` e `nitrocrop_target_qa_approved`, con credenziali nel
  sistema sicuro e password file con permessi 0600, mai URL/password in CLI,
  repository o shell history. SSL verify-full e CA attendibile.
- Conservare dump in archivio cifrato controllato dal titolare con accessi minimi,
  retention approvata e verifica SHA-256. Nessun backup reale nella repository.
- Verificare versioni PostgreSQL e strumenti: pg_dump non deve essere più vecchio
  del server sorgente; valutare compatibilità del server target e delle estensioni.
- Inventariare tabelle, tipi, vincoli, indici, default, sequenze, funzioni,
  trigger, viste, policy e dipendenze fuori public. `inspect.sql` è una bozza di
  raccolta metadati, non un inventario completo automatico.

## 2. Backup logico

Esempi per l'operatore, **da non eseguire in questa fase**:

```sh
# Fonte già approvata; $SECURE_BACKUP è un percorso esterno cifrato del titolare.
# Nessuna password viene passata nella riga di comando.
pg_dump --dbname='service=nitrocrop_source_approved' \
  --format=custom --no-owner --no-acl --file="$SECURE_BACKUP/application.dump"
pg_dump --dbname='service=nitrocrop_source_approved' \
  --schema-only --no-owner --no-acl --file="$SECURE_BACKUP/schema.sql"
pg_restore --list "$SECURE_BACKUP/application.dump"
sha256sum "$SECURE_BACKUP/application.dump" "$SECURE_BACKUP/schema.sql"
```

pg_dump acquisisce uno snapshot coerente ma NON blocca le scritture applicative.
Il confronto definitivo deve usare lo stesso snapshot, oppure una finestra senza
scritture. Non confrontare un dump storico con una sorgente che continua a cambiare.
Il dump completo potrebbe includere oggetti gestiti da Replit non portabili:
revisionare la lista e preparare una selezione degli oggetti applicativi con
tutte le dipendenze; non tentare un restore cieco dei ruoli di sistema.

## 3. Restore di prova (scrive: serve autorizzazione)

- Solo destinazione vuota e isolata approvata; mai sull'origine e mai su un target
  con dati clienti. Nessun `--clean` o `DROP` per liberare una destinazione.
- Verificare hostname, current_database e session_user fuori dai log contenenti
  segreti. Credenziale migrator disponibile soltanto all'esecutore autorizzato.
- Scegliere una strategia: dump completo revisionato **oppure** baseline verificata
  + dati. Il restore completo non va preceduto dalla baseline 0001.
- Revisionare `restore-approved.list`, dipendenze/estensioni e i comandi presenti
  nel dump. Un restore può eseguire codice incluso nelle definizioni.

```sh
# Solo DOPO approvazione della destinazione e della lista degli oggetti:
pg_restore --dbname='service=nitrocrop_target_qa_approved' \
  --use-list="$SECURE_BACKUP/restore-approved.list" \
  --no-owner --no-acl --single-transaction --exit-on-error \
  "$SECURE_BACKUP/application.dump"
```

Una prova completa della sintassi SQL, dei grants e dei vincoli richiede
PostgreSQL reale isolato: NON è stata svolta nella preparazione offline.
Trasferire proprietà e grants applicativi secondo il piano approvato senza
toccare auth/storage o altri oggetti tecnici Supabase.

## 4. Confronto prima del cutover

Prima dello spostamento definitivo creare un report **senza dati personali**:

- schema: tipi (precisione/scala inclusa), nullability, default, PK/FK/UNIQUE/CHECK,
  indici, sequenze e valori correnti, trigger, funzioni, policy;
- conteggi per tutte le tabelle applicative; confronti per proprietario eseguiti
  in ambiente protetto senza pubblicare identificativi dei clienti;
- uguaglianza di ID locali, clerk_user_id, proprietari dei rilievi e
  observation_id; nessuna generazione di ID o riassegnazione automatica;
- ruoli, stato account, scadenze/durate, timestamp e consensi invariati;
- rilevazioni: tutte le letture, dosi, NDVI, coordinate e campi agronomici uguali,
  distinguendo NULL, stringa vuota e zero; nessun ricalcolo durante l'import;
- orfani sulle FK e duplicati sui vincoli logici; controllare anche owner_id NULL
  perché NULL può essere ammesso dallo schema pur indicando una situazione da
  valutare, non da correggere automaticamente;
- fingerprint SHA-256 per ogni tabella su esportazione deterministica ordinata
  per PK, timezone UTC, DateStyle ISO, encoding e versione di serializzazione
  concordati. Confrontare fonte congelata/snapshot e destinazione del restore.

Per esempio, un'esportazione autorizzata può usare COPY di
`SELECT to_jsonb(t)::text FROM public.osservazioni t ORDER BY id COLLATE "C"`
verso un flusso privato che alimenta SHA-256, non verso i log. Usare `key` per
security_state e `id` per le altre quattro tabelle; evitare string_agg di tutta
la tabella in memoria. Confrontare anche lo schema: fingerprint uguali non
dimostrano uguaglianza di grants, vincoli o policy.

Conservare solo risultato aggregato PASS/FAIL e checksum nel report condivisibile;
eventuali differenze contenenti dati restano nell'archivio protetto.

## 5. Cutover e ripristino

Solo dopo autorizzazione: backup finale, sospensione scritture, migrazione/import
finale, confronto positivo, verifica ruoli, cambio credenziali e pubblicazione
Replit coordinati con rimozione startup DDL e push automatici. Il solo cambio di
DATABASE_URL non è sufficiente. Clerk e i suoi account non vengono modificati.

Prima di riaprire le scritture testare gli accessi e i dati con account autorizzati.
Se il controllo fallisce, mantenere il servizio in manutenzione e ripristinare
la configurazione precedente tramite il percorso sicuro; la sorgente non viene
eliminata o sovrascritta. Dopo nuove scritture su Supabase NON tornare alla
sorgente vecchia alla cieca: occorre congelare le scritture, riconciliare i delta
e approvare il recupero per non perdere rilievi.

La verifica del backup richiede un restore riuscito, non il solo file presente.
L'eliminazione delle copie e del database precedente è un'operazione distinta
che richiede approvazione del titolare e rispetto della conservazione prevista.
