# Preparazione operativa rapida — INATTIVA

**Script target/cutover ancora inattivi.** Il successivo backup reale è stato
autorizzato, eseguito e verificato: vedere ../backup/REAL_BACKUP_REPORT.md.
Nessuna scrittura Supabase, importazione o modifica DATABASE_URL effettuata.
Solo Replit e il Supabase Agri Precision esistente, nessun PC da configurare e
nessun altro database.

## Quanto è pronto

| Fase | Programma | Autorizzazione richiesta prima dell'esecuzione |
|---|---|---|
| Identità primario | `../backup/verify-source.mjs` | Diagnosi readonly tramite Secret temporaneo |
| Backup completo | `../backup/backup-production.mjs` | Esportazione reale + origine + destinatario cifratura |
| Decifratura e lettura integrale backup | `../backup/verify-encrypted.sh` | Verifica del backup già autorizzato, nessuna connessione DB |
| Ruoli, schema e RLS | `apply-target.ts` | Scritture sul solo Agri Precision |
| Import da backup cifrato | `import.ts` | Import reale + blocco effettivo delle scritture sorgenti |
| Confronto dati | `compare.ts`, `integrity.sql` | Lettura/confronto dati reali con sorgente congelata |
| Connessione app/riapertura | `CUTOVER.md` | DATABASE_URL, eventuale pubblicazione e riapertura distinte |

I flag CLI non sono un'approvazione: l'operatore li usa soltanto dopo conferma
del titolare nella conversazione. Niente esecuzione automatica all'import.

I file TypeScript vengono eseguiti tramite tsx già disponibile, senza creare
bundle che cambino la risoluzione dei percorsi di CA/SQL:

```text
pnpm --filter @workspace/scripts exec tsx ../lib/db/migration-preparation/operational/NOME.ts FLAG_AUTORIZZATI
```

Non eseguire questi comandi come test sul database reale.

## Garanzie implementate e limiti

- Sorgente: nome, progetto, ramo, primario e TLS del client verificati tramite
  Secret temporaneo. Figlio diagnostico con ambiente limitato a due chiavi,
  senza DATABASE_URL, PG*, Clerk, import dell'applicazione o funzione di backup.
- Backup: custom completo, age in streaming, parser completo senza SQL eseguito,
  hash del cifrato e file 0600 in directory 0700 ignorata da Git/pubblicazione.
  Solo pg_dump riceve PGPASSWORD in memoria; age/parser non lo ereditano.
- Target: stessa CA ufficiale e guardia già collaudata dell'inventario; host,
  porta, project reference e identità amministrativa vincolati.
- Unica transazione per tre ruoli NOLOGIN + baseline verificata da checksum +
  ownership app_migrator + RLS ENABLE/FORCE + policy dei soli ruoli backend.
  ACL API verificate su TUTTE le cinque tabelle, non solo osservazioni.
- Nessuna revoca globale ai ruoli tecnici Supabase. La vecchia bozza roles.sql
  NON viene eseguita. Prima dell'attivazione LOGIN va comunque verificata la
  possibilità di scrivere tramite PUBLIC TEMP/funzioni: un default readonly
  non è un divieto permanente. Nessun esito di isolamento completo ancora.
- INSERT audit e UPDATE dei soli actor_id/target_id, non modifica action/id
  né cancellazione del registro da parte di runtime.
- Import: verifica SHA-256 prima di collegarsi; solo le cinque sezioni COPY,
  ogni colonna nominata, niente SQL del dump eseguito, owner import nel target
  vuoto/bloccato, NO FORCE temporaneo transazionale, FORCE ripristinato prima
  di COMMIT. Un errore di decifratura, parser o conteggio impedisce il COMMIT.
- Confronto: tutte le 60 colonne e ID originali, pagine da 1000, PK con collazione
  C, timestamp UTC, JSONB convertito a testo sul server per non perdere precisione
  numerica/microsecondi in JavaScript. Solo conteggi e digest nei report.
- Nessuna riassegnazione utenti, nuova istanza Clerk o ricalcolo NDVI/dose.
- Nessuna modifica a DATABASE_URL o pubblicazione effettuata.

## Verifica svolta senza ripetere i collaudi precedenti

20 nuovi test puri superati: colonne, parser COPY, ordine/FK, troncamento,
SQL estraneo, conteggi, fingerprint, readonly, ACL/RLS dichiarate, baseline
immutata e presenza dei gate. TypeScript dei nuovi programmi superato.
Nessun database creato e nessuna query effettuata per questi test.
Non rieseguire i vecchi runner che creano cluster locali: il titolare lo esclude.

Gli SQL nuovi non sono stati applicati né provati su un altro PostgreSQL.
I test statici non certificano che il provider autorizzi ogni futuro GRANT;
qualsiasi errore del target interrompe e annulla la transazione.

## Blocchi effettivi

1. Origine Production confermata dal titolare; backup reale cifrato, decifrato
   e integralmente analizzato. Rapporto: ../backup/REAL_BACKUP_REPORT.md.
2. Rimane da confermare la custodia fuori Replit di archivio, checksum e chiave.
   La chiave privata è temporaneamente presente su Replit, come autorizzato,
   con file 0600 e directory 0700 esclusi da Git/pubblicazione.
   Nessun link pubblico, nessuna installazione sul PC, nessuna rimozione
   senza autorizzazione. Non è cifratura con chiave mai presente su Replit.
3. Le fasi target/cutover sono pronte come script/procedura, ma richiedono le
   rispettive autorizzazioni. LOGIN/credenziali e isolamento effettivo dei ruoli
   si verificano prima di esporli all'app e allo sviluppo ordinario.
