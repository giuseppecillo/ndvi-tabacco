# Collaudo SQL e permessi con soli dati sintetici

Data: 6 novembre 2026. Stato: **PASS locale, preparazione ancora INATTIVA**.
Questo esito NON autorizza né certifica l'attivazione su Supabase.

## Destinazione e isolamento

- PostgreSQL **16.10**, binari già disponibili: nessuna installazione.
- Nuovo cluster temporaneo in una directory privata `/tmp/nitrocrop-synthetic.*`.
  Server senza ascolto TCP, socket Unix con permessi 0700.
- Ambiente del test ripulito con `env -i`; nessuna lettura delle credenziali
  esistenti, nessun `DATABASE_URL`, nessuna connessione ai database dell'app.
- Autenticazione locale trust limitata al socket nella directory privata:
  nessuna password utilizzata o creata. I tre ruoli diventano LOGIN solo nella
  fixture usa e getta. `roles.sql` resta NOLOGIN nella bozza distribuita.
- Un amministratore locale sintetico prepara soltanto questa fixture. Le
  verifiche dei tre ruoli usano sessioni distinte, non impersonificazione di una
  sessione superuser; un test separato verifica anche il rifiuto di SET ROLE.
- Ruoli, dati, server e file temporanei rimossi al termine, anche in caso di
  errore. Nessun progetto Supabase, risorsa remota o account Clerk creato.
- Nessun workflow riavviato: l'avvio API esistente può eseguire DDL/bootstrap e
  non è autorizzato in questa fase.

## Risultati riproducibili

Comando dalla radice:

```sh
bash lib/db/migration-preparation/tests/run-isolated.sh
```

**21 gruppi di verifiche PostgreSQL superati**, senza test saltati:

| Area | Risultato |
|---|---|
| Baseline vuota | SQL eseguito; 5 tabelle, 60 colonne, 12 vincoli, 8 indici |
| Riesecuzione baseline | Rifiuta un target applicativo non vuoto, transazione annullata |
| Ruoli | Bozza eseguita; mappatura esplicita dei proprietari al migrator nella sola fixture |
| Ispezione effettiva | Identità sessione/corrente, flags ruolo, ownership, CREATE, TEMP, membership, grants tabella/colonna, sequenze e funzioni letti dai cataloghi |
| app_readonly | SELECT consentita; INSERT/UPDATE/DELETE/TRUNCATE negati anche dopo SET default_transaction_read_only=off |
| DDL ordinario | CREATE/ALTER/DROP, CREATE SCHEMA e CREATE TEMP negati sia a readonly sia a runtime |
| Escalation | SET ROLE migrator/amministratore, CREATE ROLE, SUPERUSER, GRANT ruolo e cambio owner negati |
| app_runtime | CRUD applicativo e inserimento audit consentiti; modifica security_state e riscrittura/cancellazione audit negate |
| app_migrator | Possiede le sole tabelle applicative della fixture e può eseguire DDL strutturale autorizzato |
| Funzione mutante | Nuova SECURITY DEFINER non eseguibile dai ruoli ordinari; grant deliberatamente insicuro rilevato dall'ispezione e rifiutato dal controllo |
| Prova del rischio | Nella fixture, quel grant permette effettivamente alla funzione di modificare il dato sintetico; poi viene revocato e la funzione eliminata |
| Large objects | lo_create/lo_from_bytea negati anche con read-only disattivato; reintroduzione del grant PUBLIC rilevata |
| Grants indiretti | Scrittura tramite grant di colonna/PUBLIC e uso sequenza tramite PUBLIC rilevati |
| Membership | Catena transitiva tramite ruolo NOINHERIT rilevata e rifiutata |
| Altri rischi | CREATE su database/schema, ownership e identità SET ROLE incoerenti rilevati |
| Vincoli | CHECK di ruolo/status/durata, unicità email/Clerk/owner-display, FK e cascata verificati con dati sintetici |
| Import osservazioni | Sorgente sintetica con ordine invertito: import posizionale fallisce per incompatibilità di tipo; COPY con colonne esplicite conserva tutte le 33 colonne, NULL inclusi |
| Import account | COPY con colonne esplicite conserva tutte le 13 colonne account nonostante ordine sorgente invertito |
| Avvio preparato | SELECT verifica mapping amministratore sintetico esistente; mapping assente fallisce senza bootstrap |
| Chiusura | Grants rimessi nello stato previsto prima delle verifiche finali; cluster eliminato |

