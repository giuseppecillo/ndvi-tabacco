# Punto 3 — piano del backup PostgreSQL di produzione, NON ESEGUITO

## Autorizzazione corrente

Autorizzata esclusivamente preparazione e identificazione in sola lettura.
Esportazione di dati reali NON ancora autorizzata. Nessun dump, nuova
credenziale, installazione, pubblicazione, modifica a DATABASE_URL o a Publish,
scrittura SQL, collegamento Supabase o esecuzione del punto 4.

## 1. Identificazione della sorgente

Verifiche del 7 novembre 2026, attraverso i canali gestiti distinti
development/production. Solo funzioni di identità/configurazione, nessuna
tabella applicativa interrogata.

| Proprietà | Produzione | Sviluppo |
|---|---|---|
| Database | neondb | heliumdb |
| Versione server | 16.15 (23d2a0d) | 16.10 |
| Ruolo del canale di lettura | neondb_owner | postgres |
| pg_is_in_recovery | true | false |
| Provider project | late-darkness-39148782 | non disponibile |
| Provider branch | br-winter-salad-apdld73l | non disponibile |
| transaction_read_only del canale production | on | non usato come prova di protezione |

La piattaforma conferma un deployment attivo, build riuscita, Autoscale,
URL https://agri-precision-hub.replit.app. Il codice dei due pool usa
DATABASE_URL; il suo valore nel workspace NON è la connessione production.
Nessuna credenziale o stringa completa è stata letta o riportata.

Identificato il database gestito Production associato al progetto; il canale
SQL disponibile è una replica in recovery, non un accesso pg_dump al primario.
Non dichiarare già validata una connessione diretta al runtime pubblicato.

### Blocco obbligatorio prima di ogni esportazione

1. Acquisire dal pannello Database → Production → Settings la connessione
   sorgente, con meccanismo sicuro separato. Mai copiarla in chat/file Git/log;
   mai rigenerarla o sostituire DATABASE_URL.
2. Verificare nel pannello l'associazione della connessione Production al
   deployment corrente; se vi sono override esterni o ambiguità, fermarsi.
3. Con il candidato endpoint, effettuare solo letture di identità in transazione
   READ ONLY: TLS con verifica hostname/CA, database neondb, provider project
   late-darkness-39148782, branch br-winter-salad-apdld73l.
4. Preferire endpoint primario diretto, pg_is_in_recovery=false; rifiutare il
   database development e il target Supabase, endpoint sconosciuti, pooler non
   verificati, fallback impliciti e perdita di verifica TLS.
5. Non partire finché questa identità e la destinazione del file non siano
   confermate. Un nome database, da solo, non identifica una sorgente.

## 2. Ambito e formato proposti

Backup logico completo del singolo database sorgente, con pg_dump custom (-Fc),
compressione moderata e un solo processo. Include schema, dati, indici,
vincoli, sequenze e relativi stati, oggetti grandi e metadati ripristinabili
del database accessibili al ruolo autorizzato. Nessun filtro alle sole cinque
tabelle. Conservare ownership e ACL nel backup; le eventuali esclusioni al
restore saranno una fase separata approvata.

Se mancano privilegi per una parte del database, fermarsi: non ometterla
silenziosamente e non chiamare completo un dump parziale. Non usare opzioni
che accettino visibilità RLS parziale.

Non è un backup fisico dell'intero cluster: ruoli/password globali, tablespace,
configurazione del servizio gestito, file esterni e account Clerk non sono
compresi da pg_dump. Gli identificativi Clerk presenti nei dati applicativi
sono invece conservati. Nessun pg_dumpall o lettura di password di ruoli.

Il client disponibile è PostgreSQL 16.10, stessa major del server 16.15:
compatibile secondo la documentazione pg_dump. Una major client inferiore
alla major del server è un blocco; non serve cambiare server o schema.

## 3. Destinazione proposta, da approvare

Archivio cifrato temporaneo sotto:

`/home/runner/workspace/generated-artifacts/production-backup/<UTC>/`

- Directory 0700; file 0600; esclusione Git e pubblicazione già prevista per
  generated-artifacts e da ricontrollare prima dell'esportazione.
- Scrivere soltanto `database.dump.age` e manifest/evidenze sensibili cifrati.
  Nessun dump SQL/custom in chiaro sul filesystem, negli allegati o nei log.
- Cifratura streaming age con destinatario pubblico del titolare. Chiave privata
  custodita esternamente dal titolare, mai richiesta in chat/repository.
- age non è attualmente installato: disponibilità e prova offline con dati
  sintetici vanno completate prima di qualunque esportazione reale, mediante
  procedura di installazione autorizzata.
- Output visibile limitato a esito, dimensione, tempi, checksum e conteggi
  aggregati approvati, senza righe, coordinate, indirizzi o identificativi utenti.
- Questa directory è temporanea, NON la destinazione di conservazione finale:
  dopo verifica, copiare il solo archivio cifrato in una cartella protetta
  controllata dal titolare e verificare nuovamente SHA-256.
- Nessun nuovo servizio cloud o database viene creato. Il percorso finale
  controllato dal titolare deve essere indicato prima dell'esecuzione.
