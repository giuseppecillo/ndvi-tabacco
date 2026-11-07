# Operazioni inattive — autorizzazioni distinte, solo Agri Precision

Nessuno script è collegato ad avvio, build o post-merge. Nessuna installazione
sul PC, nessun nuovo database/progetto, nessuna modifica Netlify o Clerk.

## Percorso rapido, con condizioni di arresto

1. **Ora: identità sorgente.** Secret temporaneo REPLIT_PROD_BACKUP_URL, diverso
   da DATABASE_URL. Deve provenire da Database → Production → Settings dello
   stesso progetto pubblicato. Confrontare il solo hostname con la connessione
   effettiva del deployment in Publishing, senza mostrare URI o password.
   Se l'interfaccia non dimostra l'associazione, dichiararla bloccata: il nome
   neondb o un endpoint trovato nel workspace non sono prove sufficienti.
   Eseguire solo verify-source.mjs: TLS verificato, primario, progetto/ramo,
   transazione READ ONLY, SELECT metadati, ROLLBACK, chiusura. Niente dump.
2. **Autorizzazione backup reale.** Confermare sorgente e destinatario pubblico
   age, cartella cifrata generated-artifacts/production-backup e consegna.
   Solo allora backup-production.mjs, flag --authorized-export-production
   --production-binding-confirmed e chiave pubblica. Dump completo custom,
   cifratura streaming, lettura completa pg_restore senza esecuzione SQL,
   checksum. Nessun dump in chiaro o password su disco/CLI.
   Con identità age disponibile nella modalità concordata, verify-encrypted.sh
   --authorized-verify-encrypted-archive IDENTITA_AGE ARCHIVIO_CIFRATO verifica
   decifratura autenticata e parsing/decompressione completa, senza salvare
   dati in chiaro o collegarsi ad alcun database.
3. **Autorizzazione scritture Supabase.** apply-target.ts
   --authorized-create-application-target crea tre ruoli NOLOGIN, cinque tabelle
   con 60 colonne e protezioni in UNA transazione; target esatto e CA ufficiale
   verificati. Riutilizza la baseline esistente, non il restore schema completo.
   Fallisce se ruoli/tabelle esistono: nessun DROP, upsert strutturale o rerun
   permissivo. RLS esplicita ENABLE+FORCE, non affidata a ensure_rls.
4. **Prima di attivare LOGIN:** audit effettivo dei tre ruoli. Gli script storici
   roles.sql con revoche globali NON sono inclusi: PUBLIC TEMP e funzioni
   persistenti possono ancora dare scritture fuori dalle cinque tabelle.
   Non dichiarare app_readonly completamente isolato finché questa verifica
   non passa. Eventuali revoche globali richiedono approvazione dell'impatto sul
   provider; non saltare errori né alterare ruoli tecnici.
   Runtime non possiede oggetti; i ruoli API non ricevono ACL/policy applicative.
   Clerk e i filtri account Express rimangono responsabili dell'isolamento utenti.
5. **Autorizzazione blocco temporaneo delle scritture.** Non basta un pulsante UI
   o un flag in una nuova build non pubblicata. Con il titolare scegliere un
   blocco effettivo di tutti gli endpoint e processi scriventi, comprese istanze
   Autoscale già attive, autenticazione che aggiorna account, admin e retention.
   È predisposto maintenance.mjs (NON collegato all'app): blocca tutte le API,
   incluse GET con effetti laterali, eccetto health. Dopo autorizzazione al
   rollout, inserirlo come primo middleware prima di autenticazione/account,
   con flag NITROCROP_MIGRATION_PAUSE=1. Il rollout deve includere l'avvio
   readonly del punto 2; attendere drenaggio/terminazione delle vecchie istanze
   e richieste, arrestare ogni job/operatore scrivente e verificarne l'assenza.
   Non dichiarare congelato il database solo perché il nuovo flag è impostato.
   Questa fase può interrompere temporaneamente il servizio e richiede
   approvazione esplicita, non si attiva da questi script.
6. Sorgente congelata: backup finale e importazione dell'ultimo snapshot.
   Autorizzare specificamente import.ts --authorized-import-frozen-source
   --source-writes-confirmed-frozen ARCHIVIO_CIFRATO IDENTITA_AGE
   --sha256 CHECKSUM_APPROVATO. Target vuoto, una transazione, COPY con tutti
   i nomi di colonna verificati, stessi ID e nessun ricalcolo agronomico.
   Il parser scarta i preamboli SQL del dump e accetta solo COPY dei cinque
   oggetti; verifica esito age/pg_restore e conteggi prima di COMMIT.
   NO FORCE RLS temporaneo soltanto sui cinque oggetti target bloccati, per
   consentire COPY dell'owner; ripristino FORCE prima del COMMIT, rollback
   dell'intera transazione se qualcosa fallisce.
7. Autorizzare confronto: compare.ts --authorized-compare-real-data
   --source-writes-confirmed-frozen confronta tutte le 60 colonne tramite
   fingerprint paginati ordinati per PK, timezone UTC, JSONB testuale senza
   conversioni JS di numeri/timestamp, conteggi e digest. Eseguire integrity.sql
   nei due snapshot READ ONLY. Nessun contenuto o ID nei log; differenze,
   admin mapping assente, FK/orfani inattesi bloccano il passaggio.
   NULL owner va valutato, mai riparato automaticamente.
8. **Autorizzazione connessione e pubblicazione separate.** Credenziali LOGIN
   del runtime solo nel deployment; readonly nello sviluppo ordinario,
   migrator non disponibile all'app. Cambiare DATABASE_URL solo per l'ambiente
   esplicitamente approvato, senza sincronizzare schema managed→external.
   Valutare in anticipo il piano mostrato da Replit Publish: non autorizzare
   implicitamente modifiche al database Replit residuo. Non pubblicare da solo.
9. Verifica applicativa autorizzata: accesso Clerk originale, stesso utente e
   storico, isolamento account, admin, abbonamenti, dose NDVI/GPS, mappe,
   esportazioni e privacy. Prove di scrittura solo con dati di collaudo concordati
   nel progetto esistente e con apposita autorizzazione.
10. Riaprire scritture solo dopo esito positivo. Conservare Replit immutato.

## Rollback senza perdita dati

- Prima di nuove scritture su Supabase: ripristino della connessione precedente
  e della versione applicativa approvati, senza restore distruttivo del sorgente.
- Dopo nuove scritture su Supabase: NON basta tornare al vecchio URL, perché si
  perderebbero i nuovi rilievi. Bloccare le scritture, conservare entrambi i
  database, fare un confronto/delta con autorizzazione specifica; nessuna
  riconciliazione o sovrascrittura automatica.
- Nessuna cancellazione del database Replit, nessun ripristino cieco, nessun
  DELETE delle osservazioni per riprovare un import.

## Segreti

Inserimento soltanto tramite Secrets. Nessuna credenziale in chat, Git o log.
Il Secret temporaneo non è una credenziale readonly per natura: è il programma
a limitare le query. Dopo la diagnosi chiedere autorizzazione per rimuoverlo;
tramite Secrets → menu della chiave → Delete, poi verificare solo l'assenza.
Non rigenerare la password production e non modificare DATABASE_URL per
eliminare il Secret dedicato. La rimozione non revoca le credenziali originali.

## Limite dichiarato

Script predisposti e testabili offline, non ancora eseguiti sul target reale.
Non confondere parsing/controllo statico con prova delle autorizzazioni gestite,
restore riuscito o certificazione di assenza di perdita dati.