I test di importazione confrontano l'intera riga per nome mediante
`to_jsonb(a)=to_jsonb(b)`, non solo conteggi o colonne selezionate.
I nomi/email/identificativi/coordinate della fixture sono inventati
(`example.invalid`); nessuna esportazione o lettura di rilievi reali.

Ulteriori controlli: **36/36 test offline** di configurazione, ispezione incompleta,
manifest/checksum e regressione dei percorsi attivi. Typecheck librerie, API,
frontend e fixture sintetica **superati**, così come `git diff --check`.
Per il typecheck della fixture:

```sh
pnpm --filter @workspace/db exec tsc --noEmit --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler --types node migration-preparation/tests/synthetic.test.ts
```

I test non sono
aggiunti ad avvio, build, post-merge o pubblicazione.

## Problemi individuati e correzioni, soltanto nella preparazione

1. **TEMP ereditato da PUBLIC.** Il solo default read-only è modificabile nella
   sessione e non costituisce un divieto di DDL. La bozza revoca CREATE/TEMP sul
   database da PUBLIC e l'ispezione misura anche TEMP effettivo.
2. **Funzioni large object.** I grants sulle sole tabelle non impediscono tutte
   le scritture: alcune routine pg_catalog possono creare/modificare large
   objects. La bozza revoca EXECUTE da PUBLIC per le routine large object
   elencate; l'ispezione controlla anche quel percorso.
3. **Ordine di valutazione SQL.** Un filtro relkind combinato con AND non
   garantisce che has_sequence_privilege venga invocata soltanto su sequenze.
   La prima esecuzione ha segnalato “not a sequence”; il CASE ora protegge la
   chiamata. Il collaudo finale include tabelle, indici e sequenze.
4. **Typecheck del mock.** Corretto il tipo delle righe simulate senza alterare
   la query né il comportamento applicativo.

Le revoche PUBLIC su schema/database/funzioni incidono su **tutti i consumatori
del target**, non soltanto sull'app. Non applicarle senza inventario, autorizzazione
e verifica della compatibilità Supabase; il suo amministratore può non avere i
privilegi del superuser del cluster locale. Non saltare errori di revoca.

## Limiti e autorizzazioni ancora necessarie

- Nessun Supabase reale collaudato. Non sono certificati ruoli tecnici, ACL
  preesistenti, Data API, RLS, estensioni, TLS, pooler/Supavisor, rete o permessi
  dell'amministratore del progetto. La versione locale non sostituisce il test
  della versione/configurazione target.
- L'ispezione è deliberatamente conservativa: rifiuta qualsiasi membership in
  altri ruoli e qualsiasi funzione/procedura eseguibile in schemi non di sistema,
  senza presumere innocue quelle STABLE/IMMUTABLE. Per pg_catalog controlla una
  lista esplicita di mutatori large object, non certifica ogni routine built-in,
  estensione o possibile effetto esterno (notifiche, lock, WAL, servizi remoti).
  Non è un sandbox SQL universale contro un amministratore ostile.
- Non verifica l'esatta matrice dei grants runtime consentiti, la compatibilità
  completa dello schema o l'isolamento cliente-per-cliente del backend. Sono
  controlli distinti da questi divieti strutturali. Runtime resta autorizzato a
  leggere/scrivere dati applicativi; non esporne mai la connessione nel browser.
- L'ownership è trasferita esplicitamente nella fixture dal solo amministratore
  sintetico. `roles.sql` NON trasferisce automaticamente gli owner di un restore.
  Non applicare baseline e restore completo allo stesso target.
- La bozza 0002 di riparazione non è eseguita: non si deduce alcuna necessità di
  riparare record reali dai test sintetici.
- Nessun backup/restore di dati reali, confronto record sorgente-destinazione,
  invito email, test dell'app, cambio connessione o attivazione.
- I pool live non importano ancora `privileges.ts`/`connection.ts`/`startup.ts`.
  Non dichiarare già protetti i database correnti.

**Decisione:** collaudo locale superato. Prima di creare risorse Supabase, usare
credenziali o intervenire su database/configurazioni esistenti serve una nuova
autorizzazione esplicita. L'applicazione, Clerk e la pubblicazione restano
invariati.