- Rimozione della copia temporanea soltanto dopo verifica della copia finale
  e autorizzazione del titolare. Non promettere tempi di cancellazione delle
  copie interne del fornitore né eliminare automaticamente l'unica copia.

Se questa destinazione non è approvata, scegliere un archivio controllato dal
titolare prima di proseguire. Nessuna credenziale in un campo ordinario.

## 4. Metodo di esecuzione proposto — non eseguito

Connessione in un processo dedicato, senza import dell'applicazione né lettura
automatica della DATABASE_URL del workspace. Password tramite canale sicuro/
servizio libpq protetto, mai URL/password negli argomenti o nella shell history.
Le eventuali opzioni libpq impongono SSL verify-full e transazioni read-only;
non modificano impostazioni persistenti del server.

Invocazione orientativa soltanto, dopo tutti i controlli:

```text
pg_dump --dbname=service=nitrocrop_prod_backup_approved
        --format=custom --compress=3 --quote-all-identifiers
        --lock-wait-timeout=1000 --no-password
```

Lo stdout alimenterà la cifratura e la verifica in streaming senza file
intermedi in chiaro. Prima dell'uso reale, il programma deve controllare gli
exit code di TUTTI i processi (dump, cifratura, verifica, scrittura/fsync);
un errore interrompe l'intera pipeline. Non basta controllare l'ultimo comando
di una pipe, né il solo exit code di process substitution.

Non eseguire questa invocazione dalla documentazione. Il servizio libpq non
è stato creato e nessuna credenziale di produzione è stata richiesta.

## 5. Impatto e limiti operativi

- Snapshot coerente pg_dump, senza blocco delle normali letture/scritture DML.
  L'app continua a lavorare; i dati scritti dopo lo snapshot non sono inclusi.
- pg_dump prende lock ACCESS SHARE, mantenuti durante la lettura: possono
  interferire con DDL concorrente. Non promettere assenza assoluta di lock.
- Attesa iniziale dei lock limitata a 1 secondo; in caso di conflitto fallire,
  non forzare e non terminare sessioni applicative.
- Un solo processo dump, nessun parallelismo, nessun blocco manutenzione,
  nessun fermo dell'app, nessun comando SQL di scrittura.
- Proposta di limite totale 5 minuti per il tentativo, senza retry automatici.
  Se insufficiente, interrompere e sottoporre una nuova finestra/limite.
- Controllare latenza/health prima, durante e dopo; interrompere in caso di
  peggioramento significativo. I lock e lo snapshot si rilasciano chiudendo
  la connessione del backup, non intervenendo su quelle degli utenti.
- Verificare spazio sufficiente e assenza di DDL concorrente prima di partire.
  Il sito pubblicato può ancora usare codice precedente al punto 2: nessun
  riavvio/pubblicazione per aggiornarlo è compreso in questa autorizzazione.
- Un backup live può aumentare CPU/I/O e mantenere versioni MVCC: non è possibile
  garantire impatto zero prima della misura. Preferire un orario di basso carico.

Il backup finale del cutover, con scritture temporaneamente bloccate, resta
il punto 6 e richiede autorizzazione distinta.

## 6. Verifiche proposte

1. Identità sorgente verificata prima del dump e associata al report.
2. Snapshot, orari UTC, versioni strumenti, opzioni e perimetro annotati.
3. Exit code zero di dump, cifratura e verifica; nessun errore ignorato.
4. Indice dell'archivio leggibile con pg_restore --list, incluse le cinque
   tabelle e le dipendenze previste; indice sensibile dentro archivio cifrato.
5. Lettura/decompressione completa con pg_restore senza connessione database
   e output scartato: nessun SQL generato eseguito e nessuna stampa dei dati.
6. SHA-256 e dimensione del file cifrato; verifica dopo copia finale.
7. Prova di decifratura del titolare, con chiave custodita esternamente,
   per confermare che l'archivio sia effettivamente recuperabile.

La verifica di parsing/decompressione può ricevere lo stesso flusso custom
prima della cifratura; la prova di decifratura resta necessaria per verificare
anche il recupero dall'archivio cifrato. Nessun file in chiaro nel workspace.

Checksum e parsing NON equivalgono a restore riuscito, equivalenza dei dati,
collaudo FK/RLS o certificazione del fornitore. Restore/import e confronti
origine-destinazione restano fasi successive nel solo progetto Supabase
Agri Precision, da autorizzare. Non creare database aggiuntivi per questa prova.

## 7. Conferme ancora necessarie

- Approvazione del presente piano e del percorso temporaneo cifrato.
- Indicazione e approvazione della destinazione finale controllata dal titolare.
- Autorizzazione successiva all'esportazione, con finestra operativa, controlli
  di arresto e modalità cifratura concordati.
- Disponibilità sicura della connessione Production ed esito del controllo
  primario/progetto/branch; destinatario pubblico di cifratura.
- Tool di cifratura disponibile e pipeline verificata offline.

Nessun punto 4 o successivo avviato. Nessuna impostazione Publish cambiata.

## Fonti consultate

- https://docs.replit.com/features/data-and-storage/connection-details
- https://docs.replit.com/features/data-and-storage/development-and-production
- https://www.postgresql.org/docs/16/app-pgdump.html
