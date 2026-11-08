# Migrazione — punto 2: avvio senza modifiche automatiche al database

## Perimetro autorizzato

Solo codice, script, verifiche offline e riavvio dell'API sulla configurazione
Replit attuale. Nessun DDL/DML di verifica, cambio DATABASE_URL, collegamento
a Supabase, nuovo database, pubblicazione, backup o trasferimento di dati.
I punti 3–10 richiedono una nuova autorizzazione.

## Checkpoint creato prima delle modifiche

Tag Git locale annotato: `checkpoint/migration-point2-before-20261107`.
Commit di partenza: `8f6ef41`.
Il working tree era pulito. Il tag non è stato inviato a un remoto.

Per ispezionarlo senza ripristinare file: `git show <tag>:<percorso>`.
Un eventuale ripristino del codice dovrà evitare di riattivare ed eseguire
accidentalmente i vecchi automatismi. Il checkpoint Git NON è un backup dati.

## Modifiche previste prima dell'intervento

1. Rimuovere initializeSecurity e il suo DDL/bootstrap/backfill.
2. Prima di listen, verificare mediante SELECT protette le cinque tabelle,
   colonne/tipi/nullability/default, PK/FK/UNIQUE/CHECK e mapping amministratore.
3. Schema incompatibile: interrompere l'avvio con errore esplicito, senza
   correzioni automatiche; ROLLBACK e rilascio connessione obbligatori.
4. Togliere il push dal post-merge, conservando l'installazione frozen-lockfile.
5. Ispezionare build/start, script package, lifecycle e configurazioni servizi
   per escludere altri collegamenti automatici a migrazioni/push.
6. Test offline del contratto e delle barriere; TypeScript e build; poi un
   riavvio dell'API con letture protette, health e controlli non autenticati.
   Nessun login o mutazione reale eseguiti per la verifica.

## Limite della pubblicazione gestita Replit

I comandi di build/start del progetto non devono applicare migrazioni.
Separatamente, il Publish Replit può confrontare e sincronizzare gli schemi
development/production dei database gestiti. Questo comportamento di piattaforma
non viene disattivato rimuovendo un comando npm o il post-merge. Nessuna
pubblicazione o modifica delle sue impostazioni è autorizzata in questo punto.

Fonte ufficiale:
https://docs.replit.com/features/data-and-storage/publish-database-changes

## Risultati

**Punto 2 implementato e verificato sul codice del progetto.**

| Verifica | Esito |
|---|---|
| Suite API offline | 127 test superati, nessun database reale contattato dai test |
| TypeScript | `pnpm run typecheck` superato per librerie e tutti gli artifact |
| Compilazione API | `pnpm --filter @workspace/api-server run build` superata |
| Post-merge | Sintassi bash valida; esecuzione offline con pnpm simulato: soltanto install frozen-lockfile |
| Audit percorsi automatici | Nessun push/migrate nei lifecycle package, avvio, build o configurazioni servizi |
| Avvio Replit attuale | Verifica READ ONLY riuscita prima di listen, API in ascolto |
| Health via proxy | GET /api/healthz → 200, `{"status":"ok"}` |
| Protezione rilievi | GET /api/osservazioni senza credenziali → 401 |
| Pagina iniziale | GET / → 200, schermata di accesso visualizzata correttamente |

Il controllo attivo verifica le 60 colonne attese, tipi, nullability, default,
assenza di valori generati incompatibili, visibilità delle tabelle tramite
search_path, chiavi primarie/univoche immediate, FK validate con cancellazione
in cascata e CHECK di ruolo/stato/durata abbonamento. L'ordine fisico delle
colonne non è rilevante. Il mapping amministratore già esistente viene verificato
restituendo soltanto un booleano, senza esporre identificativi o dettagli account.

Ogni SELECT è preceduta dal controllo transaction_read_only=on, nella stessa
transazione REPEATABLE READ READ ONLY. In qualsiasi esito si tenta ROLLBACK e
si rilascia la connessione. Nessuna creazione di account, riassegnazione di
rilievi, aggiornamento observation_id o correzione automatica dei dati.

Clerk, i gestori delle richieste, le operazioni applicative consentite,
PRIVACY_VERSION e l'audit degli eventi non sono stati cambiati.
Le verifiche live non hanno effettuato login, mutazioni applicative o richieste
di invito. Non costituiscono un nuovo collaudo completo dei flussi autenticati.

I comandi `push`, `push-force`, `push-deployment` restano disponibili nel package
database come strumenti **manuali**: nessun percorso automatico del progetto
li invoca. Non sono stati eseguiti.

### File modificati o aggiunti

- `artifacts/api-server/src/index.ts`: verifica prima dell'ascolto.
- `artifacts/api-server/src/lib/security-db.ts`: rimosso DDL/bootstrap,
  mantenuto audit; delega al verificatore e rilascio della connessione.
- `artifacts/api-server/src/lib/schema-contract.ts`: contratto e validazione pura.
- `artifacts/api-server/src/lib/schema-check.ts`: sole letture protette.
- `artifacts/api-server/src/lib/schema-check.test.ts`: regressioni del contratto,
  transazione, errori e divieto di riparazione.
- `artifacts/api-server/src/lib/startup-safety.test.ts`: collegamenti automatici
  e prova offline dello script post-merge.
- `artifacts/api-server/package.json`: nuovi test nella suite esistente.
- `scripts/post-merge.sh`: rimosso push-deployment.
- `lib/db/migration-preparation/README.md`: stato della preparazione aggiornato.
- Questo rapporto; aggiornamento delle istruzioni di continuità in memoria.

**Limite confermato:** assenza di automatismi nei percorsi del repository non
significa disattivazione della sincronizzazione schema interna a Replit Publish.
Nessuna pubblicazione eseguita; le modifiche verificate riguardano il workspace,
non una nuova versione del sito già pubblicato.

**Punto 3 non avviato. Nessun collegamento Supabase in questa fase.**

Programma successivo preparato, senza esecuzione o autorizzazione implicita:
[punto 3 — backup verificabile](migrazione-punto-3.md).
