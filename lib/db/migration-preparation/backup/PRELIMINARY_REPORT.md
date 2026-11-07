# Preliminari backup — 7 novembre 2026

**Aggiornamento:** la successiva verifica del primario e del TLS client è
conclusa; vedere [SOURCE_IDENTITY_RESULTS.md](SOURCE_IDENTITY_RESULTS.md).
I blocchi sotto descrivono lo stato precedente all'inserimento del Secret,
non quello corrente. L'esportazione reale resta non autorizzata.

**Nessun dato reale esportato. Nessun backup production creato.**

| Controllo richiesto | Esito |
|---|---|
| Endpoint primario del database del deployment | **BLOCCATO**, manca connessione diretta/evidenza di associazione |
| Identità del database gestito Production distinta da development | Identificata nella preparazione precedente; non equivale a primario validato |
| pg_dump + age con soli dati sintetici | **PASS** |
| Verifiche offline di protezione e pulizia | **40 test superati, 0 falliti** |
| Consegna e chiave privata fuori Replit | Procedura documentata, non ancora eseguita |
| Esclusione Git/pubblicazione della destinazione | **PASS**, testata su entrambi i file di esclusione |
| Salute API di sviluppo dopo installazione tool | `{"status":"ok"}` |

## Collaudo eseguito

Comando: `bash lib/db/migration-preparation/backup/run-offline.sh`.
PostgreSQL/pg_dump/pg_restore 16.10, age 1.2.1.

Cluster PostgreSQL locale effimero, socket Unix in directory 0700, TCP disabilitato,
credenziali di Replit/Supabase assenti dall'ambiente. Cinque tabelle sintetiche,
chiavi/relazioni, sequenza, dati numerici/GPS inventati, Unicode, bytea e NULL.

Il collaudo ha verificato:

- pg_dump custom realmente eseguito SOLO sulla sorgente sintetica;
- hash dello stesso flusso passato a cifratura e parser, senza dump su disco;
- parsing/decompressione completa senza esecuzione SQL;
- decifratura con chiave di prova e uguaglianza del digest del dump;
- indice con tutte le cinque tabelle;
- restore e confronto dei dati/sequence nel SOLO cluster locale sintetico;
- sorgente sintetica invariata dopo il backup;
- rifiuto di chiave errata e alterazione del file cifrato;
- interruzione e rimozione dell'output parziale per errore dump, age, parser,
  programma mancante, limite byte e timeout;
- file 0600, directory 0700, nessuna sovrascrittura/cancellazione dei file esistenti;
- nessun fallback alle credenziali/service libpq dell'utente o a DATABASE_URL;
- rifiuto preventivo di development, Supabase, altro endpoint, pooler,
  TLS disabilitato e opzioni non approvate;
- transazione READ ONLY, prova iniziale, validazione metadati e ROLLBACK;
- blocco per primario/SSL/progetto/ramo/ruolo/versione incompatibili;
- CLI senza Secret dedicato bloccata prima della connessione.

Processi, cluster, chiavi e file sintetici temporanei rimossi al termine;
assenza di directory residue verificata. Controlli sintattici Node e Bash e
`git diff --check` superati.

Nel primo passaggio offline sono stati individuati un problema di doppia
chiusura del descrittore del file in caso di errore e un'asserzione sul prefisso
del formato age. Corretti e ricollaudati: la proprietà del descrittore appartiene
ora allo stream, che effettua flush/fsync e chiusura anche durante gli errori.
Nessuna di queste prove ha coinvolto dati o connessioni reali.

## Limiti ancora aperti

`REPLIT_PROD_BACKUP_URL` risulta assente; non è stata letta alcuna credenziale.
La replica disponibile tramite il canale SQL production non può dimostrare il
primario richiesto dal piano.

Occorre scegliere tra:

1. verifica guidata sul computer del titolare, senza mettere credenziali di
   produzione nel workspace;
2. approvazione di un Secret dedicato temporaneo, usato esclusivamente dal
   programma di identità in sola lettura e da rimuovere dopo la verifica.
   La connessione esistente può avere privilegi di scrittura: il programma
   limita l'operazione, non cambia i privilegi della credenziale.

Restano da confermare associazione deployment/connessione, hostname primario,
chiave pubblica effettiva e destinazione definitiva sotto controllo del titolare.
Il successo offline NON certifica TLS o identità di una connessione reale non
ancora eseguita, né sostituisce il collaudo futuro del restore su Supabase.

L'esportazione reale richiede una nuova autorizzazione esplicita dopo la
risoluzione di questi blocchi; un Secret o una chiave pubblica non la concedono.

## File toccati

- `.replit`: sola aggiunta del pacchetto Nix age, nessun campo Publish cambiato.
- `docs/migrazione-punto-3-backup.md`: stato della preparazione aggiornato.
- Nuova directory `lib/db/migration-preparation/backup/`: libreria, guardie,
  CLI sola identità, test, runner offline, istruzioni e presente rapporto.

Nessun codice applicativo, avvio/post-merge, DATABASE_URL, Clerk, dati o
configurazioni dei database esistenti modificati. Nessuna pubblicazione,
creazione di risorse cloud, connessione Supabase o punto 4.
