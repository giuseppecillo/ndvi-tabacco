# Backup — soli preliminari e collaudo sintetico

**L'esportazione di dati reali non è autorizzata. Nessun dump reale creato.**
`backup-production.mjs` è stato predisposto ma richiede autorizzazione
specifica all'esportazione, conferma dell'associazione production e destinatario
pubblico age: senza questi flag si ferma prima di qualsiasi connessione.
`pipeline.mjs` è una libreria; non legge credenziali e non parte importandola.

## Programmi e perimetro

- `source-guard.mjs`: controlli puri di URL e identità con client iniettato.
- `verify-source.mjs`: unica connessione eventualmente reale, ma SOLO transazione
  REPEATABLE READ READ ONLY, probe read-only, SELECT di identità/metadati,
  ROLLBACK e chiusura. Nessuna lettura applicativa, pg_dump o scrittura.
- `pipeline.mjs`: dump custom → hash/controllo byte → age e parser pg_restore.
  Il parser produce SQL verso `/dev/null`, senza connessione database.
  Niente file dump in chiaro, stdout dei dati o errori grezzi nei log.
- `run-offline.sh`: elimina dall'ambiente le credenziali, avvia un cluster locale
  effimero senza TCP e lo rimuove alla fine. SOLO dati e chiavi sintetici.
  Il restore locale sintetico non è un trasferimento verso Supabase.

Per ripetere il solo collaudo:

```sh
bash lib/db/migration-preparation/backup/run-offline.sh
```

**Il titolare ora esclude nuovi database, anche di collaudo: non rieseguire
questo runner che crea un cluster locale.** Conservare il risultato precedente
di 40 test; usare soltanto i nuovi test puri della preparazione operativa.

Prerequisiti: PostgreSQL 16, Node con supporto WriteStream flush e age.
age 1.2.1 è stato aggiunto alle sole dipendenze Nix del workspace. Nessun
campo Publish, DATABASE_URL, codice applicativo o hook di avvio è cambiato.
La libreria richiede directory 0700, file nuovi 0600, file libpq espliciti e
ambiente passato dal chiamante, senza ereditarietà automatica. Ogni errore
interrompe i sottoprocessi e invalida/rimuove soltanto l'output parziale appena
creato; non sovrascrive né elimina file preesistenti.

## Verifica preliminare della sorgente — ancora bloccata

Il canale SQL production gestito da Replit identifica una replica del database
neondb, progetto late-darkness-39148782, ramo br-winter-salad-apdld73l.
Questo NON prova l'endpoint primario da usare con pg_dump.

Occorre la connessione esistente da Database → Production → Settings, senza
rigenerare credenziali o pubblicare. Il titolare ha scelto la verifica da
Replit tramite Secret separato temporaneo `REPLIT_PROD_BACKUP_URL`; rimuoverlo
poi attraverso l'interfaccia sicura dopo sua autorizzazione. Non proporre altre
installazioni sul PC e non sostituire DATABASE_URL.
Non usare la connessione Supabase, development o un nuovo progetto Neon.
L'URL esistente può avere privilegi scrivibili: la transazione READ ONLY del
programma non trasforma la credenziale in una credenziale readonly permanente.

Dopo l'inserimento nel canale sicuro e solo per verificare l'identità:

```sh
node lib/db/migration-preparation/backup/verify-source.mjs --read-only-identity
```

Il comando non stampa URI/password. Accetta solo hostname Neon diretti,
database neondb e TLS verificato; rifiuta pooler, opzioni non previste,
hostname/schema non ammessi e perdita del readonly. Controlla primario
(`pg_is_in_recovery=false`), SSL, progetto, ramo, ruolo e major PostgreSQL.
Confermare anche l'associazione della connessione Production al deployment
corrente nel pannello ufficiale; una query a un database gestito Production,
da sola, non esclude override nella configurazione pubblicata.

Se manca una prova, il risultato resta BLOCCATO. Non avviare mai il dump
come conseguenza del successo di questo comando.

## Cifratura — istruzioni precedenti, modalità di consegna da concordare

Il titolare non vuole installare strumenti sul PC. I comandi locali sotto
restano un riferimento tecnico, NON il percorso attualmente scelto. Prima del
backup reale concordare una chiave pubblica già disponibile oppure la creazione
e consegna protetta di una chiave tramite Replit, con autorizzazione specifica.
Non generare chiavi reali o mostrare chiavi private automaticamente.

1. Installare age dai canali ufficiali: https://age-encryption.org
   e https://github.com/FiloSottile/age/releases .
   Su Windows usare gli eseguibili ufficiali `age.exe` e `age-keygen.exe`;
   su macOS/Linux i programmi equivalenti.
2. In una cartella protetta sul proprio computer eseguire:

   ```sh
   age-keygen -o NitroCrop-backup-key.txt
   age-keygen -y NitroCrop-backup-key.txt
   ```

3. Il secondo comando stampa SOLO la chiave pubblica, una riga `age1...`.
   Fornire soltanto quella riga all'operatore, eventualmente come `recipient.txt`
   contenente esclusivamente la riga pubblica.
4. **Non caricare `NitroCrop-backup-key.txt`.** Contiene la chiave privata
   `AGE-SECRET-KEY-...`, che resta fuori da Replit, Git e chat.
5. Custodire una seconda copia protetta della chiave privata, separata dal
   backup. Senza chiave privata l'archivio non è recuperabile.

Le chiavi generate nei test sono usa-e-getta, eliminate con i fixture, e
NON devono essere riutilizzate per un backup reale.

## Consegna proposta del futuro backup cifrato

1. Concordare cartella finale su dispositivo controllato dal titolare e
   finestra del backup; ottenere autorizzazione esplicita all'esportazione.
2. Il futuro esportatore scriverà solo il file cifrato in
   `generated-artifacts/production-backup/<UTC>/database.dump.age`;
   nessuna collocazione sotto public/static o route HTTP.
3. Attraverso l'area Files del progetto Replit autenticato, scaricare il file
   cifrato e un piccolo `checksum.txt` con SHA-256/dimensione, senza dati clienti.
   Nessun link pubblico, commit, allegato email o upload a nuovi fornitori.
4. Spostare i file nella cartella protetta concordata sul proprio computer.
5. Verificare SHA-256:

   ```powershell
   Get-FileHash .\database.dump.age -Algorithm SHA256
   ```

   Su macOS: `shasum -a 256 database.dump.age`.
   Su Linux: `sha256sum database.dump.age`.
6. Confermare che il checksum coincida. Per la prova di recuperabilità, sul
   computer del titolare con age e pg_restore installati:

   ```sh
   age -d -i NitroCrop-backup-key.txt database.dump.age | pg_restore --list
   ```

   Usare una shell che preservi le pipe binarie (per esempio bash); non usare
   vecchie PowerShell che trasformano l'output binario. Non eseguire il SQL
   dell'archivio né caricarlo in Supabase. L'indice può contenere nomi interni:
   non incollarlo integralmente in chat. Verificare anche gli exit code di
   entrambi i comandi, non soltanto l'ultimo.
7. Conservare archivio e chiave privata separatamente; eventuale seconda copia
   cifrata solo su supporto sotto controllo del titolare.
8. Rimuovere la copia temporanea Replit soltanto dopo conferma della copia
   esterna verificata e autorizzazione del titolare. Non promettere eliminazione
   delle copie interne del fornitore.

Un restore reale e il confronto dati restano fasi successive da autorizzare
nel solo progetto Agri Precision. Queste istruzioni non avviano il punto 4.
